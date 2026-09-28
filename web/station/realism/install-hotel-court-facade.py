"""Install the registered hotel facade in both Blender and native station geometry."""
import argparse,hashlib,json,struct,sys,shutil
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser(description=__doc__)
for key in ['candidate','component','spec','output']:p.add_argument('--'+key,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(lb)
assert sha(lb)=='5eda9b3e341be93ba53e1cef7a9ad728d6fc99a0cc4d19325c74c1ec7cc6f078'
specb=a.spec.read_bytes();spec=json.loads(specb);assert sha(specb)=='5de7f0d18a795e70dbcee879054bbe887a3a6b00a21b0e49c4e67be940ceab67'
nb=(a.component/'native-panels.json').read_bytes();native=json.loads(nb);report=json.loads((a.component/'report.json').read_text())
assert sha(nb)==report['outputs']['nativePanelsSha256']=='c158f15bc30eb92ec92512cb693a50254ed976ef1415615ed0ea215211ff0f34'
def glb(path):
 b=path.read_bytes();n,k=struct.unpack_from('<II',b,12);assert k==0x4e4f534a;j=json.loads(b[20:20+n]);size,k=struct.unpack_from('<II',b,20+n);assert k==0x004e4942;binary=b[28+n:28+n+size]
 def acc(index):
  q=j['accessors'][index];v=j['bufferViews'][q['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[q['type']];fmt={5123:'H',5125:'I',5126:'f'}[q['componentType']];stride=v.get('byteStride',w*struct.calcsize(fmt));start=v.get('byteOffset',0)+q.get('byteOffset',0);assert not q.get('sparse')
  return np.array([struct.unpack_from('<'+fmt*w,binary,start+i*stride) for i in range(q['count'])])
 return b,j,binary,acc
gb,gj,gbin,gacc=glb(a.component/report['outputs']['glbFile']);assert sha(gb)==report['outputs']['glbSha256']
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
collection=bpy.data.collections.new('Registered courtyard hotel facade');bpy.context.scene.collection.children.link(collection)
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
   tri=[poly[0],poly[i],poly[i+1]]
   if np.linalg.norm(np.cross(tri[1][:3]-tri[0][:3],tri[2][:3]-tri[0][:3]))<1e-10:continue
   n=len(vs);fs.append([n,n+1,n+2])
   for q in tri:
    vs.append((q[0],-q[2],q[1]));norm.append(Vector((q[3],-q[5],q[4])).normalized());uv.extend((q[6],1-q[7]))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.materials.append(mat);mesh.update();layer=mesh.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',uv)
 for f in mesh.polygons:f.use_smooth=True
 mesh.normals_split_custom_set(norm);return mesh

changes=[];removed_area=0.
for id in ['municipal-station-wing-east-Untitled.203','municipal-station-court-east-Untitled.203']:
 index=next(i for i,q in enumerate(layout['panels']) if q['id']==id);original=layout['panels'][index];obj=bpy.data.objects[id];old_mesh=obj.data;old_mesh.calc_loop_triangles();old_uv=old_mesh.uv_layers.active;polygons=[];removed=[];retained=0
 assert np.allclose(np.array(obj.matrix_world),np.eye(4),atol=1e-12)
 for tri in old_mesh.loop_triangles:
  poly=[]
  for li in tri.loops:
   v=old_mesh.vertices[old_mesh.loops[li].vertex_index].co;n=old_mesh.corner_normals[li].vector;uv=old_uv.data[li].uv
   poly.append(np.array([v.x,v.z,-v.y,n.x,n.z,-n.y,uv.x,1-uv.y]))
  close=all(abs(v[2]-spec['plane']['zPerX']*v[0]-spec['plane']['zIntercept'])<.065 for v in poly)
  fragments=[poly]
  if close and projected_area(poly)>1e-8:
   inner=poly;outside=[]
   for axis,value,sign in [(0,112.95,1),(0,165.88,-1),(1,36.32,1),(1,58.94,-1)]:
    if len(inner)<3:break
    inner,other=cut(inner,axis,value,sign)
    if projected_area(other)>1e-9:outside.append(other)
   amount=projected_area(inner)
   if amount>1e-8:
    fragments=outside;removed.append({'triangle':tri.index,'areaXYM2':amount,'polygonRenderer':[q[:3].tolist() for q in inner]});removed_area+=amount
   else:retained+=1
  else:retained+=1
  polygons.extend(fragments)
 assert removed,id
 mat=old_mesh.materials[0];mesh=mesh_from_rows(id,polygons,mat);mesh.calc_loop_triangles();ix=[v for t in mesh.loop_triangles for v in reversed(t.vertices)]
 row={**original,'vertices':[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices],'triangles':ix}
 if 'finishes' in row:
  assert len(row['finishes'])==1;row['finishes']=[{**row['finishes'][0],'triangles':ix}]
 obj.data=mesh;layout['panels'][index]=row;bind(obj,row,index)
 changes.append({'id':id,'retainedTriangles':retained,'modifiedTriangles':len(removed),'removed':removed,'oldTriangles':len(original['triangles'])//3,'newTriangles':len(ix)//3})
assert abs(removed_area-spec['patchAreaM2'])<.1,(removed_area,spec['patchAreaM2'])
print('HOTEL_SOURCE_CLIPPED',removed_area,flush=True)
def image(index,key):
 texture=gj['textures'][index];im=gj['images'][texture['source']];view=gj['bufferViews'][im['bufferView']];data=gbin[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];suffix='.png' if im['mimeType']=='image/png' else '.jpg';name='hotel-court-'+sha(data)[:24];dest=a.output/'textures'/(name+suffix)
 if not dest.exists():dest.write_bytes(data)
 if key!='mask':return 'AtriumTextures/'+name
 source=bpy.data.images.load(str(dest.resolve()),check_existing=False);source.colorspace_settings.name='Non-Color';pixels=np.empty(source.size[0]*source.size[1]*4,dtype=np.float32);source.pixels.foreach_get(pixels);pixels=pixels.reshape(-1,4);converted=np.ones_like(pixels);converted[:,0]=pixels[:,2];converted[:,3]=1-pixels[:,1]
 name+='-canonical-mask';target=bpy.data.images.new(name,width=source.size[0],height=source.size[1],alpha=True);target.colorspace_settings.name='Non-Color';target.pixels.foreach_set(converted.reshape(-1));target.filepath_raw=str((a.output/'textures'/(name+'.png')).resolve());target.file_format='PNG';target.save();return 'AtriumTextures/'+name
materials=[]
for i,m in enumerate(gj['materials']):
 pbr=m['pbrMetallicRoughness'];color=pbr.get('baseColorFactor',[1]*4);id='hotel-court-registered-material-'+str(i);label='Registered courtyard | '+m['name'];existing=next((q for q in layout['authoredMaterials'] if q['label']==label),None);id=existing['id'] if existing else id
 row={'id':id,'label':label,'physical':'glass' if m.get('alphaMode')=='BLEND' else 'stone','linearColor':dict(zip('rgba',color)),'alpha':color[3],'metallic':pbr.get('metallicFactor',1),'roughness':pbr.get('roughnessFactor',1),'doubleSided':m.get('doubleSided',False)}
 for key,info in [('albedo',pbr.get('baseColorTexture')),('normal',m.get('normalTexture')),('mask',pbr.get('metallicRoughnessTexture'))]:
  if info:
   assert not info.get('texCoord',0) and not info.get('extensions');row[key]=image(info['index'],key)
   if key=='normal':row['normalScale']=info.get('scale',1)
 if 'albedo' in row:assert color==[1,1,1,1]
 if 'mask' in row:assert row['roughness']==1 and row['metallic']==0
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
proof={'status':'Full-station hotel facade candidate; final visual/course/performance gates remain open.','inputLayoutSha256':sha(lb),'componentGlbSha256':sha(gb),'componentNativeSha256':sha(nb),'specSha256':sha(specb),'sourceChanges':changes,'removedProjectedAreaM2':removed_area,'sourcePatchAreaM2':spec['patchAreaM2'],'addedPanels':added,'toolSha256':sha(Path(__file__).read_bytes())}
layout['architecture']['hotelCourtFacade']=proof
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
proof['layoutSha256']=sha(text.encode());proof['blenderSha256']=sha((a.output/'KyotoAtrium.blend').read_bytes());(a.output/'hotel-court-install.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'addedPanels':len(added),'layoutSha256':proof['layoutSha256']}),flush=True)
