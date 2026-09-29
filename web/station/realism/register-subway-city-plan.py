"""Register the city access study to retained exterior geometry without moving assets.

Requires numpy, shapely and Poppler's pdfimages. All generated media stay in .local.
Manual source observations live in research/kyoto-station/notes/subway-control-2026.json.
"""
import argparse
import base64
import hashlib
import html
import json
import subprocess
from pathlib import Path

import numpy as np
from shapely.geometry import MultiPoint, Polygon

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('manifest', type=Path)
parser.add_argument('osm_report', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
assert Path('.local').resolve() in args.output.resolve().parents
args.output.mkdir(parents=True, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
controls_path = Path('research/kyoto-station/notes/subway-control-2026.json')
spec = read(controls_path)
manifest = read(args.manifest)
raw = Path(manifest['layout']).read_bytes()
assert sha(raw) == manifest['layoutSha256']
assert sha(Path(spec['sourcePdf']).read_bytes()) == spec['sourceSha256']
layout = json.loads(raw)
osm = read(args.osm_report)
assert osm['layoutSha256'] == manifest['layoutSha256']
panels = {p['id']: p for p in layout['panels']}


def section(panel):
    """Actual triangle intersections, avoiding roof outlines as ground anchors."""
    cuts = []
    for i in range(0, len(panel['triangles']), 3):
        t = [panel['vertices'][k] for k in panel['triangles'][i:i + 3]]
        for a, b in zip(t, t[1:] + t[:1]):
            if (a['y'] < spec['sectionY']) != (b['y'] < spec['sectionY']):
                u = (spec['sectionY'] - a['y']) / (b['y'] - a['y'])
                cuts.append([a[k] + u * (b[k] - a[k]) for k in ('x', 'z')])
    return MultiPoint(cuts).convex_hull


native = np.array(spec['nativeCorners'])
control_outline = section(panels[spec['controlPanel']]).simplify(.25)
for corner in native:
    assert min(np.linalg.norm(corner - q) for q in control_outline.exterior.coords) < .002
for h in spec['holdouts']:
    outline = section(panels[h['panel']]).simplify(.2)
    assert min(np.linalg.norm(np.array(h['native']) - q) for q in outline.exterior.coords) < .002


def apply(matrix, points):
    p = np.atleast_2d(points)
    return np.c_[p, np.ones(len(p))].dot(matrix.T)[:, :2]


def fit(source, target, reflect=False):
    """Uniform scale and rotation only; reflect north for raster pixel coordinates."""
    rows, values = [], []
    for (x, y), (u, v) in zip(source, target):
        rows.extend([[x, y, 1, 0], [-y, x, 0, 1] if reflect else [y, -x, 0, 1]])
        values.extend([u, v])
    a, b, tx, ty = np.linalg.lstsq(rows, values, rcond=None)[0]
    matrix = np.array([[a, b, tx], [b, -a, ty] if reflect else [-b, a, ty], [0, 0, 1]])
    residual = np.linalg.norm(apply(matrix, source) - target, axis=1)
    assert np.max(residual) < 1.1, residual
    assert np.max(np.abs(apply(np.linalg.inv(matrix), apply(matrix, source)) - source)) < 1e-9
    return matrix, {'matrix': matrix.tolist(), 'scale': float(np.hypot(a, b)),
                    'residualPixels': residual.tolist(), 'rmsPixels': float(np.sqrt(np.mean(residual**2)))}


transforms, fits = {}, {}
for name in ('ground', 'plaza'):
    transforms[name], fits[name] = fit(native, spec[name]['pixelCorners'], reflect=True)
matches = spec['underground']['matches']
ground_to_under, fits['groundToUnderground'] = fit([p['ground'] for p in matches], [p['underground'] for p in matches])
transforms['underground'] = ground_to_under @ transforms['ground']
fits['underground'] = {'matrix': transforms['underground'].tolist(), 'method': 'ground fit followed by same-base raster registration'}

# Extract only the needed PDF pages. Pixel bytes, not PNG encoder metadata, are
# established by the PDF hash and recorded image dimensions/placement observations.
for page in (9, 12):
    subprocess.run(['pdfimages', '-f', str(page), '-l', str(page), '-png', spec['sourcePdf'], str(args.output / f'page-{page}')], check=True)
images = {}
for name in ('ground', 'plaza', 'underground'):
    q = spec[name]
    p = args.output / f"page-{q['pdfPage']}-{q['imageNumber']:03}.png"
    b = p.read_bytes()
    assert b[:8] == b'\x89PNG\r\n\x1a\n'
    size = [int.from_bytes(b[16:20], 'big'), int.from_bytes(b[20:24], 'big')]
    assert size == q['size'], (name, size)
    images[name] = {'path': str(p), 'sha256': sha(b), 'size': size}
south = args.output / 'page-12-001.png'
south_bytes = south.read_bytes()
south_size = [int.from_bytes(south_bytes[16:20], 'big'), int.from_bytes(south_bytes[20:24], 'big')]
assert south_size == spec['underground']['size']
assert spec['underground']['southImageOffset'] == [0, spec['underground']['size'][1]]
images['undergroundSouth'] = {'path': str(south), 'sha256': sha(south_bytes), 'size': south_size}

holdouts = []
for h in spec['holdouts']:
    for name in ('ground', 'plaza'):
        inferred = apply(np.linalg.inv(transforms[name]), [h[name]])[0]
        error = float(np.linalg.norm(inferred - h['native']))
        assert error < 5, (h['id'], name, error)
        holdouts.append({'id': h['id'], 'image': name, 'observedNative': inferred.tolist(),
                         'retainedNative': h['native'], 'differenceM': error})
features = []
for f in spec['features']:
    points = apply(np.linalg.inv(transforms[f['image']]), f['pixels'])
    if f['kind'] == 'polygon':
        polygon = Polygon(points)
        assert polygon.is_valid and polygon.area > 0, f['id']
        center = list(polygon.centroid.coords)[0]
    else:
        center = points[0]
    output = {**f, 'nativeXZ': points.tolist(), 'centerXZ': list(center)}
    if 'osmNode' in f:
        e = next(e for e in osm['entrances'] if e['node'] == f['osmNode'])
        observed = [e['position'][k] for k in ('x', 'z')]
        output['osmDifferenceM'] = float(np.linalg.norm(np.array(center) - observed))
        output['osmXZ'] = observed
        assert output['osmDifferenceM'] < 6, output
    features.append(output)

# Read the actual retained treads rather than copying coordinates from old notes.
comparison = []
for feature_id, prefix in [('north-stair-outline', 'subway-escalators-subway-north-step-'),
                           ('central-one-stair-outline', 'subway-escalators-subway-platforms-central-step-'),
                           ('exit-five-street-stair', 'subway-passage-north-step-')]:
    selected = [p for p in layout['panels'] if p['id'].startswith(prefix)]
    assert selected, prefix
    v = np.array([[v[k] for k in ('x', 'z')] for p in selected for v in p['vertices']])
    center = (v.min(axis=0) + v.max(axis=0)) / 2
    target = next(f for f in features if f['id'] == feature_id)['centerXZ']
    comparison.append({'feature': feature_id, 'retainedCenterXZ': center.tolist(), 'referenceCenterXZ': target,
                       'deltaXZ': (np.array(target) - center).tolist(), 'retainedPanels': [p['id'] for p in selected]})
lift = next(l for l in layout['lifts'] if l['id'] == 'subway-exit-five-lift')
center = np.array([lift['origin'][k] for k in ('x', 'z')])
target = next(f for f in features if f['id'] == 'exit-five-lift-zone')['centerXZ']
comparison.append({'feature': 'exit-five-lift-zone', 'retainedCenterXZ': center.tolist(), 'referenceCenterXZ': target,
                   'deltaXZ': (np.array(target) - center).tolist(), 'retainedLift': lift['id']})

# This inventory is an affected-area review list, not permission to delete every
# record with a matching prefix. The floor/ceiling joins need geometric clipping.
prefixes = ['subway-', 'kotochika-', 'central-one-east-', 'exit-five-', 'hachijo-crossing-',
            'porta-east-', 'porta-plaza-', 'east-transfer-relocated-porta-connection-']
inventory = {}
for prefix in prefixes:
    ps = [p for p in layout['panels'] if p['id'].startswith(prefix)]
    if not ps:
        continue
    vertices = np.array([[v[k] for k in ('x', 'y', 'z')] for p in ps for v in p['vertices']])
    inventory[prefix] = {'count': len(ps), 'ids': [p['id'] for p in ps],
                         'minXYZ': vertices.min(axis=0).tolist(), 'maxXYZ': vertices.max(axis=0).tolist()}

report = {'layoutSha256': manifest['layoutSha256'], 'sourcePdfSha256': spec['sourceSha256'],
          'controlsSha256': sha(controls_path.read_bytes()), 'scriptSha256': sha(Path(__file__).read_bytes()),
          'osmReportSha256': sha(args.osm_report.read_bytes()), 'fits': fits, 'images': images,
          'holdouts': holdouts, 'features': features, 'comparisons': comparison, 'affectedPanels': inventory,
          'affectedMotion': {kind: [p['id'] for p in layout[kind] if p['id'].startswith('subway-')] for kind in ('lifts', 'escalators')},
          'limits': spec['limits']}
(args.output / 'city-registration.json').write_text(json.dumps(report, indent=2) + '\n')


def image_tag(record, y=0):
    data = base64.b64encode(Path(record['path']).read_bytes()).decode()
    w, h = record['size']
    return f'<image x="0" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{data}"/>'


def line(points, color, closed=False, width=2):
    q = ' '.join(f'{x:.3f},{y:.3f}' for x, y in points)
    tag = 'polygon' if closed else 'polyline'
    return f'<{tag} points="{q}" stroke="{color}" stroke-width="{width}" fill="none"/>'


def label(x, y, value, color='#23333b'):
    return f'<text x="{x:.2f}" y="{y:.2f}" fill="{color}" font-family="sans-serif" font-size="10" stroke="white" stroke-width="2.6" paint-order="stroke">{html.escape(value)}</text>'


# The private overlay shows observations in the exact source pixels. It is an
# inspection aid, not a replacement game texture or a before/after deliverable.
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1030" height="1020" viewBox="0 0 1030 1020">',
       '<rect width="100%" height="100%" fill="white"/>',
       label(15, 18, 'Kyoto City access study registered to retained exterior | north up | approximate plan control'),
       '<g transform="translate(15,35)">', image_tag(images['underground']), image_tag(images['undergroundSouth'], 484)]
for i, f in enumerate(features):
    p = apply(transforms['underground'], f['nativeXZ'])
    color = '#c17a00' if f['kind'] == 'point' else '#007d81'
    svg.append(line(p, color, f['kind'] == 'polygon'))
    c = apply(transforms['underground'], [f['centerXZ']])[0]
    svg.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="4" fill="{color}"/>')
    svg.append(label(c[0] + 6, c[1] - 4, str(i + 1), color))
    svg.append(label(725, 30 + i * 30, f"{i + 1}. {f['id']}"))
    svg.append(label(725, 42 + i * 30, f"X {f['centerXZ'][0]:.1f}, Z {f['centerXZ'][1]:.1f} m"))
for h in spec['holdouts']:
    point = apply(transforms['underground'], [h['native']])[0]
    svg.append(f'<circle cx="{point[0]}" cy="{point[1]}" r="3" fill="#347b37"/>')
svg.append(line(apply(transforms['underground'], native), '#347b37', True))
for x in range(-140, 201, 40):
    svg.append(line(apply(transforms['underground'], [[x, -250], [x, 240]]), '#9cabb850', width=.5))
    p = apply(transforms['underground'], [[x, -250]])[0]
    svg.append(label(p[0], p[1], f'X{x}'))
for z in range(-240, 241, 40):
    p = apply(transforms['underground'], [[-150, z], [200, z]])
    svg.append(line(p, '#9cabb850', width=.5))
    svg.append(label(p[0][0], p[0][1], f'Z{z}'))
svg.extend([label(725, 320, 'Green: exterior control and holdouts.'), label(725, 338, 'Teal: interpreted access outlines.'),
            label(725, 356, 'Amber: lift annotation zone.'), label(725, 385, 'At least 5 m plan-position uncertainty.'),
            label(725, 403, 'No underground elevation inferred.'), '</g></svg>'])
(args.output / 'registered-plan.svg').write_text('\n'.join(svg))

svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1420" height="580">', '<rect width="100%" height="100%" fill="white"/>']
for index, name in enumerate(('ground', 'plaza')):
    scale = .5 if name == 'plaza' else 1
    svg.extend([f'<g transform="translate({index * 710},30) scale({scale})">', image_tag(images[name]),
                line(apply(transforms[name], native), '#167731', True)])
    for h in spec['holdouts']:
        q = apply(transforms[name], [h['native']])[0]
        svg.append(line([q, h[name]], '#d43a28', width=4))
        svg.append(f'<circle cx="{q[0]}" cy="{q[1]}" r="3" fill="#167731"/>')
    for f in features:
        if f['image'] == name:
            svg.append(line(f['pixels'], '#007d81', f['kind'] == 'polygon'))
    svg.append('</g>')
    svg.append(label(index * 710 + 15, 18, f'{name}: green control; red independent building discrepancies'))
svg.append(label(15, 530, 'Controls are measured from the retained municipal mesh; manually observed source corners are fitted without shear.'))
svg.append(label(15, 552, 'The small fit residual is not survey accuracy. Holdouts expose differences between source plans.'))
svg.append('</svg>')
(args.output / 'control-checks.svg').write_text('\n'.join(svg))
print(json.dumps({'fits': {k: v.get('rmsPixels') for k, v in fits.items()}, 'holdoutMaxM': max(h['differenceM'] for h in holdouts),
                  'features': [{'id': f['id'], 'centerXZ': f['centerXZ']} for f in features],
                  'affectedPanelCount': sum(v['count'] for v in inventory.values())}, indent=2))
