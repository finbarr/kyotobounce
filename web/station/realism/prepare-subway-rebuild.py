"""Prepare one connected subway replacement from the checked city-plan anchors.

This writes a small construction specification. It never edits the playable assets.
"""
import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon, Point, LineString, box, mapping, shape as from_shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

manifest_path, registration_path, out = map(Path, sys.argv[1:])
assert Path('.local').resolve() in out.resolve().parents
sha = lambda b: hashlib.sha256(b).hexdigest()
m = json.loads(manifest_path.read_text())
raw = Path(m['layout']).read_bytes()
assert sha(raw) == m['layoutSha256']
layout = json.loads(raw)
registration = json.loads(registration_path.read_text())
assert registration['layoutSha256'] == m['layoutSha256']
controls = Path('research/kyoto-station/notes/subway-control-2026.json')
assert sha(controls.read_bytes()) == registration['controlsSha256']
features = {f['id']: f for f in registration['features']}
floor, ceiling, lower = -6.2, -2.8, -11.2


def core(name, feature):
    f = features[feature]
    q = np.array(f['nativeXZ'])
    d = (q[2] + q[3] - q[0] - q[1]) / 2
    d /= np.linalg.norm(d)
    assert d[1] < -.9
    return {'id': name, 'center': f['centerXZ'], 'downhill': d.tolist(),
            'right': [-d[1], d[0]], 'referenceOutline': f['nativeXZ'],
            'stairStart': -6, 'stairEnd': 5.4, 'stairWidth': 4,
            'stairCenterW': 1, 'stepsPerFlight': 15, 'going': .32, 'landing': 1.8}


cores = [core('north', 'north-stair-outline'), core('central-one', 'central-one-stair-outline')]
# The operator diagram fixes the order and facing of the southern cores, but
# is not a survey. Fit its relative spacing to the two registered north cores.
# Do not stretch the boarding platform to the end of the separate public subway.
for name, center, downhill, gate_side in [
        ('central-two', [97, -23], [0, -1], 1),
        ('south', [99, -65], [0, 1], -1)]:
    cores.append({**cores[0], 'id': name, 'center': center, 'downhill': downhill,
                  'right': [-downhill[1], downhill[0]], 'referenceOutline': None,
                  'gateSides': [gate_side], 'fitted': True})


def at(c, w, t):
    return [c['center'][i] + w * c['right'][i] + t * c['downhill'][i] for i in (0, 1)]


def rect(c, w0, w1, t0, t1):
    return Polygon([at(c, w0, t0), at(c, w1, t0), at(c, w1, t1), at(c, w0, t1)])


# Match the pit cuts to the retained chassis rather than estimating a long
# rectangle. An oversized cut leaves a gap immediately beyond the upper cover.
panels_by_id = {p['id']: p for p in layout['panels']}
source_lane = next(e for e in layout['escalators'] if e['id'] == 'subway-escalators-north')
assert source_lane['uphill'] == {'x': 0, 'y': 0, 'z': 1}
pit_polygons = {}
for end in ('upper', 'lower'):
    cover = panels_by_id['subway-escalators-north-' + end + '-pit-cover']
    vs = cover['vertices']
    x0, x1 = min(v['x'] for v in vs) + .00001, max(v['x'] for v in vs) - .00001
    z0, z1 = min(v['z'] for v in vs), max(v['z'] for v in vs)
    # The inset makes the solid floor and pit cover meet without a numeric gap.
    if end == 'upper':
        z0, z1 = source_lane['lowerCenter']['z'] + source_lane['run'] - .9, z1 - .00001
    else:
        z0, z1 = z0 + .00001, source_lane['lowerCenter']['z'] + .9
    pit_polygons[end] = (x0 - 177, x1 - 177, 22 - z1, 22 - z0)

