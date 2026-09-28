"""Extract and inventory the recovered municipal station for architectural review."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output.mkdir(parents=True,exist_ok=True)
if (a.output/'municipal-station.glb').exists():raise FileExistsError('Preserve previous evidence; select a fresh output')
bpy.ops.wm.open_mainfile(filepath=str(a.source.resolve()));s=bpy.context.scene
meta=json.loads(s['coordinate_conversion']);roots=[]
for o in s.objects:
 if o.type!='EMPTY' or not o.children:continue
 points=[c.matrix_world@Vector(v) for c in o.children_recursive if c.type=='MESH' for v in c.bound_box]
 if not points:continue
 bounds=[[min(v[k] for v in points),max(v[k] for v in points)] for k in range(3)]
 if bounds[0][1]-bounds[0][0]>450 and bounds[1][1]<60:roots.append((o,bounds))
assert len(roots)==1,[(o.name,b) for o,b in roots]
root,bounds=roots[0];objects=[root,*root.children_recursive];selected=set(objects)
assert len(objects)==1038,'Review changed source hierarchy'
for o in s.objects:o.select_set(o in selected)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str((a.output/'municipal-station.glb').resolve()),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
report={'root':root.name,'bounds':bounds,'meshes':len(objects)-1,'sourceSha256':hashlib.sha256(a.source.read_bytes()).hexdigest(),'identification':'Unique >450 m east-west building in the registered station envelope. Cross-check against municipal root 3520856608 and PLATEAU building 26100-bldg-466068.','coordinateConversion':meta}
(a.output/'metadata.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(a.output/'objects.json').write_text(json.dumps([{'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None} for o in objects],ensure_ascii=False,indent=2)+'\n')
print('MUNICIPAL_STATION_EXTRACTED',root.name,bounds,len(objects),flush=True)
