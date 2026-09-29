"""Extract exact authored triangles for retiring the JR West gate obstructions."""
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
 if o.name not in ['add-west-gate-back','add-west-gate-closed-flap-2']:continue
 mesh=o.data;mesh.calc_loop_triangles();vs=[o.matrix_world@v.co for v in mesh.vertices]
 row={'name':o.name,'properties':{k:v for k,v in o.items()if isinstance(v,(str,int,float,bool))},'vertices':[[v.x,v.z,-v.y]for v in vs],'triangles':[list(t.vertices)for t in mesh.loop_triangles],'materials':[m.name for m in mesh.materials],'triangleMaterials':[t.material_index for t in mesh.loop_triangles],'faces':[{'vertices':list(p.vertices),'material':p.material_index}for p in mesh.polygons]};rows.append(row)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(rows))
print('RETIRED_GATE_OBJECTS',len(rows),'triangles',sum(len(r['triangles'])for r in rows),flush=True)