for c in cores:
    c['paidBounds'] = [-6, 6, -24 if c['id'] in ('central-one', 'south') else -21, 10]
    c.setdefault('gateSides', [-1, 1])
    c['gates'] = [-14, -11] if c['id'] == 'north' else [-13, -10]
    c['upperPit'] = mapping(rect(c, *pit_polygons['upper']))
    c['lowerPit'] = mapping(rect(c, *pit_polygons['lower']))
    c['opening'] = mapping(unary_union([rect(c, -4.3, 4.3, -6.05, 6.3),
                                       rect(c, *pit_polygons['upper'])]))
    c['lowerLandingShape'] = mapping(rect(c, -4.3, 4.3, c['stairEnd'], 12)
                                    .difference(rect(c, *pit_polygons['lower'])))

# Surface levels come from the retained paving triangles, not the access diagram.
surface_shapes, surface_triangles = [], []
for panel in layout['panels']:
    if not panel['id'].startswith(('municipal-plaza-', 'municipal-road-')):
        continue
    vs = panel['vertices']
    if min(v['x'] for v in vs) > 150 or max(v['x'] for v in vs) < 30 or min(v['z'] for v in vs) > 145 or max(v['z'] for v in vs) < 40:
        continue
    for i in range(0, len(panel['triangles']), 3):
        tri = [vs[k] for k in panel['triangles'][i:i + 3]]
        if min(v['y'] for v in tri) < -1 or max(v['y'] for v in tri) > 1:
            continue
        shape = Polygon([(v['x'], v['z']) for v in tri])
        if shape.area < 1e-8:
            continue
        surface_shapes.append(shape)
        surface_triangles.append((panel['id'], tri))
tree = STRtree(surface_shapes)


def surface_height(x, z):
    values = []
    point = Point(x, z)
    for index in tree.query(point):
        if not surface_shapes[index].buffer(1e-7).covers(point):
            continue
        id, tri = surface_triangles[index]
        a = np.array([[v['x'], v['z'], 1] for v in tri])
        coefficients = np.linalg.solve(a, [v['y'] for v in tri])
        values.append({'panel': id, 'y': float(np.dot([x, z, 1], coefficients))})
    assert values, ('No retained surface at', x, z)
    return {'x': x, 'z': z, 'y': max(v['y'] for v in values), 'surfaces': values}


streets = []
for id, start, d, width in [('three', [111.2, 126.3], [-1, 0], 3.2),
                             ('four', [41.8, 121.7], [1, 0], 3.2),
                             ('five', [130, 56.7], [-1, 0], 4.6)]:
    ground = surface_height(*start)
    rise = ground['y'] - floor
    steps = 2 * math.ceil(rise / .18 / 2)
    going, landing = .32, 1.8
    run = steps * going + landing
    # Each flight has its first tread at the arriving floor height. The last
    # riser lands on the next slab; step height stays below the native limit.
    s = {'id': id, 'center': start, 'downhill': d, 'right': [-d[1], d[0]],
         'upper': ground['y'], 'lower': floor, 'steps': steps, 'going': going,
         'landing': landing, 'run': run, 'width': width, 'surface': ground}
    s['bottom'] = at(s, 0, run)
    s['footprint'] = mapping(rect(s, -width / 2, width / 2, -1.5, run + 2.5))
    s['surfaceOpening'] = mapping(rect(s, -width / 2, width / 2, -1.5, run))
    streets.append(s)

lift_zone = features['exit-five-lift-zone']['centerXZ']
street_lift = {'id': 'exit-five', 'origin': [*lift_zone], 'lower': floor,
               'upper': surface_height(*lift_zone)['y']}
platform_lift = {'id': 'central-one', 'origin': at(cores[1], -2.9, -19), 'lower': lower, 'upper': floor}
south_lift = {'id': 'south', 'origin': at(cores[3], 2.9, -19), 'lower': lower, 'upper': floor}
lifts = [platform_lift, street_lift, south_lift]
for lift in lifts:
    x, z = lift['origin']
    lift['opening'] = mapping(box(x - 1.55, z - 1.55, x + 1.55, z + 1.55))

