"""Recover source corner data omitted from the old eastern facade collision record."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:]);m=json.loads(manifest.read_text())
assert Path('.local').resolve()in out.resolve().parents
spec=json.loads((out/'spec.json').read_text());assert spec['componentPrefix']=='east-public-lift-'and spec['parentLayoutSha256']==m['layoutSha256']
raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);id='municipal-station-wing-east-Untitled.202';p=next(p for p in layout['panels']if p['id']==id)
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
o=next(o for o in bpy.data.objects if o.get('kyoto_surface',o.name)==id);mesh=o.data;mesh.calc_loop_triangles();assert mesh.uv_layers.active
matrix=o.matrix_world;nm=matrix.to_3x3().inverted().transposed();rows=[]
normals=mesh.attributes['kyoto_authored_normal'].data if 'kyoto_authored_normal'in mesh.attributes else mesh.corner_normals
uvs=mesh.uv_layers.active.data
for f in mesh.loop_triangles:
 points=[mesh.vertices[i].co for i in f.vertices]
 # The municipal importer excludes these same degenerate triangles.
 if (points[1]-points[0]).cross(points[2]-points[0]).length<2e-12:continue
 row=[]
 for vi,li in zip(f.vertices,f.loops):
  v=matrix@mesh.vertices[vi].co;n=nm@normals[li].vector;n.normalize();uv=uvs[li].uv
  row.append(dict(POSITION=[v.x,v.z,-v.y],NORMAL=[n.x,n.z,-n.y],TEXCOORD_0=[uv.x,1-uv.y]))
 rows.append(row)
print('Source/native triangles',len(rows),len(p['triangles'])//3,'object',o.name,flush=True)
assert len(rows)==len(p['triangles'])//3
proof=dict(sourceSha256=hashlib.sha256(Path(m['sourceScene']).read_bytes()).hexdigest(),layoutSha256=m['layoutSha256'],uvConvention='gltf-v-flipped',id=id,triangles=rows)
(out/'source-attributes.json').write_text(json.dumps(proof)+'\n');print('Source attributes',len(rows),flush=True)
