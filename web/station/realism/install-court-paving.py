"""Apply paving finishes to existing faces; native physics records stay byte-equivalent."""
import argparse,hashlib,json,sys,shutil
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser(description=__doc__)
for k in ['candidate','spec','textures','output']:p.add_argument('--'+k,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists() and Path('.local').resolve() in a.output.resolve().parents
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(lb);sb=a.spec.read_bytes();s=json.loads(sb);tr=json.loads((a.textures/'report.json').read_text())
assert sha(lb)==s['parentLayoutSha256'] and tr['specSha256']==sha(sb)
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
materials=[]
for f in tr['finishes']:
 label='Registered courtyard | court-paving-'+f['id'];assert not bpy.data.materials.get(label)
 row={'id':'court-paving-'+f['id'],'label':label,'physical':'floor','linearColor':{'r':1,'g':1,'b':1,'a':1},'alpha':1,'metallic':0,'roughness':1,'doubleSided':False,'normalScale':.7}
 for m in f['maps']:
  data=(a.textures/m['file']).read_bytes();assert sha(data)==m['sha256'];dest=a.output/'textures'/m['file'];dest.write_bytes(data);row[m['kind']]='AtriumTextures/'+dest.stem
 layout['authoredMaterials'].append(row);mat=bpy.data.materials.new(label);mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(1,1,1,1);shader.inputs['Roughness'].default_value=1;shader.inputs['Metallic'].default_value=0;materials.append(mat)
O=np.array(s['frame']['origin']);D=np.array(s['frame']['forward']);A=np.array(s['frame']['south']);Y=s['frame']['floorY'];boundary=s['boundary']
def uv(w):
 r=np.array([w.x,w.z,-w.y])-O;return np.array([r@D,r@A])
def signed(w):
 u,v=uv(w);return v-boundary['slope']*u-boundary['intercept']
def clip(poly,dark,distance=signed):
 out=[]
 for i,v in enumerate(poly):
  w=poly[(i+1)%len(poly)];d,e=distance(v),distance(w);inside=(d>=0) if dark else (d<=0);next_inside=(e>=0) if dark else (e<=0)
  if inside:out.append(v)
  if inside!=next_inside:out.append(v+(w-v)*(d/(d-e)))
 return out
changes=[]
for id in s['targets']:
 objects=[o for o in bpy.data.objects if o.get('kyoto_surface')==id];assert len(objects)==1;obj=objects[0];mesh=obj.data;mesh.calc_loop_triangles();old_uv=mesh.uv_layers.active
 vertices=[];faces=[];face_mats=[];uvs=[];normals=[];top_before=[];top_after=[];other_before=[];other_after=[]
 slots=list(mesh.materials);pale=len(slots);dark=pale+1;slots+=materials
 for t in mesh.loop_triangles:
  points=[obj.matrix_world@mesh.vertices[i].co for i in t.vertices];n=(points[1]-points[0]).cross(points[2]-points[0]).normalized();top=n.z>.999 and all(abs(w.z-Y)<1e-5 for w in points)
  if top:
   top_before.append([list(w) for w in points])
   if id=='east-court-raised-garden':
    dining=clip(points,True);aisle_edge=lambda w: s['aisle']['darkMaximumU']-uv(w)[0]
    polys=[(clip(points,False),pale),(clip(dining,False,aisle_edge),pale),(clip(dining,True,aisle_edge),dark)]
   else:polys=[(points,pale)]
   for poly,mi in polys:
    for k in range(1,len(poly)-1):
     tri=[poly[0],poly[k],poly[k+1]]
     if (tri[1]-tri[0]).cross(tri[2]-tri[0]).length<1e-9:continue
     base=len(vertices);faces.append((base,base+1,base+2));face_mats.append(mi)
     for w in tri:
      vertices.append(obj.matrix_world.inverted()@w);u,v=(uv(w)-s['uvOrigin'])/s['textureSpanM'];uvs.append((u,1-v));normals.append((0,0,1))
     top_after.append({'material':mi,'points':[list(w) for w in tri]})
  else:
   other_before.append([list(w) for w in points]);base=len(vertices);faces.append((base,base+1,base+2));face_mats.append(t.material_index)
   for index,li in zip(t.vertices,t.loops):vertices.append(mesh.vertices[index].co.copy());uvs.append(tuple(old_uv.data[li].uv) if old_uv else (0,0));normals.append(tuple(mesh.corner_normals[li].vector))
   other_after.append([list(w) for w in points])
 assert top_before and other_before==other_after
 new=bpy.data.meshes.new(id+' paving finishes');new.from_pydata(vertices,[],faces);new.update()
 for mat in slots:new.materials.append(mat)
 for f,mi in zip(new.polygons,face_mats):f.material_index=mi;f.use_smooth=True
 layer=new.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',[v for pair in uvs for v in pair]);new.normals_split_custom_set(normals);obj.data=new
 vs=np.empty(len(new.vertices)*3,dtype=np.float32);new.vertices.foreach_get('co',vs);loops=np.empty(len(new.loops),dtype=np.int32);new.loops.foreach_get('vertex_index',loops);obj['kyoto_geometry_signature']=sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
 changes.append({'id':id,'topBefore':top_before,'topAfter':top_after,'unchangedOtherTriangles':len(other_before),'oldTriangles':len(mesh.loop_triangles),'newTriangles':len(faces)})
proof={'inputLayoutSha256':sha(lb),'specSha256':sha(sb),'textureReportSha256':sha((a.textures/'report.json').read_bytes()),'targets':s['targets'],'nativePhysicsRecordsUnchanged':True,'method':'Split visible floor triangles only at a material boundary on the same plane. Native vertices, indices, physical materials, collision flags, routes and other records remain exact.','limits':s['limits']}
layout['architecture']['courtPaving']=proof;text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
proof=dict(proof,layoutSha256=sha(text.encode()),blenderSha256=sha((a.output/'KyotoAtrium.blend').read_bytes()),changes=changes)
(a.output/'court-paving-install.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'layoutSha256':proof['layoutSha256'],'targets':[{'id':q['id'],'oldTriangles':q['oldTriangles'],'newTriangles':q['newTriangles']} for q in changes]}),flush=True)