porta_floor = max(v['y'] for v in panels_by_id['porta-connection-b2-deck']['vertices'])
porta_steps = math.ceil((floor - porta_floor) / .18)
porta_stair = {'center': [55, 4.5], 'downhill': [-1, 0], 'right': [0, -1],
               'upper': floor, 'lower': porta_floor, 'width': 3.6,
               'steps': porta_steps, 'going': .32, 'run': porta_steps * .32}
porta_stair['opening'] = mapping(rect(porta_stair, -1.8, 1.8, 0, porta_stair['run']))
porta_stair['ceilingCut'] = mapping(rect(porta_stair, -1.95, 1.95, -.2, porta_stair['run'] + .4))

# One union supplies the shared public/paid floor. Separate room slabs would
# overlap in the cross-plaza where the northern and central axes differ.
north_domain = rect(cores[0], -18, 18, -32, 43)
central_domain = rect(cores[1], -24, 24, -32, 39)
shapes = [north_domain, central_domain,
          box(55, -14, 138, 61),             # replace overlapping east Porta floor levels
          rect(porta_stair, -1.8, 1.8, 0, porta_stair['run']),
          box(55, 48, 77, 57),                 # retained west mall interface
          box(93, 121, 102, 131),             # Exit 3 lower approach
          box(51, 118, 69, 126),              # Exit 4 lower approach
          box(98, 84, 120, 95),               # Porta east approach
          box(114, 73, 150, 111),             # replacement east mall envelope
          box(104, -188, 119, 4),            # public passage remains outside paid cores
          rect(cores[2], -6, 14, -24, 12),
          rect(cores[3], -20, 6, -27, 12),
          box(111, -27, 155.5, -20),         # approach around retained JR underpass head
          box(147, -40, 155.5, -20),         # receiving aisle outside existing JR gates
          box(111, -195, 155.6, -186.3)]      # retained Hachijo lift lobby
shapes += [Polygon(s['footprint']['coordinates'][0]) for s in streets]
domain = unary_union(shapes).buffer(0).simplify(1e-7)
assert domain.geom_type == 'Polygon' and domain.is_valid
openings = [Polygon(c['opening']['coordinates'][0]) for c in cores]
openings += [Polygon(l['opening']['coordinates'][0]) for l in lifts]
openings += [from_shape(porta_stair['opening'])]
for hole in openings:
    assert domain.covers(hole), ('Opening outside public domain', hole.bounds)
floor_shape = domain.difference(unary_union(openings))
ceiling_holes = [Polygon(s['footprint']['coordinates'][0]) for s in streets]
ceiling_holes += [Polygon(street_lift['opening']['coordinates'][0])]
ceiling_shape = domain.difference(unary_union(ceiling_holes))
assert floor_shape.is_valid and ceiling_shape.is_valid

# These terminate on existing receiving floors, not arbitrary hallway ends.
portals = [box(54, 49.5, 56, 54.5), box(54, 32, 56, 38.5), box(146, -40, 148, -31),
           box(154.6, -195, 156.6, -186.3)]
# Surface approaches must be open at their top; internal perimeter walls stop
# at the stair room entrance instead of continuing through the treads.
portals += [rect(s, -s['width'] / 2 - .2, s['width'] / 2 + .2, -1.7, 1) for s in streets]
boundary = domain.boundary.difference(unary_union(portals))
walls = [list(line.coords) for line in boundary.geoms] if boundary.geom_type == 'MultiLineString' else [list(boundary.coords)]

# A continuous island serves all four stairways and both platform lifts.
# Its axis follows the registered northern approach, then a fitted southern
# alignment. End positions/widths are construction assumptions, not measurements.
axis = LineString([[80, 116], cores[0]['center'], cores[1]['center'],
                   cores[2]['center'], cores[3]['center'], [99, -91]])
platform = axis.buffer(7.1, cap_style=2, join_style=2)
lift_holes = [from_shape(l['opening']) for l in lifts if l['lower'] == lower]
landing_shapes = [from_shape(c['lowerLandingShape']) for c in cores]
platform = unary_union([platform, *landing_shapes])
for landing in landing_shapes:
    assert platform.covers(landing)
