"""Record the exact editable source faces selected for the rooftop garden connection."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:]);m=json.loads(manifest.read_text());spec=json.loads((out/'spec.json').read_text());raw=Path(m['layout']).read_bytes()
assert spec['componentPrefix']in ('garden-access-','garden-promenade-') and hashlib.sha256(raw).hexdigest()==spec['parentLayoutSha256']==m['layoutSha256']
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
rows=[]
for o in bpy.context.scene.objects:
 id=o.get('kyoto_surface',o.name)
 if o.type!='MESH' or id not in spec['retiredIds']:continue
 vs=[o.matrix_world@v.co for v in o.data.vertices]
 # Deformed handrail quads are not planar. Use Blender's export triangles so
 # both halves are matched independently against the browser mesh.
 o.data.calc_loop_triangles()
 normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
 def face(p):
  row=dict(vertices=list(p.vertices),material=p.material_index)
  if spec['componentPrefix']=='garden-promenade-':
   normals=[normal_matrix@o.data.corner_normals[i].vector for i in p.loops]
   row['normals']=[[n.x,n.z,-n.y]for n in normals]
   row['uv']=[list(o.data.uv_layers.active.data[i].uv)if o.data.uv_layers.active else [0,0]for i in p.loops]
  return row
 rows.append(dict(name=id,dynamic=bool(o.get('kyoto_dynamic')),vertices=[[v.x,v.z,-v.y]for v in vs],materials=[m.name for m in o.data.materials],faces=[face(p)for p in o.data.loop_triangles]))
assert {r['name']for r in rows}==set(spec['retiredIds'])
(out/'retired-source.json').write_text(json.dumps(rows)+'\n');print('GARDEN_ACCESS_SOURCE',len(rows),flush=True)
