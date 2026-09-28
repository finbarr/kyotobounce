"""Read-only Blender trace of the floor's source triangles and clipping masks.

Use the browser exporter's --source/--layout/--output arguments. This does not
export, alter the saved blend, or change any game assets.
"""
from pathlib import Path
import sys,json,hashlib
root=Path(__file__).resolve().parents[3];exporter=root/'tools/export_browser_art.py'
namespace={'__file__':str(exporter),'__name__':'__main__'}
code=exporter.read_text().split("groups={};counts=")[0]
exec(compile(code,str(exporter),'exec'),namespace)
ns=namespace;bpy=ns['bpy'];Vector=ns['Vector'];deps=ns['deps'];coplanar=ns['coplanar'];rows=[];objects=[]
label='Atrium | honed granite floor'
for obj in ns['visible_objects']:
 if not any(m and m.name==label for m in obj.data.materials):continue
 e=obj.evaluated_get(deps);mesh=e.to_mesh();mesh.calc_loop_triangles();matrix=e.matrix_world;objects.append(obj.name)
 for tri in mesh.loop_triangles:
  if mesh.materials[tri.material_index].name!=label:continue
  indices=list(tri.vertices)
  if matrix.determinant()<0:indices.reverse()
  vs=[(matrix@mesh.vertices[k].co,Vector((0,0,1)),(0,0))for k in indices]
  fragments=coplanar.fragments(obj.name,tri.polygon_index,vs)
  def v(p):return [float(x)for x in p]
  rows.append({'object':obj.name,'surface':obj.get('kyoto_surface'),'face':tri.polygon_index,'source':[v(x[0])for x in vs],'blockers':coplanar.blockers.get((obj.name,tri.polygon_index),[]),'fragments':[[v(x[0])for x in f]for f in fragments]})
 e.to_mesh_clear()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'meaning':'Read-only trace in Blender coordinates; independent GEOS verifier must check masks, fragments and final GLB triangles.','sourceSha256':sha(ns['SOURCE']),'layoutSha256':sha(ns['LAYOUT']),'exporterSha256':sha(exporter),'clipperSha256':sha(root/'tools/coplanar_surfaces.py'),'objects':objects,'triangles':rows}
p=ns['OUT']/'clipping-trace.json';p.write_text(json.dumps(report,separators=(',',':'))+'\n');print('CONCOURSE_TRACE',str(p),len(rows),objects,flush=True)
