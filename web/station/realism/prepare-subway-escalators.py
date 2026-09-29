"""Fit four subway escalators into the existing stair wells and cut their pits."""
import json, sys, hashlib, copy
from pathlib import Path
from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union

manifest, out = map(Path, sys.argv[1:])
assert Path('.local').resolve() in out.resolve().parents
m = json.loads(manifest.read_text())
raw = Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest() == m['layoutSha256']
layout = json.loads(raw)
panels = {p['id']: p for p in layout['panels']}
template = next(e for e in layout['escalators'] if e['id'] == 'hall-basement-west-escalator-1')
chassis = [p for p in layout['panels'] if p['id'].startswith(template['id'] + '-')]
flat = template['flatLength']
run = 11.4 - 2 * flat
u = template['uphill']; origin = template['lowerCenter']
cover = panels[template['id'] + '-lower-pit-cover']
along = [(v['x']-origin['x'])*u['x'] + (v['z']-origin['z'])*u['z'] for v in cover['vertices']]
across = [-(v['x']-origin['x'])*u['z'] + (v['z']-origin['z'])*u['x'] for v in cover['vertices']]
# Slightly overlap the cover edge with the slab (under 0.02 mm) to avoid cracks.
half = min(abs(min(across)), abs(max(across))) - .00001
pit_back = min(along) + .00001
banks, retired, reshaped, lower_holes, upper_holes = [], [], [], [], []
for name, prefix, start, direction in [
    ('south', 'subway-platforms-south-', -118, 1),
    ('central-two', 'subway-central-two-', -70, 1),
    ('central-one', 'subway-platforms-central-', -15, 1),
    ('north', 'subway-north-', 28, -1),
]:
    end = start + direction * 11.4
    bank = dict(name=name, prefix=prefix, start=start, end=end,
                midA=start+direction*4.8, midB=start+direction*6.6,
                direction=direction, lowerCenter=dict(x=174.85,y=-11.2,z=end-direction*flat),
                uphill=dict(x=0,y=0,z=-direction), run=run, height=5, flatLength=flat)
    def hole(a, b):
        zs = [bank['lowerCenter']['z']-direction*t for t in (a,b)]
        return box(174.85-half, min(zs), 174.85+half, max(zs))
    lower = hole(pit_back, .9)
    upper = hole(run-.9, run-pit_back)
    bank['lowerPit'] = mapping(lower); bank['upperPit'] = mapping(upper)
    banks.append(bank); lower_holes.append(lower); upper_holes.append(upper)
    for p in layout['panels']:
        if not p['id'].startswith(prefix): continue
        tail = p['id'][len(prefix):]
        stair = tail.startswith('step-') or tail in ('midlanding','bottom-riser','stair-back')
        rail = tail.startswith(('flight-0-174.2-', 'flight-1-174.2-', 'middle-174.2-'))
        tactile = tail in ('upper-tactile', 'lower-tactile')
        if not (stair or rail or tactile): continue
        retired.append(p['id']); q = copy.deepcopy(p)
        for v in q['vertices']:
            if rail: v['x'] += 2
            elif tactile: v['x'] = 176.3 + (v['x']-174.3)*3.4/5.4
            else: v['x'] = 176 + (v['x']-174)*4/6
        reshaped.append(q)

def top_shape(p):
    y = max(v['y'] for v in p['vertices']); triangles = []
    for i in range(0,len(p['triangles']),3):
        vs = [p['vertices'][j] for j in p['triangles'][i:i+3]]
        if all(abs(v['y']-y)<1e-6 for v in vs):
            q = Polygon([(v['x'],v['z']) for v in vs])
            if q.area > 1e-12: triangles.append(q)
    q = unary_union(triangles)
    assert q.is_valid and q.geom_type == 'Polygon', p['id']
    return q

slabs = []
for id, holes in [('subway-north-paid-deck',upper_holes),
                  ('subway-north-platform-ceiling',upper_holes),
                  ('subway-north-platform',lower_holes)]:
    p = panels[id]; shape = top_shape(p); kept = shape.difference(unary_union(holes))
    assert kept.is_valid and kept.geom_type == 'Polygon'
    assert kept.area < shape.area
    slabs.append(dict(id=id, shape=mapping(kept), original=mapping(shape),
                      top=max(v['y'] for v in p['vertices']),
                      bottom=min(v['y'] for v in p['vertices']),
                      appearance=p['appearance'], material=p['material'], role=p['role'], collision=p['collision']))
    retired.append(id)

# These are triangle-expanded boxes, 36 vertices each. Clip every affected joint
# independently so no raised decorative line crosses the moving lower landing.
joints = []
cut = unary_union(lower_holes)
for p in layout['panels']:
    if p['id'] != 'subway-platforms-floor-joints' and not p['id'].startswith('subway-north-floor-joint-'): continue
    assert len(p['vertices']) % 36 == 0
    pieces = []
    touched = False
    for i in range(0,len(p['vertices']),36):
        vs = p['vertices'][i:i+36]
        shape = box(min(v['x'] for v in vs),min(v['z'] for v in vs),max(v['x'] for v in vs),max(v['z'] for v in vs))
        kept = shape.difference(cut); touched |= not kept.equals(shape)
        for k, q in enumerate(getattr(kept,'geoms',[kept])):
            if q.is_empty: continue
            assert q.geom_type == 'Polygon'
            pieces.append(dict(id=p['id']+'-'+str(i//36)+'-'+str(k),shape=mapping(q),
                               top=max(v['y'] for v in vs),bottom=min(v['y'] for v in vs),
                               appearance=p['appearance'],material=p['material'],role=p['role'],collision=False))
    if touched: retired.append(p['id']); joints.extend(pieces)
assert len(retired) == len(set(retired))
used = {p['appearance'] for p in reshaped+slabs+joints+chassis}
spec = dict(parentLayoutSha256=m['layoutSha256'], banks=banks, template=template, chassis=chassis,
            reshaped=reshaped, slabs=slabs, joints=joints, retiredIds=retired, retiredLights=[],
            materials=[r for r in layout['authoredMaterials'] if r['id'] in used],
            assumptions=['Four upward platform escalators follow the city K11 station diagram.',
                         'Lane placement, width, pit dimensions, rise and stair widths are fitted to the current station, not surveyed.',
                         'Passenger lifts remain missing and need native moving-car and door support.'])
out.mkdir(parents=True,exist_ok=True)
(out/'spec.json').write_text(json.dumps(spec)+'\n')
print(dict(banks=len(banks),retired=len(retired),reshaped=len(reshaped),clippedJoints=len(joints)))
