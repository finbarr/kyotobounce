"""Extract exact authored triangles for retiring the platform 0 obstructions."""
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
 if o.name not in ['add-central-gate-paid-floor', 'add-central-gate-rear-depth', 'add-central-gate-paid-ceiling', 'add-central-gate-return--8', 'add-central-gate-return-25', 'add-central-gate-platform-0', 'add-central-gate-platform-1', 'add-central-gate-platform-2', 'add-central-gate-platform-3', 'add-central-gate-platform-4', 'railway-end-parapet--45', 'railway-end-glass--45']:continue
 mesh=o.data;mesh.calc_loop_triangles();vs=[o.matrix_world@v.co for v in mesh.vertices]
 row={'name':o.name,'properties':{k:v for k,v in o.items()if isinstance(v,(str,int,float,bool))},'vertices':[[v.x,v.z,-v.y]for v in vs],'triangles':[list(t.vertices)for t in mesh.loop_triangles],'materials':[m.name for m in mesh.materials],'triangleMaterials':[t.material_index for t in mesh.loop_triangles],'faces':[{'vertices':list(p.vertices),'material':p.material_index}for p in mesh.polygons]};rows.append(row)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(rows))
print('RETIRED_GATE_OBJECTS',len(rows),'triangles',sum(len(r['triangles'])for r in rows),flush=True)
