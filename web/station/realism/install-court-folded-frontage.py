"""Install the registered folded courtyard facade in Blender and native geometry."""
import argparse,hashlib,json,struct,sys,shutil
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser(description=__doc__)
for key in ['candidate','component','spec','output']:p.add_argument('--'+key,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(lb)
assert sha(lb)=='1a404a092ad65a31e54a185227e8db3f7a888912fe6aaa417f5ae5561a6ad536'
specb=a.spec.read_bytes();spec=json.loads(specb);assert sha(specb)=='935e458bfa69795a97b43b9b5d4da5bf9e69394c1b311caeb9576f3a98d40e86'
nb=(a.component/'native-panels.json').read_bytes();native=json.loads(nb);report=json.loads((a.component/'report.json').read_text())
assert sha(nb)==report['outputs']['nativePanelsSha256']=='cce0df35607416f9a2c5d324468fbdf5b37689f48b48b1d5f22800641b46368f'
def glb(path):
 b=path.read_bytes();n,k=struct.unpack_from('<II',b,12);assert k==0x4e4f534a;j=json.loads(b[20:20+n]);size,k=struct.unpack_from('<II',b,20+n);assert k==0x004e4942;binary=b[28+n:28+n+size]
 def acc(index):
  q=j['accessors'][index];v=j['bufferViews'][q['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[q['type']];fmt={5123:'H',5125:'I',5126:'f'}[q['componentType']];stride=v.get('byteStride',w*struct.calcsize(fmt));start=v.get('byteOffset',0)+q.get('byteOffset',0);assert not q.get('sparse')
  return np.array([struct.unpack_from('<'+fmt*w,binary,start+i*stride) for i in range(q['count'])])
 return b,j,binary,acc
gb,gj,gbin,gacc=glb(a.component/report['outputs']['glbFile']);assert sha(gb)==report['outputs']['glbSha256']
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
collection=bpy.data.collections.new('Registered courtyard folded facade');bpy.context.scene.collection.children.link(collection)
def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs);loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())

def bind(obj,row,index):
 for k,v in {'kyoto_surface':row['id'],'kyoto_physical':row['material'],'kyoto_role':row['role'],'kyoto_collision':row.get('collision',True),'kyoto_seed':'panels/'+str(index)}.items():obj[k]=v
 obj['kyoto_geometry_signature']=signature(obj)

def cut(poly,axis,value,sign):
 inside=[];outside=[]
 for i,v in enumerate(poly):
  w=poly[(i+1)%len(poly)];dv=sign*(v[axis]-value);dw=sign*(w[axis]-value)
  if dv>=0:inside.append(v)
  if dv<=0:outside.append(v)
  if dv*dw<0:
   q=v+(w-v)*(dv/(dv-dw));inside.append(q);outside.append(q)
 return inside,outside

def projected_area(poly):
 if len(poly)<3:return 0.
 return abs(sum(v[0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*v[1] for i,v in enumerate(poly)))/2

def mesh_from_rows(name,polygons,mat):
 vs=[];fs=[];norm=[];uv=[]
 for poly in polygons:
  for i in range(1,len(poly)-1):
   tri=[v.copy() for v in [poly[0],poly[i],poly[i+1]]]
   for q in tri:q[:3]=q[:3].astype(np.float32).astype(float)
   if np.linalg.norm(np.cross(tri[1][:3]-tri[0][:3],tri[2][:3]-tri[0][:3]))<1e-10:continue
   n=len(vs);fs.append([n,n+1,n+2])
   for q in tri:
    vs.append((q[0],-q[2],q[1]));norm.append(Vector((q[3],-q[5],q[4])).normalized());uv.extend((q[6],1-q[7]))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.materials.append(mat);mesh.update();layer=mesh.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',uv)
 for f in mesh.polygons:f.use_smooth=True
 mesh.normals_split_custom_set(norm);return mesh

changes=[];removed_area=0.;areas={p['id']:0. for p in spec['patches']}
for id in ['municipal-station-court-east-Untitled.203']:
 index=next(i for i,q in enumerate(layout['panels']) if q['id']==id);original=layout['panels'][index];obj=bpy.data.objects[id];old_mesh=obj.data;old_mesh.calc_loop_triangles();old_uv=old_mesh.uv_layers.active;polygons=[];removed=[];retained=0
 assert np.allclose(np.array(obj.matrix_world),np.eye(4),atol=1e-12)
 for tri in old_mesh.loop_triangles:
  poly=[]
  for li in tri.loops:
   v=old_mesh.vertices[old_mesh.loops[li].vertex_index].co;n=old_mesh.corner_normals[li].vector;uv=old_uv.data[li].uv
   poly.append(np.array([v.x,v.z,-v.y,n.x,n.z,-n.y,uv.x,1-uv.y]))
  fragments=[poly];modified=False
  for patch in spec['patches']:
   origin=np.array(patch['origin']);normal=np.array(patch['normal']);u=np.array(patch['u'])
   if not all(abs(np.dot(v[:3]-origin,normal))<.012 for v in poly):continue
   mapped=[np.r_[np.dot(v[:3]-origin,u),v[1],v] for v in poly]
   if projected_area(mapped)<1e-8:continue
   inner=mapped;outside=[];l,b,r,t=patch['bounds']
   for axis,value,sign in [(0,l,1),(0,r,-1),(1,b,1),(1,t,-1)]:
    if len(inner)<3:break
    inner,other=cut(inner,axis,value,sign)
    if projected_area(other)>1e-9:outside.append(other)
   amount=projected_area(inner)
   if amount>1e-8:
    fragments=[[v[2:] for v in q] for q in outside];removed.append({'triangle':tri.index,'patch':patch['id'],'areaUYM2':amount,'polygonRenderer':[q[2:5].tolist() for q in inner]});removed_area+=amount;areas[patch['id']]+=amount;modified=True;break
  if not modified:retained+=1
  polygons.extend(fragments)
 assert removed,id
 mat=old_mesh.materials[0];mesh=mesh_from_rows(id,polygons,mat);mesh.calc_loop_triangles();ix=[v for t in mesh.loop_triangles for v in reversed(t.vertices)]
 row={**original,'vertices':[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices],'triangles':ix}
 if 'finishes' in row:
  assert len(row['finishes'])==1;row['finishes']=[{**row['finishes'][0],'triangles':ix}]
 obj.data=mesh;layout['panels'][index]=row;bind(obj,row,index)
 changes.append({'id':id,'retainedTriangles':retained,'modifiedTriangles':len(removed),'removed':removed,'oldTriangles':len(original['triangles'])//3,'newTriangles':len(ix)//3})
for patch in spec['patches']:assert abs(areas[patch['id']]-patch['areaM2'])<.01,(patch['id'],areas[patch['id']],patch['areaM2'])
print('COURT_FOLDED_SOURCE_CLIPPED',removed_area,flush=True)
materials=[]
for i,m in enumerate(gj['materials']):
 pbr=m['pbrMetallicRoughness'];color=pbr.get('baseColorFactor',[1]*4);id='court-folded-material-'+str(i);label='Registered courtyard | '+m['name'];existing=next((q for q in layout['authoredMaterials'] if q['label']==label),None);id=existing['id'] if existing else id
 row={'id':id,'label':label,'physical':'glass' if m.get('alphaMode')=='BLEND' else 'stone','linearColor':dict(zip('rgba',color)),'alpha':color[3],'metallic':pbr.get('metallicFactor',1),'roughness':pbr.get('roughnessFactor',1),'doubleSided':m.get('doubleSided',False)}
 assert not any(pbr.get(k) for k in ['baseColorTexture','metallicRoughnessTexture']) and not m.get('normalTexture')
 if 'emissiveFactor' in m:row.update(emission=1,emissionColor=dict(zip('rgb',m['emissiveFactor'])))
 if existing:assert row==existing,(label,'Existing material changed')
 mat=bpy.data.materials.get(label) or bpy.data.materials.new(label);mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=color;shader.inputs['Roughness'].default_value=row['roughness'];shader.inputs['Metallic'].default_value=row['metallic'];shader.inputs['Alpha'].default_value=color[3]
 if not existing:layout['authoredMaterials'].append(row)
 if row.get('emission'):shader.inputs['Emission Color'].default_value=(*m['emissiveFactor'],1);shader.inputs['Emission Strength'].default_value=1
 materials.append((mat,row))
offsets=[0]*len(gj['materials']);added=[]
for q in native['panels']:
 assert all(old['id']!=q['id'] for old in layout['panels']),q['id']
 mi=q['browserMaterial'];pr=gj['meshes'][mi]['primitives'][0];assert pr['material']==mi;start=offsets[mi];end=start+len(q['vertices']);offsets[mi]=end
 vp=gacc(pr['attributes']['POSITION'])[start:end];vn=gacc(pr['attributes']['NORMAL'])[start:end];vu=gacc(pr['attributes']['TEXCOORD_0'])[start:end] if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(vp),2))
 error=max(np.linalg.norm(vp[i]-[v['x'],v['y'],-v['z']]) for i,v in enumerate(q['vertices']));assert error<1e-5
 mesh=bpy.data.meshes.new(q['id']);mesh.from_pydata([(v[0],-v[2],v[1]) for v in vp],[],[q['triangles'][i:i+3][::-1] for i in range(0,len(q['triangles']),3)]);mesh.materials.append(materials[mi][0]);mesh.update();uv=mesh.uv_layers.new(name='UVMap');custom=[]
 for f in mesh.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   index=mesh.loops[li].vertex_index;uv.data[li].uv=(vu[index][0],1-vu[index][1]);normal=vn[index];custom.append((normal[0],-normal[2],normal[1]))
 mesh.normals_split_custom_set(custom);obj=bpy.data.objects.new(q['id'],mesh);collection.objects.link(obj)
 row={k:v for k,v in q.items() if k!='browserMaterial'};row['appearance']=materials[mi][1]['id'];row['vertices']=[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices]
 bind(obj,row,len(layout['panels']));layout['panels'].append(row);added.append(q['id'])
for i,n in enumerate(offsets):assert n==gj['accessors'][gj['meshes'][i]['primitives'][0]['attributes']['POSITION']]['count']
proof={'status':'Full-station folded courtyard facade candidate; final visual/course/performance gates remain open.','inputLayoutSha256':sha(lb),'componentGlbSha256':sha(gb),'componentNativeSha256':sha(nb),'specSha256':sha(specb),'sourceChanges':changes,'removedProjectedAreaM2':removed_area,'patchAreas':[{'id':p['id'],'expected':p['areaM2'],'removed':areas[p['id']]} for p in spec['patches']],'addedPanels':added,'toolSha256':sha(Path(__file__).read_bytes())}
layout['architecture']['courtFoldedFrontage']=proof
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
proof['layoutSha256']=sha(text.encode());proof['blenderSha256']=sha((a.output/'KyotoAtrium.blend').read_bytes());(a.output/'court-folded-install.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'addedPanels':len(added),'layoutSha256':proof['layoutSha256']}),flush=True)
