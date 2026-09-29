"""Reviewable retirement and retained Porta fragments for one subway replacement.

Only authored generated panels are changed here. Municipal paving is handled
separately so its original texture coordinates and smooth normals survive.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon, box, shape, mapping
from shapely.ops import unary_union
from closed_mesh_clip import clip, closed

manifest_path, spec_path, out = map(Path, sys.argv[1:])
assert Path('.local').resolve() in out.resolve().parents
sha = lambda data: hashlib.sha256(data).hexdigest()
m = json.loads(manifest_path.read_text())
raw = Path(m['layout']).read_bytes()
assert sha(raw) == m['layoutSha256']
layout = json.loads(raw)
s = json.loads(spec_path.read_text())
assert s['parentLayoutSha256'] == m['layoutSha256']
by_id = {p['id']: p for p in layout['panels']}
materials = {a['id']: a for a in layout['authoredMaterials']}
retired, fragments, slabs, changes = set(), [], [], []

# These complete authored groups were reviewed against their bounds and roles.
# Shared JR subgrade, Hachijo forecourt, and Porta slabs have different IDs and
# are deliberately processed separately below.
old_metro = ('subway-', 'kotochika-', 'central-one-east-', 'exit-five-', 'porta-east-')
old_connections = ('east-transfer-relocated-porta-connection-', 'hachijo-crossing-station-')
for p in layout['panels']:
    if p['id'].startswith(old_metro + old_connections):
        retired.add(p['id'])
for id in ('hachijo-crossing-lobby-return', 'hachijo-crossing-north-lobby-west', 'hachijo-crossing-crossing-sign',
           'hachijo-crossing-rebuilt-hachijo-lift-subway-passage-south-lobby-floor',
           'hachijo-crossing-rebuilt-hachijo-lift-subway-passage-south-ceiling'):
    assert id in by_id, id
    retired.add(id)


def bounds(p, axis):
    return min(v[axis] for v in p['vertices']), max(v[axis] for v in p['vertices'])


def welded(p):
    unique, rows, indices = {}, [], []
    for v in p['vertices']:
        key = tuple(round(v[k], 9) for k in ('x', 'y', 'z'))
        if key not in unique:
            unique[key] = len(rows)
            rows.append(key)
        indices.append(unique[key])
    vs = np.array(rows)
    fs = np.array([indices[i] for i in p['triangles']]).reshape(-1, 3)
    closed(vs, fs)
    return vs, fs


shared_porta = {
    'porta-west-lift-rebuilt-porta-plaza-deck',
    'porta-pavilion-rebuilt-porta-west-lift-rebuilt-porta-plaza-ceiling',
}
for id in shared_porta:
    assert id in by_id

for p in layout['panels']:
    id = p['id']
    porta = id.startswith(('porta-connection-', 'porta-plaza-', 'porta-pavilion-east-north-')) or id in shared_porta
    ceiling_trim = porta and p.get('role') == 'ceiling-joint' and box(*[bounds(p,k)[i] for i in (0,1) for k in ('x','z')]).intersects(shape(s['portaStair']['ceilingCut']))
    if not porta or bounds(p, 'x')[1] <= 55 and not ceiling_trim:
        continue
    assert bounds(p, 'y')[1] < -2.5, ('Unexpected above-ground Porta surface', id)
    retired.add(id)
    x0, x1 = bounds(p, 'x')
    if ceiling_trim and x0 < 55:
        assert p.get('collision') is False
        z0,z1 = bounds(p,'z');bottom,top = bounds(p,'y')
        footprint=box(x0,z0,min(x1,55),z1).difference(shape(s['portaStair']['ceilingCut']))
        if not footprint.is_empty:
            slabs.append({'id':'subway-refit-retained-'+id,'shape':mapping(footprint),
                          'top':top,'depth':top-bottom,'appearance':p['appearance'],
                          'role':p['role'],'material':p['material'],'collision':False})
        changes.append({'id':id,'action':'Trim noncolliding ceiling grid around stair opening'})
        continue
    if x0 >= 55:
        changes.append({'id': id, 'action': 'retire inside replacement'})
        continue
    material = materials[p['appearance']]
    assert not material.get('albedo'), ('Textured fragment needs UV clipping', id)
    if 'sign' in p.get('role', ''):
        changes.append({'id': id, 'action': 'remove obsolete sign as a whole'})
        continue
    # Clip the actual closed triangles, retaining holes in the public-lift slab.
    vs, fs = clip(*welded(p), 0, 55, False)
    fragment = {k: v for k, v in p.items() if k not in ('vertices', 'triangles', 'uv', 'normals')}
    fragment.update(id='subway-refit-retained-' + id,
                    vertices=[dict(zip(('x', 'y', 'z'), map(float, v))) for v in vs],
                    triangles=fs.flatten().tolist())
    # The new B2 stair rises through this old ceiling. Rebuild its horizontal
    # footprint with a hole, rather than leaving a head-height shelf in the way.
    if id == 'porta-connection-b2-ceiling':
        top, bottom = bounds(p, 'y')[1], bounds(p, 'y')[0]
        polys = [Polygon([(v['x'], v['z']) for v in (fragment['vertices'][j] for j in tri)])
                 for tri in np.array(fragment['triangles']).reshape(-1, 3)
                 if all(abs(fragment['vertices'][j]['y'] - top) < 1e-6 for j in tri)]
        footprint = unary_union(polys).difference(shape(s['portaStair']['ceilingCut']))
        slabs.append({'id': fragment['id'], 'shape': mapping(footprint), 'top': top,
                      'depth': top - bottom, 'appearance': p['appearance'],
                      'role': p['role'], 'material': p['material']})
    else:
        fragments.append(fragment)
    changes.append({'id': id, 'action': 'retain west of X55 with a closed cut',
                    'originalTriangles': len(p['triangles']) // 3,
                    'retainedTriangles': len(fragment['triangles']) // 3})

# Closing the obsolete indoor South stair must not remove the receiving foyer.
foyer_id = 'hachijo-crossing-rebuilt-hachijo-lift-subway-passage-foyer-floor'
foyer = by_id[foyer_id]
assert all(abs(a-b)<1e-4 for a,b in zip((*bounds(foyer,'x'), *bounds(foyer,'z'), *bounds(foyer,'y')), (145,174,-174,-128,-.35,0)))
retired.add(foyer_id)
slabs.append({'id': 'subway-refit-restored-hachijo-foyer', 'shape': mapping(box(145,-174,174,-128)),
              'top': 0, 'depth': .35, 'appearance': foyer['appearance'],
              'role': foyer['role'], 'material': foyer['material']})

# Corridor fixtures have their own names, outside the old station slab prefix.
for p in layout['panels']:
    if p['id'].startswith('hachijo-crossing-fixture-tunnel-') and bounds(p,'z')[1] > -186.3:
        retired.add(p['id'])
retired_lights = []
for l in layout['authoredLights']:
    id, pos = l['id'], l['position']
    if (id.startswith(old_metro + old_connections)
            or id.startswith(('porta-connection-', 'porta-plaza-', 'porta-pavilion-east-north-')) and pos['x'] >= 55
            or id.startswith('hachijo-crossing-light-tunnel-') and pos['z'] > -186.3):
        retired_lights.append(id)

protected = ['east-transfer-underpass-floor', 'east-transfer-underpass-ceiling',
             'hachijo-crossing-rebuilt-hachijo-lift-east-transfer-rebuilt-railway-railway-subgrade-0',
             'hachijo-crossing-rebuilt-hachijo-east-forecourt']
assert all(id in by_id and id not in retired for id in protected)
assert len(retired) == sum(p['id'] in retired for p in layout['panels'])
record = {'parentLayoutSha256': m['layoutSha256'], 'specSha256': sha(spec_path.read_bytes()),
          'scriptSha256': sha(Path(__file__).read_bytes()), 'retiredIds': sorted(retired),
          'retiredLights': retired_lights,
          'retiredLiftIds': ['subway-central-one-lift', 'subway-exit-five-lift', 'subway-south-platform-lift'],
          'retiredEscalatorIds': ['subway-escalators-' + id for id in ('north','central-one','central-two','south')],
          'fragments': fragments, 'slabs': slabs,
          'materials': [materials[id] for id in sorted({p['appearance'] for p in fragments + slabs})],
          'protectedIds': protected, 'changes': changes,
          'pending': ['Restore old municipal paving apertures and cut the new street shafts.',
                      'Close the retained Hachijo lift lobby north wall after its obsolete approach is removed.']}
out.mkdir(parents=True, exist_ok=True)
(out/'integration.json').write_text(json.dumps(record) + '\n')
print(json.dumps({'retiredPanels': len(retired), 'clippedFragments': len(fragments),
                  'rebuiltSlabs': len(slabs), 'retiredLights': len(retired_lights)}))
