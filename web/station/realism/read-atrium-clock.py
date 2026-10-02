"""Read the old clock triangles before replacing its unsupported mount."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=sys.argv[sys.argv.index('--')+1:];base=json.loads(Path(manifest).read_text())
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert hashlib.sha256(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode()).hexdigest()==base['layoutSha256']
o=bpy.data.objects.get('concourse-hall-clock');assert o;mesh=o.data;mesh.calc_loop_triangles();vs=[o.matrix_world@v.co for v in mesh.vertices]
row=dict(id=o.name,vertices=[dict(x=v.x,y=v.z,z=v.y)for v in vs],triangles=[k for t in mesh.loop_triangles for k in reversed(t.vertices)],label=mesh.materials[0].name,props=dict(o.items()))
(Path(out)/'clock-source.json').write_text(json.dumps(row,default=str));print('CLOCK',row['label'],row['props'],flush=True)
