"""Extract exact authored triangles for retiring the obsolete east court stair."""
import bpy,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
manifest_path,out=map(Path,sys.argv[sys.argv.index('--')+1:]);manifest=json.loads(manifest_path.read_text())
assert Path('.local').resolve() in out.resolve().parents
bpy.ops.wm.open_mainfile(filepath=str(Path(manifest['sourceScene']).resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==Path(manifest['layout']).read_text()
rows=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 if not ('east-4f-7f' in o.name or o.get('kyoto_owner')=='east-4f-7f'):continue
 mesh=o.data;mesh.calc_loop_triangles();vs=[o.matrix_world@v.co for v in mesh.vertices]
 row={'name':o.name,'properties':{k:v for k,v in o.items()if isinstance(v,(str,int,float,bool))},'vertices':[[v.x,v.z,-v.y]for v in vs],'triangles':[list(t.vertices)for t in mesh.loop_triangles],'materials':[m.name for m in mesh.materials],'triangleMaterials':[t.material_index for t in mesh.loop_triangles]};rows.append(row)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(rows))
print('STAIR_OBJECTS',[(r['name'],len(r['vertices']),len(r['triangles']),r['materials'])for r in rows],flush=True)
