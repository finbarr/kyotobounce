"""Draw the retained forecourt and a horizontal building section in native metres."""
import hashlib
import html
import json
import sys
from pathlib import Path

from shapely.geometry import Polygon, box
from shapely.ops import unary_union

manifest_path, registration_path, out = map(Path, sys.argv[1:])
assert Path('.local').resolve() in out.resolve().parents
manifest = json.loads(manifest_path.read_text())
raw = Path(manifest['layout']).read_bytes()
sha = lambda b: hashlib.sha256(b).hexdigest()
assert sha(raw) == manifest['layoutSha256']
layout = json.loads(raw)
registration = json.loads(registration_path.read_text())
assert registration['layoutSha256'] == manifest['layoutSha256']
region = box(-150, 0, 220, 180)
scale = 4
xy = lambda x, z: ((x + 150) * scale + 30, (180 - z) * scale + 70)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1540" height="850">',
       '<rect width="100%" height="100%" fill="#fff"/>',
       '<style>text{font:14px sans-serif;fill:#222}</style>',
       '<text x="30" y="25">Retained municipal forecourt · native metres · north ↑</text>',
       '<text x="30" y="47">Blue/grey: overlapping source paving groups. Black: municipal section at Y1 m. Green: mapped entrances.</text>']

def polygon_path(poly):
    rings = [poly.exterior, *poly.interiors]
    return ' '.join('M' + 'L'.join(f'{px:.3f},{py:.3f}' for px, py in (xy(*q) for q in ring.coords)) + 'Z' for ring in rings)

section_segments = []
ground = {'plaza': [], 'road': []}
for panel in layout['panels']:
    if not panel['id'].startswith('municipal-'):
        continue
    vertices = panel['vertices']
    bounds = {a: (min(v[a] for v in vertices), max(v[a] for v in vertices)) for a in ('x', 'y', 'z')}
    if bounds['x'][1] < -150 or bounds['x'][0] > 220 or bounds['z'][1] < 0 or bounds['z'][0] > 180:
        continue
    kind = next((k for k in ground if panel['id'].startswith('municipal-' + k + '-') and bounds['y'][1] < .7), None)
    is_section = bounds['y'][0] < 1 < bounds['y'][1]
    if not kind and not is_section:
        continue
    for i in range(0, len(panel['triangles']), 3):
        tri = [vertices[k] for k in panel['triangles'][i:i+3]]
        if kind:
            p = Polygon([(v['x'], v['z']) for v in tri])
            if p.area > 1e-7:
                ground[kind].append(p)
        if is_section:
            cuts = []
            for a, b in zip(tri, tri[1:] + tri[:1]):
                if (a['y'] < 1) != (b['y'] < 1):
                    t = (1 - a['y']) / (b['y'] - a['y'])
                    cuts.append((a['x'] + t * (b['x'] - a['x']), a['z'] + t * (b['z'] - a['z'])))
            if len(cuts) == 2:
                section_segments.append(cuts)

for kind, fill in [('road', '#e4e5e5'), ('plaza', '#dcebf4')]:
    polygons = unary_union(ground[kind]).intersection(region)
    for p in [polygons] if polygons.geom_type == 'Polygon' else polygons.geoms:
        if p.geom_type == 'Polygon':
            svg.append(f'<path d="{polygon_path(p)}" fill="{fill}" stroke="#b2b8bc" stroke-width=".8" fill-rule="evenodd"/>')
svg.append('<defs><clipPath id="frame"><rect x="30" y="70" width="1480" height="720"/></clipPath></defs><g clip-path="url(#frame)">')
for (x, z), (u, v) in section_segments:
    a, b = xy(x, z), xy(u, v)
    svg.append(f'<path d="M{a[0]:.2f},{a[1]:.2f}L{b[0]:.2f},{b[1]:.2f}" fill="none" stroke="#333" stroke-width="1"/>')
for t in registration['mappedTracks']:
    svg.append('<path d="M' + 'L'.join(f'{x:.2f},{y:.2f}' for x,y in (xy(p['x'],p['z']) for p in t['points'])) + '" fill="none" stroke="#96b28a" stroke-width="1.5" stroke-dasharray="5 4"/>')
svg.append('</g>')
for x in range(-140, 221, 20):
    a, b = xy(x, 0), xy(x, 180)
    svg.append(f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#bbb" stroke-width=".4"/><text x="{a[0]-12}" y="815">{x}</text>')
for z in range(0, 181, 20):
    a, b = xy(-150, z), xy(220, z)
    svg.append(f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#bbb" stroke-width=".4"/><text x="1" y="{a[1]+5}">{z}</text>')
for e in registration['entrances']:
    x, y = xy(e['position']['x'], e['position']['z'])
    label = 'Exit ' + e['tags']['ref'] if 'ref' in e['tags'] else 'Unnumbered'
    svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#08782c"/><text x="{x+8}" y="{y-8}">{html.escape(label)}</text>')
svg.append('</svg>')
out.mkdir(parents=True, exist_ok=True)
(out/'forecourt.svg').write_text('\n'.join(svg))
(out/'forecourt.json').write_text(json.dumps({'layoutSha256':manifest['layoutSha256'], 'registrationSha256':sha(registration_path.read_bytes()), 'scriptSha256':sha(Path(__file__).read_bytes()), 'sectionY':1, 'sectionSegments':len(section_segments), 'limits':['Municipal exterior context and mapped entrances do not establish underground heights or a surveyed indoor plan.', 'Paving source groups overlap; their colours do not classify actual pedestrian or road boundaries.']}, indent=2)+'\n')
print('Forecourt section:', len(section_segments), 'segments')
