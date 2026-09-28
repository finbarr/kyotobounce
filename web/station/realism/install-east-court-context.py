"""Install the registered court assembly in a fresh full-station review candidate.

Retire the displaced draft court objects, restore the missing municipal courtyard
facade strip and replace only source paving and the documented cafe storefront.
Unfinished landmark placement and lower access remain explicit release blockers.
"""
import argparse,collections,hashlib,json,struct,sys,shutil
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser(description=__doc__)
for key in ['candidate','source','assembly','court','inventory','output']:p.add_argument('--'+key,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(lb)
assert sha(lb)=='3633a22e8d03322578730b0bc8465b9863f6f837caa5e266f5f0a90e8546536e'
inv=json.loads(a.inventory.read_text());assert inv['layoutSha256']==sha(lb)
nb=(a.assembly/'native-panels.json').read_bytes();native=json.loads(nb);report=json.loads((a.assembly/'report.json').read_text())
assert sha(nb)==report['outputs']['nativePanelsSha256']=='43030a6046efd8d9d956f3e7f0f8fa264e163da97a21ad8a332939be5340e8cd'
cb=(a.court/'report.json').read_bytes();court=json.loads(cb);O=np.array(court['geometry']['originRenderer']);D=np.array(court['geometry']['forwardRenderer']);A=np.array(court['geometry']['southRenderer'])
def glb(path):
 b=path.read_bytes();n,k=struct.unpack_from('<II',b,12);assert k==0x4e4f534a;j=json.loads(b[20:20+n]);size,k=struct.unpack_from('<II',b,20+n);assert k==0x004e4942;binary=b[28+n:28+n+size]
 def acc(index):
  q=j['accessors'][index];v=j['bufferViews'][q['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[q['type']];fmt={5123:'H',5125:'I',5126:'f'}[q['componentType']];stride=v.get('byteStride',w*struct.calcsize(fmt));start=v.get('byteOffset',0)+q.get('byteOffset',0);assert not q.get('sparse')
  return np.array([struct.unpack_from('<'+fmt*w,binary,start+i*stride) for i in range(q['count'])])
 return b,j,binary,acc
sb,sj,sbin,sacc=glb(a.source);assert sha(sb)=='0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1'
gb,gj,gbin,gacc=glb(a.assembly/'assembly.glb');assert sha(gb)==report['outputs']['glbSha256']
node=next(n for n in sj['nodes'] if n.get('name')=='Untitled.203');pr=sj['meshes'][node['mesh']]['primitives'];assert len(pr)==1;pr=pr[0]
sp=sacc(pr['attributes']['POSITION']);sn=sacc(pr['attributes']['NORMAL']);su=sacc(pr['attributes']['TEXCOORD_0']);si=sacc(pr['indices']).reshape(-1,3).astype(int)
# Each row carries position, normal and UV through exact half-plane interpolation.
source=np.concatenate([sp,sn,su],axis=1)
def cut(poly,distance):
 inside=[];outside=[]
 for i,v in enumerate(poly):
  w=poly[(i+1)%len(poly)];dv,dw=distance(v),distance(w)
  if dv>=0:inside.append(v)
  if dv<=0:outside.append(v)
  if dv*dw<0:
   q=v+(w-v)*(dv/(dv-dw));inside.append(q);outside.append(q)
 return inside,outside

def area(poly):
 if len(poly)<3:return 0.
 return sum(np.linalg.norm(np.cross(poly[i][:3]-poly[0][:3],poly[i+1][:3]-poly[0][:3]))/2 for i in range(1,len(poly)-1))

def clip(poly,planes):
 for plane in planes:
  if len(poly)<3:return []
  poly,_=cut(poly,plane)
 return poly if area(poly)>1e-10 else []

def local(v):return ((v[:3]-O)@D,v[1],(v[:3]-O)@A)
mask_bounds=[(46.12,50.3),(31.60,34.22),(11.5,32.6)]
mask_planes=[lambda v,k=k,lo=lo:local(v)[k]-lo for k,(lo,hi) in enumerate(mask_bounds)]+[lambda v,k=k,hi=hi:hi-local(v)[k] for k,(lo,hi) in enumerate(mask_bounds)]
floor_ids=set(range(13869,13922));facade_ids={8299,8300,8311,8312};source_mask=[]
def fragments(face,apply):
 poly=[source[i].copy() for i in si[face]]
 if not apply:return [poly]
 if face in floor_ids:return []
 if face not in facade_ids:return [poly]
 outside=[];remainder=poly
 for plane in mask_planes:
  if len(remainder)<3:break
  remainder,other=cut(remainder,plane)
  if area(other)>1e-10:outside.append(other)
 if area(remainder)>1e-10:source_mask.append({'sourceFace':face,'removedAreaM2':area(remainder),'removedRenderer':[v[:3].tolist() for v in remainder]})
 return outside

prefixes=('east-court-','east-restaurant-','east-skyway-','east-lower-stair-','tactile-east-court-','tactile-east-skyway-','k027-','k029-','add-eastsquare-')
def retired(id):return id=='east-square' or id.startswith(prefixes)
removed={}
for kind in ['panels','boxes','beams','flights','escalators','authoredLights']:
 removed[kind]=[{'index':i,'id':q['id'],'recordSha256':sha(json.dumps(q,separators=(',',':')).encode())} for i,q in enumerate(layout[kind]) if retired(q['id'])]
assert any(q['id']=='east-square' for q in removed['panels'])
print('RETIRING_DRAFT', {k:len(v) for k,v in removed.items()},flush=True)
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
selected=[o for o in bpy.data.objects if retired(o.get('kyoto_surface','')) or retired(o.name)]
removed_names=[o.name for o in selected];assert selected
bpy.data.batch_remove(ids=tuple(selected))
for kind in removed:layout[kind]=[q for q in layout[kind] if not retired(q['id'])]
# Rebind unique records by stable surface ID. Existing roof integration already
# resolved retained beams with duplicate IDs; preserve their identity via old index.
old=json.loads(lb)
for kind in ['panels','boxes','beams','flights']:
 old_to_new={i:n for n,i in enumerate(i for i,q in enumerate(old[kind]) if not retired(q['id']))};by_id=collections.defaultdict(list)
 for i,q in enumerate(layout[kind]):by_id[q['id']].append(i)
 for o in bpy.data.objects:
  seed=o.get('kyoto_seed','');surface=o.get('kyoto_surface','')
  if not seed.startswith(kind+'/'):continue
  index=int(seed.split('/')[1]);matches=by_id.get(surface,[])
  if len(matches)==1:index=matches[0]
  elif index in old_to_new and old[kind][index]['id']==surface:index=old_to_new[index]
  elif kind=='flights' and index in old_to_new:index=old_to_new[index]
  else:raise AssertionError(('Unresolved retained seed',o.name,seed,surface))
  o['kyoto_seed']=kind+'/'+str(index)
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
collection=bpy.data.collections.new('Registered East Square context');bpy.context.scene.collection.children.link(collection)
def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs);loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())

def bind(obj,row,index):
 for k,v in {'kyoto_surface':row['id'],'kyoto_physical':row['material'],'kyoto_role':row['role'],'kyoto_collision':row.get('collision',True),'kyoto_seed':'panels/'+str(index)}.items():obj[k]=v
 obj['kyoto_geometry_signature']=signature(obj)

def mesh_from_rows(name,polygons,mat):
 vs=[];fs=[];norm=[];uv=[]
 for poly in polygons:
  for i in range(1,len(poly)-1):
   tri=[poly[0],poly[i],poly[i+1]]
   if area(tri)<=1e-10:continue
   n=len(vs);fs.append([n,n+1,n+2])
   for q in tri:
    vs.append((q[0],-q[2],q[1]));normal=Vector((q[3],-q[5],q[4])).normalized();norm.append(normal);uv.extend((q[6],1-q[7]))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.materials.append(mat);mesh.update();layer=mesh.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',uv)
 for f in mesh.polygons:f.use_smooth=True
 mesh.normals_split_custom_set(norm);return mesh

def row_from_mesh(mesh,id,appearance,role):
 mesh.calc_loop_triangles();ix=[i for t in mesh.loop_triangles for i in reversed(t.vertices)]
 return {'id':id,'vertices':[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices],'triangles':ix,'material':'facade','appearance':appearance,'role':role,'collision':True,'finishes':[{'appearance':appearance,'triangles':ix}]}

# Original clipped source geometry is rebuilt before masking. Uncovered source
# fragments retain their interpolated normals and UVs; no texture reprojection.
region={'x':[74.8,125.0],'y':[29.3733771488756,67.1],'z':[-18.0,18.4]}
planes={
 'wing':[lambda v:v[0]-125],
 'frontage':[lambda v:v[0]-39,lambda v:125-v[0],lambda v:-18-v[2],lambda v:v[1]],
 'court':[lambda v,k=k,lo=lo:v[k]-lo for k,(lo,hi) in enumerate(region.values())]+[lambda v,k=k,hi=hi:hi-v[k] for k,(lo,hi) in enumerate(region.values())]
}
source_changes=[]
for side in ['wing','frontage','court']:
 id='municipal-station-'+('court-east' if side=='court' else side+'-east')+'-Untitled.203';existing=next((i for i,q in enumerate(layout['panels']) if q['id']==id),None)
 model=next(q for q in layout['panels'] if q['id']=='municipal-station-wing-east-Untitled.203');appearance=model['appearance'] if existing is None else layout['panels'][existing]['appearance'];record=next(m for m in layout['authoredMaterials'] if m['id']==appearance);material=bpy.data.materials[record['label']]
 polys=[];control_area=0.;modified_faces=[];retained_triangle_count=0;source_plane_max_error=0.
 if existing is None:
  for face in range(len(si)):
   ctrl=clip(fragments(face,False)[0],planes[side]);control_area+=area(ctrl)
   for poly in fragments(face,True):
    q=clip(poly,planes[side])
    if q:polys.append(q)
   if ctrl and (face in floor_ids or face in facade_ids):modified_faces.append(face)
  old_area=None
 else:
  # Retain the installed source triangulation, including non-planar polygons.
  # Rebuilding every polygon from the source GLB changed its triangulation area.
  # Only triangles on the four registered storefront faces or the registered
  # courtyard plane are eligible for clipping; everything else stays exact.
  obj=bpy.data.objects[id];old_mesh=obj.data;old_mesh.calc_loop_triangles();old_uv=old_mesh.uv_layers.active
  old_area=sum(f.area for f in old_mesh.polygons)
  candidates={face:source[si[face]] for face in floor_ids|facade_ids}
  def source_identity(poly,ids):
   center=np.mean([v[:3] for v in poly],axis=0)
   for face in ids:
    xyz=candidates[face][:,:3];ab=xyz[1]-xyz[0];ac=xyz[2]-xyz[0];normal=np.cross(ab,ac);length=np.linalg.norm(normal)
    if length<1e-9:continue
    normal/=length;error=max(abs((v[:3]-xyz[0])@normal) for v in poly)
    if error>1e-4:continue
    uv=np.linalg.lstsq(np.stack([ab,ac],axis=1),center-xyz[0],rcond=None)[0]
    if min(uv)>=-1e-4 and sum(uv)<=1.0001:return face,error
   return None,0.
  for tri in old_mesh.loop_triangles:
   poly=[]
   for li in tri.loops:
    v=old_mesh.vertices[old_mesh.loops[li].vertex_index].co;n=old_mesh.corner_normals[li].vector;uv=old_uv.data[li].uv
    poly.append(np.array([v.x,v.z,-v.y,n.x,n.z,-n.y,uv.x,1-uv.y]))
   control_area+=area(poly);ys=[v[1] for v in poly]
   face,error=source_identity(poly,floor_ids) if max(ys)-min(ys)<.003 and abs(sum(ys)/3-court['geometry']['arrivalY'])<.003 else (None,0.)
   if face is not None:
    modified_faces.append(face);source_plane_max_error=max(source_plane_max_error,error);continue
   face,error=source_identity(poly,facade_ids) if max(ys)>=31.6 and min(ys)<=34.22 else (None,0.)
   if face is None:polys.append(poly);retained_triangle_count+=1;continue
   source_plane_max_error=max(source_plane_max_error,error);remaining=poly;outside=[]
   for plane in mask_planes:
    if len(remaining)<3:break
    remaining,other=cut(remaining,plane)
    if area(other)>1e-10:outside.append(other)
   if area(remaining)>1e-10:modified_faces.append(face)
   polys.extend(outside)
 mesh=mesh_from_rows(id,polys,material);row=row_from_mesh(mesh,id,appearance,'municipal-courtyard-context' if side=='court' else layout['panels'][existing]['role'])
 if existing is not None:
  obj.data=mesh;layout['panels'][existing]=row;bind(obj,row,existing)
 else:
  obj=bpy.data.objects.new(id,mesh);collection.objects.link(obj);bind(obj,row,len(layout['panels']));layout['panels'].append(row)
 source_changes.append({'id':id,'oldPolygonAreaM2':old_area,'unmaskedTriangleAreaM2':control_area,'newAreaM2':sum(f.area for f in mesh.polygons),'modifiedSourceFaces':sorted(set(modified_faces)),'triangles':len(row['triangles'])//3,'retainedInstalledTriangles':retained_triangle_count,'maximumSourcePlaneErrorM':source_plane_max_error})
print('SOURCE_INTERFACES_READY',source_changes,flush=True)

# Decode embedded maps and invert glTF's G roughness/B metallic channels to the
# canonical R metallic/A smoothness mask used by the existing browser exporter.
def image(index,key):
 texture=gj['textures'][index];im=gj['images'][texture['source']];view=gj['bufferViews'][im['bufferView']];data=gbin[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];suffix='.png' if im['mimeType']=='image/png' else '.jpg';name='court-'+sha(data)[:24];dest=a.output/'textures'/(name+suffix)
 if not dest.exists():dest.write_bytes(data)
 if key!='mask':return 'AtriumTextures/'+name
 source=bpy.data.images.load(str(dest.resolve()),check_existing=False);source.colorspace_settings.name='Non-Color';pixels=np.empty(source.size[0]*source.size[1]*4,dtype=np.float32);source.pixels.foreach_get(pixels);pixels=pixels.reshape(-1,4);converted=np.ones_like(pixels);converted[:,0]=pixels[:,2];converted[:,3]=1-pixels[:,1]
 name+='-canonical-mask';target=bpy.data.images.new(name,width=source.size[0],height=source.size[1],alpha=True);target.colorspace_settings.name='Non-Color';target.pixels.foreach_set(converted.reshape(-1));target.filepath_raw=str((a.output/'textures'/(name+'.png')).resolve());target.file_format='PNG';target.save();return 'AtriumTextures/'+name
materials=[]
for i,m in enumerate(gj['materials']):
 pbr=m['pbrMetallicRoughness'];color=pbr.get('baseColorFactor',[1]*4);id='east-court-registered-material-'+str(i);label='Registered courtyard | '+m['name'];assert all(q['id']!=id for q in layout['authoredMaterials'])
 row={'id':id,'label':label,'physical':'glass' if m.get('alphaMode')=='BLEND' else 'stone','linearColor':dict(zip('rgba',color)),'alpha':color[3],'metallic':pbr.get('metallicFactor',1),'roughness':pbr.get('roughnessFactor',1),'doubleSided':m.get('doubleSided',False)}
 for key,info in [('albedo',pbr.get('baseColorTexture')),('normal',m.get('normalTexture')),('mask',pbr.get('metallicRoughnessTexture'))]:
  if info:
   assert not info.get('texCoord',0) and not info.get('extensions');row[key]=image(info['index'],key)
   if key=='normal':row['normalScale']=info.get('scale',1)
 if 'albedo' in row:assert color==[1,1,1,1]
 if 'mask' in row:assert row['roughness']==1 and row['metallic']==0
 mat=bpy.data.materials.new(label);mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=color;shader.inputs['Roughness'].default_value=row['roughness'];shader.inputs['Metallic'].default_value=row['metallic'];shader.inputs['Alpha'].default_value=color[3]
 layout['authoredMaterials'].append(row);materials.append((mat,row))
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
layout['escalators'].extend(native.get('escalators',[]))
# Comb transfer panels are already among the component panels. The component's
# auxiliary combSupports are kept as provenance, not duplicated native surfaces.
proof={'status':'Full-station contextual construction candidate. Unfinished lower access, landmark placement and course repair prevent release.','inputLayoutSha256':sha(lb),'sourceGlbSha256':sha(sb),'assemblyGlbSha256':sha(gb),'assemblyNativeSha256':sha(nb),'inventorySha256':sha(a.inventory.read_bytes()),'retiredDraftRecords':removed,'removedObjectNames':removed_names,'sourceChanges':source_changes,'sourceCourtClipRenderer':region,'removedFloorSourceFaces':sorted(floor_ids),'facadeReplacementSourceFaces':sorted(facade_ids),'facadeMaskCourtBounds':mask_bounds,'facadeMask':source_mask,'addedPanels':added,'componentCombSupports':native.get('combSupports',[]),'limits':['Retired landmark objects remain recoverable in the immutable input candidate; their accurate placement and current appearance must be rebuilt.','Lower 4F access, eastern service corridor and south connection remain unfinished.','Old general Skyway remains pending integration with the separate registered full corridor.','The cafe doors/interior, full terrace forms, vegetation, furniture and material/light acceptance remain unfinished.','Existing route metadata and authored courses are retained for explicit revalidation; this candidate is not claimed playable.']}
layout['architecture']['eastCourtContext']=proof
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text);bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json';bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
proof['layoutSha256']=sha(text.encode());proof['blenderSha256']=sha((a.output/'KyotoAtrium.blend').read_bytes());(a.output/'east-court-context.json').write_text(json.dumps(proof,indent=2)+'\n');print('EAST_COURT_CONTEXT_READY',json.dumps({'removedObjects':len(selected),'addedPanels':len(added),'sourceChanges':source_changes,'layoutSha256':proof['layoutSha256']}),flush=True)
