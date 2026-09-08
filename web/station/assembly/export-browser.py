"""Shared station exporter with source emission retained for assembled fixtures."""
from pathlib import Path
source = Path('tools/export_browser_art.py').resolve()
code = source.read_text()
opened = 'layout=json.loads(LAYOUT.read_text());records='
assert code.count(opened) == 1
code = code.replace(opened, "assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==LAYOUT.read_text(), 'Embedded seed mismatch'\n" + opened)
cross_check = '''
# Cross-feature collision surfaces must not intersect after composition.
from mathutils.bvhtree import BVHTree
from itertools import combinations
feature_objects={}
for prefix in ['konbini-', 'k027-', 'k028-', 'k029-']:
 feature_objects[prefix]=[o for o in source_scene.objects if o.type=='MESH' and o.name.startswith(prefix) and o.get('kyoto_collision')]
bounds={}; trees={}; pairs=0; overlaps=[]
for objects in feature_objects.values():
 for o in objects:
  pts=[o.matrix_world@Vector(v) for v in o.bound_box]
  bounds[o.name]=[(min(p[k] for p in pts),max(p[k] for p in pts)) for k in range(3)]
for left,right in combinations(feature_objects,2):
 for a in feature_objects[left]:
  for b in feature_objects[right]:
   pairs+=1
   if not all(bounds[a.name][k][0]<=bounds[b.name][k][1] and bounds[b.name][k][0]<=bounds[a.name][k][1] for k in range(3)):continue
   for obj in [a,b]:
    if obj.name not in trees:
     me=obj.evaluated_get(deps).to_mesh();me.calc_loop_triangles()
     trees[obj.name]=BVHTree.FromPolygons([obj.matrix_world@v.co for v in me.vertices],[tuple(t.vertices) for t in me.loop_triangles],all_triangles=True,epsilon=0)
     obj.evaluated_get(deps).to_mesh_clear()
   if trees[a.name].overlap(trees[b.name]):overlaps.append([a.name,b.name])
(OUT/'cross-feature.json').write_text(json.dumps({'checkedPairs':pairs,'intersections':overlaps,'status':'pass' if not overlaps else 'fail'},indent=2))
assert not overlaps, ('Cross-feature solid intersections',overlaps)
'''
boundary = '# K020: only the two demonstrated doorway caps.'
assert code.count(boundary)==1
code=code.replace(boundary,cross_check+'\n'+boundary)
needle = "if alpha<1:m.surface_render_method='DITHERED'"
assert code.count(needle) == 1
code = code.replace(needle, needle + "\n if rec.get('emission',0):\n  ec=rec.get('emissionColor',color)\n  p.inputs['Emission Color'].default_value=(*(ec.get(k,.4) for k in 'rgb'),1)\n  p.inputs['Emission Strength'].default_value=rec['emission']")
exec(compile(code, str(source), 'exec'), {'__file__': str(source), '__name__': '__main__'})