lower_pits = [from_shape(c['lowerPit']) for c in cores]
# Landing tops belong to their stair components. Remove their exact footprints
# from the shared floor to avoid coplanar overlapping surfaces.
platform_floor = platform.difference(unary_union([*landing_shapes, *lower_pits, *lift_holes]))
platform_roof = axis.buffer(13.2, cap_style=2, join_style=2).difference(
    unary_union([from_shape(c['opening']) for c in cores] + lift_holes))
tracks = []
for side in (-1, 1):
    center = axis.offset_curve(side * 10, join_style=2)
    tracks.append({'side': side, 'center': list(center.coords),
                   'bed': mapping(center.buffer(2.1, cap_style=2, join_style=2)),
                   'rails': [list(center.offset_curve(d, join_style=2).coords) for d in (-.7175, .7175)]})

# Keep an explicit list of physical conflicts for the next composition step.
inspection = []
replacement_prefixes = ('subway-', 'kotochika-', 'central-one-east-', 'exit-five-', 'porta-east-')
for p in layout['panels']:
    vs = p['vertices']
    if min(v['y'] for v in vs) > ceiling + .25 or max(v['y'] for v in vs) < floor - .3:
        continue
    bounds = box(min(v['x'] for v in vs), min(v['z'] for v in vs), max(v['x'] for v in vs), max(v['z'] for v in vs))
    if domain.intersects(bounds):
        inspection.append({'id': p['id'], 'expectedReplacement': p['id'].startswith(replacement_prefixes),
                           'boundsXYZ': [[min(v[k] for v in vs), max(v[k] for v in vs)] for k in ('x', 'y', 'z')]})

spec = {'parentLayoutSha256': m['layoutSha256'], 'registrationSha256': sha(registration_path.read_bytes()),
        'generatorSha256': sha(Path(__file__).read_bytes()), 'floor': floor, 'ceiling': ceiling, 'lower': lower,
        'cores': cores, 'streetStairs': streets, 'lifts': lifts, 'floorShape': mapping(floor_shape),
        'portaStair': porta_stair,
        'ceilingShape': mapping(ceiling_shape), 'domain': mapping(domain), 'perimeterWalls': walls,
        'platform': {'shape': mapping(platform), 'floorShape': mapping(platform_floor),
                     'baseShape': mapping(axis.buffer(13.2, cap_style=2, join_style=2)),
                     'ceilingShape': mapping(platform_roof), 'axis': list(axis.coords),
                     'width': 14.2, 'ceiling': lower + 3.35, 'tracks': tracks,
                     'edgeLines': [list(axis.offset_curve(d, join_style=2).coords) for d in (-6.45, 6.45)]},
        'interfaces': [{'id': 'porta-west', 'x': 55, 'z': 52.5, 'y': floor},
                       {'id': 'jr-east-gates', 'x': 147, 'z': -36.45, 'y': floor},
                       {'id': 'hachijo-lobby', 'x': 155.6, 'z': -192.8, 'y': floor}],
        'existingIntersections': inspection,
        'limits': ['Core positions and orientations follow checked city-plan outlines; room widths, stairs and finishes are fitted construction dimensions.',
                   'Central 2 and South core positions, the 14.2 m island width and its ends are fitted to the operator diagram; no metric platform-length evidence is available.',
                   'The city plan locates the public passage, not the boarding platform. Its southern street branches are not used to extend the platform.',
                   'The fitted JR approach goes around the retained underpass head to preserve its working platform stairs and gate bank.',
                   'Whole-station joins and retained exterior openings still require coordinated integration.']}
out.mkdir(parents=True, exist_ok=True)
(out / 'spec.json').write_text(json.dumps(spec, indent=2) + '\n')
print(json.dumps({'areaM2': domain.area, 'cores': len(cores), 'streetStairs': len(streets),
                  'surfaces': [s['surface'] for s in streets], 'existingIntersections': len(inspection),
                  'otherComponentIntersections': len([p for p in inspection if not p['expectedReplacement']])}, indent=2))
