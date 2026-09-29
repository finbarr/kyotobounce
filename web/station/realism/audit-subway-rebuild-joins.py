"""Inventory retained objects intersecting the replacement; do not retire by prefix."""
import hashlib
import json
import math
import sys
from collections import Counter
from pathlib import Path

from shapely.geometry import LineString, MultiPoint, Polygon, box, shape
from shapely.ops import unary_union

manifest_path, spec_path, out = map(Path, sys.argv[1:])
assert Path('.local').resolve() in out.resolve().parents
sha = lambda raw: hashlib.sha256(raw).hexdigest()
m = json.loads(manifest_path.read_text())
raw = Path(m['layout']).read_bytes()
assert sha(raw) == m['layoutSha256']
layout = json.loads(raw)
spec_raw = spec_path.read_bytes()
s = json.loads(spec_raw)
assert s['parentLayoutSha256'] == m['layoutSha256']
domain = shape(s['domain'])
limits = domain.bounds
bottom, top = s['lower'] - .5, s['ceiling'] + .25
rows = []


def inspect(kind, item, footprint, y0, y1, method):
    if y1 < bottom or y0 > top or not domain.intersects(footprint):
        return
    overlap = domain.intersection(footprint)
    rows.append({'kind': kind, 'id': item['id'], 'role': item.get('role'),
                 'collision': item.get('collision', True), 'height': [y0, y1],
                 'boundsXZ': list(footprint.bounds), 'method': method,
                 'overlapAreaM2': overlap.area,
                 'fullyWithinNewDomain': domain.covers(footprint),
                 'footprint': footprint.__geo_interface__})


for p in layout['panels']:
    vs = p['vertices']
    y0, y1 = min(v['y'] for v in vs), max(v['y'] for v in vs)
    if y1 < bottom or y0 > top:
        continue
    bounds = box(min(v['x'] for v in vs), min(v['z'] for v in vs),
                 max(v['x'] for v in vs), max(v['z'] for v in vs))
    if not domain.intersects(bounds):
        continue
    # Project individual triangles so holes and disjoint batches stay visible.
    triangles = []
    for i in range(0, len(p['triangles']), 3):
        tri = Polygon([(vs[k]['x'], vs[k]['z']) for k in p['triangles'][i:i + 3]])
        if tri.area > 1e-10:
            triangles.append(tri)
    footprint = unary_union(triangles) if triangles else MultiPoint([(v['x'], v['z']) for v in vs]).convex_hull
    inspect('panels', p, footprint, y0, y1, 'triangle projection')

for p in layout['boxes']:
    c, size = p['center'], p['size']
    a = math.radians(p.get('yaw', 0))
    footprint = Polygon([(c['x'] + x * math.cos(a) + z * math.sin(a),
                          c['z'] - x * math.sin(a) + z * math.cos(a))
                         for x, z in [(-size['x'] / 2, -size['z'] / 2),
                                      (size['x'] / 2, -size['z'] / 2),
                                      (size['x'] / 2, size['z'] / 2),
                                      (-size['x'] / 2, size['z'] / 2)]])
    inspect('boxes', p, footprint, c['y'] - size['y'] / 2, c['y'] + size['y'] / 2, 'oriented box')

for p in layout['beams']:
    a, b, r = p['a'], p['b'], p['radius']
    footprint = LineString([(a['x'], a['z']), (b['x'], b['z'])]).buffer(r * math.sqrt(2))
    inspect('beams', p, footprint, min(a['y'], b['y']) - r * math.sqrt(2),
            max(a['y'], b['y']) + r * math.sqrt(2), 'conservative beam envelope')

for p in layout['flights']:
    points = [v for c in p['contours'] for v in c['points']]
    footprint = MultiPoint([(v['x'], v['y']) for v in points]).convex_hull
    y0 = p['baseElevation'] - p.get('foundationDepth', 0)
    y1 = p['baseElevation'] + p['rise'] * len(p['contours'])
    inspect('flights', p, footprint, y0, y1, 'conservative stair envelope')

motion = []
for key in ('lifts', 'escalators', 'routes'):
    for row in layout[key]:
        if key == 'lifts':
            p = row['origin']
            reach = math.hypot(row['width'], row['depth']) / 2 + .5
            footprint = box(p['x'] - reach, p['z'] - reach, p['x'] + reach, p['z'] + reach)
            y0, y1 = p['y'] - .5, p['y'] + row['height'] + 2.7
        elif key == 'escalators':
            p, u = row['lowerCenter'], row['uphill']
            points = [(p['x'] + u['x'] * v['z'], p['z'] + u['z'] * v['z']) for v in row['path']]
            footprint = LineString(points).buffer(row['width'] / 2 + .5)
            y0, y1 = p['y'] - .5, p['y'] + row['height'] + 1.2
        else:
            points = row['points']
            footprint = LineString([(p['x'], p['z']) for p in points]).buffer(.35)
            y0, y1 = min(p['y'] for p in points), max(p['y'] for p in points) + 1.7
        intersects = y1 >= bottom and y0 <= top and domain.intersects(footprint)
        if row['id'].startswith('subway-') or intersects:
            motion.append({'kind': key, 'id': row['id'], 'intersectsReplacement': bool(intersects)})

lights = [row['id'] for row in layout['authoredLights']
          if bottom <= row['position']['y'] <= top
          and domain.intersects(MultiPoint([(row['position']['x'], row['position']['z'])]))]

out.mkdir(parents=True, exist_ok=True)
report = {'status': 'inspection only; not a deletion manifest', 'layoutSha256': sha(raw),
          'specSha256': sha(spec_raw), 'scriptSha256': sha(Path(__file__).read_bytes()),
          'heightRange': [bottom, top], 'counts': dict(Counter(r['kind'] for r in rows)),
          'objects': rows, 'motionAndRoutesToReconcile': motion, 'lightsInsideReplacement': lights,
          'limits': ['Projected overlap identifies conflicts for review; it does not prove collision.',
                     'Shared slabs and intersecting rooms require clipping or rebuilt interfaces.',
                     'Street shaft closure and new paving openings require a separate surface pass.']}
(out / 'join-inventory.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'counts': report['counts'], 'motionAndRoutes': motion, 'lights': len(lights),
                  'crossingBoundaryCount': sum(not r['fullyWithinNewDomain'] for r in rows)}))
