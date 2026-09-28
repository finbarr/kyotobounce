"""Check that courtyard construction leaves unrelated browser batches intact."""
import json,hashlib,struct,sys,collections
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
old_path,new_path,out=map(Path,sys.argv[1:]);sha=lambda b:hashlib.sha256(b).hexdigest()
def glb(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=memoryview(b)[28+n:]
 def acc(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];size=np.dtype(dt).itemsize;assert not a.get('sparse');return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*size),size))
 return b,j,binary,acc
bb,bj,bbin,ba=glb(old_path);nb,nj,nbin,na=glb(new_path)
shared={'east-court-warm-granite','niwa-planter-concrete','niwa-white-gravel','court-paving-pale','court-paving-dark'}
added={'court-dining-metal','court-umbrella-canvas','court-tree-bark','court-leaf-deep','court-leaf-green','court-leaf-light','court-leaf-russet'}
labels=lambda names:{'Registered courtyard | '+n+' | Browser' for n in names}
def batches(j,acc,skip):
 result={}
 for m in j['meshes']:
  rows=[]
  for p in m['primitives']:
   mat=j['materials'][p['material']];name=mat['name']
   if name in skip:continue
   uses_uv=any(k.endswith('Texture') for k in mat) or any(k.endswith('Texture') for k in mat.get('pbrMetallicRoughness',{}))
   rows.append((name,{k:sha(acc(v).tobytes()) for k,v in p['attributes'].items() if k!='TEXCOORD_0' or uses_uv},sha(acc(p['indices']).tobytes())))
  if rows:result[m['name']]=rows
 return result
# Replacing the terrace removes two micrometre-scale floor cut slivers at
# the common cafe threshold. Prove coverage for this one changed floor batch.
seam_name='Registered courtyard | niwa-grey-granite @ 0,0,0'
old=batches(bj,ba,labels(shared));new=batches(nj,na,labels(shared|added));diff=[k for k in set(old)|set(new) if old.get(k)!=new.get(k)];assert set(diff)<={seam_name},diff
def triangles(j,acc):
 p=next(m for m in j['meshes'] if m['name']==seam_name)['primitives'][0];data=np.concatenate([acc(p['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']],axis=1);ix=acc(p['indices']).reshape(-1,3)
 return collections.Counter(tuple(tuple(map(float,v)) for v in t) for t in data[ix])
a,b=triangles(bj,ba),triangles(nj,na);removed=list((a-b).elements());added_triangles=list((b-a).elements())
for t in removed+added_triangles:
 assert all(abs(v[1]-31.6)<1e-5 and v[3:6]==(0.,1.,0.) for v in t),t
A=unary_union([Polygon([(v[0],v[2]) for v in t]) for t in removed]);B=unary_union([Polygon([(v[0],v[2]) for v in t]) for t in added_triangles]);seam_error=A.symmetric_difference(B).area;assert seam_error<.001,seam_error
seam={'batch':seam_name,'unchangedTriangles':sum((a&b).values()),'removedTriangles':len(removed),'addedTriangles':len(added_triangles),'symmetricCoverageErrorM2':seam_error,'limitM2':.001,'normalsExact':True,'attributeCheck':'UVs independently checked against the NIWA source component.'}

assert {m['name'] for m in nj['materials']}-{m['name'] for m in bj['materials']}==labels(added)
def images(j,binary):
 out={}
 for im in j['images']:
  v=j['bufferViews'][im['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];assert im['name'] not in out;out[im['name']]=sha(data)
 return out
assert images(bj,bbin)==images(nj,nbin),'An existing texture changed or a new image appeared'
result={'pass':True,'parentGlbSha256':sha(bb),'glbSha256':sha(nb),'unaffectedBatchesRenderAttributesExact':len(old)-len(diff),'thresholdFloorRetriangulation':seam,'imagesByteExact':len(bj['images']),'addedMaterialNames':sorted(added),'sharedMaterialsExcludedFromBatchEquality':sorted(shared),'unusedUvsIgnored':'Only for materials with no texture input. Positions, normals and indices remain exact.','meaning':'Scope proof for unrelated batches and all texture images. New and shared material geometry needs separate source-attribute and route checks.'};out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
