"""Independently compare native records, unaffected batches and visible floor coverage."""
import hashlib,json,struct,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
parent,candidate,old_glb,new_glb,spec_path,out=map(Path,sys.argv[1:])
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
before,after,s=read(parent/'station-layout.json'),read(candidate/'station-layout.json'),read(spec_path)
assert sha((parent/'station-layout.json').read_bytes())==s['parentLayoutSha256']
for k in before:
 if k not in ['authoredMaterials','architecture']:assert before[k]==after[k],k
assert after['authoredMaterials'][:-2]==before['authoredMaterials'];assert {k:v for k,v in after['architecture'].items() if k!='courtPaving'}==before['architecture']
def glb(path):
 data=path.read_bytes();n,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a;j=json.loads(data[20:20+n]);binary=memoryview(data)[28+n:]
 def acc(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];size=np.dtype(dt).itemsize;assert not a.get('sparse');return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*size),size))
 return data,j,acc
bb,bj,ba=glb(old_glb);nb,nj,na=glb(new_glb)
oldnames={'Registered courtyard | east-court-garden-stone | Browser','Registered courtyard | niwa-walkway | Browser'};newnames={'Registered courtyard | court-paving-pale | Browser','Registered courtyard | court-paving-dark | Browser'}
def batches(j,acc,skip):
 result={}
 for mesh in j['meshes']:
  rows=[]
  for p in mesh['primitives']:
   name=j['materials'][p['material']]['name']
   if name in skip:continue
   material=j['materials'][p['material']];uses_uv=any(k.endswith('Texture') for k in material) or any(k.endswith('Texture') for k in material.get('pbrMetallicRoughness',{}))
   rows.append((name,{k:sha(acc(v).tobytes()) for k,v in p['attributes'].items() if k!='TEXCOORD_0' or uses_uv},sha(acc(p['indices']).tobytes())))
  if rows:result[mesh['name']]=rows
 return result
untouched=batches(bj,ba,oldnames);assert untouched==batches(nj,na,oldnames|newnames),'Unrelated batch changed'
O=np.array(s['frame']['origin']);D=np.array(s['frame']['forward']);A=np.array(s['frame']['south']);Y=s['frame']['floorY']
def uv(p):return np.stack(((p-O)@D,(p-O)@A),axis=-1)
regions=[]
for id in s['targets']:
 q=next(p for p in before['panels'] if p['id']==id);vs=np.array([[v['x'],v['y'],-v['z']] for v in q['vertices']]);points=vs[np.abs(vs[:,1]-Y)<1e-5];regions.append(Polygon(uv(points)).convex_hull)
region=unary_union(regions)
def collect(j,acc,names,check=False):
 polys=[];attributes=[];tris=0;normerr=uverr=0
 for mesh in j['meshes']:
  for p in mesh['primitives']:
   name=j['materials'][p['material']]['name']
   if name not in names:continue
   pos=acc(p['attributes']['POSITION']);ix=acc(p['indices']).reshape(-1,3)
   if check:
    expected=(uv(pos)-s['uvOrigin'])/s['textureSpanM'];actual=acc(p['attributes']['TEXCOORD_0']);error=np.max(np.abs(expected-actual));uverr=max(uverr,float(error));assert error<1e-5
    normals=acc(p['attributes']['NORMAL']);error=np.max(np.abs(normals-[0,1,0]));normerr=max(normerr,float(error));angle=np.degrees(np.arccos(np.clip(normals[:,1]/np.linalg.norm(normals,axis=1),-1,1)));assert np.max(angle)<.05
   for tri in pos[ix]:
    if not np.all(np.abs(tri[:,1]-Y)<1e-5):continue
    if np.cross(tri[1]-tri[0],tri[2]-tri[0])[1]<=1e-9:continue
    poly=Polygon(uv(tri)).intersection(region)
    if poly.area>1e-10:polys.append(poly);tris+=1
 return unary_union(polys),{'triangles':tris,'summedAreaM2':sum(p.area for p in polys),'maxUvError':uverr,'maxNormalError':normerr}
bpoly,bstat=collect(bj,ba,oldnames);npoly,nstat=collect(nj,na,newnames,True)
assert bpoly.area>300
pale_poly,_=collect(nj,na,{'Registered courtyard | court-paving-pale | Browser'})
for sample in s.get('aisle',{}).get('paleSamples',[]):assert pale_poly.distance(Point(sample['uv']))<1e-5,('Visible pale sample is outside pale finish',sample)

removed=bpoly.difference(npoly).area;added=npoly.difference(bpoly).area;overlap=nstat['summedAreaM2']-npoly.area
assert max(removed,added,overlap)<.001,(removed,added,overlap)
# Original material faces outside the replaced top patch must remain identical.
def retained_triangles(j,acc):
 result=[]
 for m in j['meshes']:
  for p in m['primitives']:
   name=j['materials'][p['material']]['name']
   if name not in oldnames:continue
   pos=acc(p['attributes']['POSITION']);norm=acc(p['attributes']['NORMAL']);tex=acc(p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else np.zeros((len(pos),2));ix=acc(p['indices']).reshape(-1,3)
   for indices in ix:
    tri=pos[indices]
    if np.all(np.abs(tri[:,1]-Y)<1e-5) and np.cross(tri[1]-tri[0],tri[2]-tri[0])[1]>1e-9 and Polygon(uv(tri)).intersection(region).area>1e-8:continue
    verts=[tuple(float(v) for v in np.r_[pos[i],norm[i],tex[i]]) for i in indices];rotations=[tuple(verts[k:]+verts[:k]) for k in range(3)];result.append((name,min(rotations)))
 return sorted(result)
assert retained_triangles(bj,ba)==retained_triangles(nj,na),'Old finish changed outside selected top patch'
report={'pass':True,'parentGlbSha256':sha(bb),'glbSha256':sha(nb),'layoutSha256':sha((candidate/'station-layout.json').read_bytes()),'nativePanelsExact':len(before['panels']),'allPhysicsRecordsExact':True,'oldMaterialsExact':len(before['authoredMaterials']),'newMaterials':2,'unaffectedBatchesRenderAttributesExact':len(untouched),'unusedUvsIgnored':'UV coordinates are ignored only when the material has no texture input; positions, normals and indices remain exact.','oldMaterialFacesOutsidePatchExact':True,'parentTop':bstat,'candidateTop':nstat,'palePhotoSamplesCovered':len(s.get('aisle',{}).get('paleSamples',[])),'coveredAreaM2':npoly.area,'removedAreaM2':removed,'addedAreaM2':added,'overlapAreaM2':overlap,'limitM2':.001,'meaning':'Finish-only geometry equivalence and metric UV proof. Does not establish visual realism, photographic dimensions or final gameplay/performance acceptance.'}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
