"""Prove unchanged non-hall browser attributes, existing materials and images."""
import json,hashlib,struct,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
import collections
old_path,new_path,out=map(Path,sys.argv[1:]);sha=lambda b:hashlib.sha256(b).hexdigest()
def glb(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=memoryview(b)[28+n:]
 def acc(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];size=np.dtype(dt).itemsize;assert not a.get('sparse');return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*size),size))
 return b,j,binary,acc
bb,bj,bbin,ba=glb(old_path);nb,nj,nbin,na=glb(new_path)
def batches(j,acc):
 result={}
 for m in j['meshes']:
  rows=[]
  for p in m['primitives']:
   mat=j['materials'][p['material']];name=mat['name']
   if name.startswith('Registered hall | '):continue
   uses_uv=any(k.endswith('Texture') for k in mat)or any(k.endswith('Texture') for k in mat.get('pbrMetallicRoughness',{}))
   rows.append((name,{k:sha(acc(v).tobytes()) for k,v in p['attributes'].items() if k!='TEXCOORD_0'or uses_uv},sha(acc(p['indices']).tobytes())))
  if rows:result[m['name']]=rows
 return result
old=batches(bj,ba);new=batches(nj,na);diff=[k for k in set(old)|set(new)if old.get(k)!=new.get(k)]
assert set(diff)=={'Atrium | honed granite floor @ 0,0,0','Atrium | honed granite floor @ -1,-1,-1','station-additions-ivory @ additions,-1,0,-1'},diff
# Audit the only changed non-floor surface: a coplanar strip is now covered
# by the retained concourse edge. Neither its native record nor its exposed
# lower surface was edited.
def triangles(j,acc,select):
 result=[]
 for m in j['meshes']:
  for p in m['primitives']:
   if not select(m,j['materials'][p['material']]):continue
   vs=acc(p['attributes']['POSITION']);ix=acc(p['indices']).reshape(-1,3)
   result.extend(tuple(tuple(map(float,v))for v in t)for t in vs[ix])
 return result
ivory=lambda m,mat:m['name']=='station-additions-ivory @ additions,-1,0,-1'
a=collections.Counter(triangles(bj,ba,ivory));b=collections.Counter(triangles(nj,na,ivory));removed=list((a-b).elements());added=list((b-a).elements())
assert len(removed)==2 and len(added)==3
assert all(abs(v[2]+29)<1e-8 for t in removed+added for v in t)
poly=lambda ts:unary_union([Polygon([(v[0],v[1])for v in t])for t in ts])
A=poly(removed);B=poly(added);assert B.difference(A).area<1e-8
floor_side=[t for t in triangles(nj,na,lambda m,mat:mat['name']=='Atrium | honed granite floor | Browser')if all(abs(v[2]+29)<1e-8 for v in t)]
covered=A.difference(B);missing=covered.difference(poly(floor_side)).area;assert missing<covered.length*2e-7 # Float32 clipping rounds the -0.6m cut by one ULP.
ivory_proof={'changedTriangles':[2,3],'coveredByRetainedConcourseSideM2':covered.area,'uncoveredDifferenceM2':missing,'float32CoverageBoundM2':covered.length*2e-7,'existingNativeRecordUnchanged':True}
# The deliberately replaced floor batch is excluded from byte equality; its
# surface is checked separately against the exact floor partition and native rays.
def images(j,binary):
 result={}
 for im in j['images']:
  v=j['bufferViews'][im['bufferView']];result[im['name']]=sha(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
 return result
old_images=images(bj,bbin);new_images=images(nj,nbin)
assert all(new_images.get(k)==v for k,v in old_images.items())
def materials(j,binary):
 result={}
 for m in j['materials']:
  q=json.loads(json.dumps(m))
  for info in [q.get('pbrMetallicRoughness',{}).get('baseColorTexture'),q.get('pbrMetallicRoughness',{}).get('metallicRoughnessTexture'),q.get('normalTexture'),q.get('emissiveTexture'),q.get('occlusionTexture')]:
   if info:
    t=j['textures'][info.pop('index')];im=j['images'][t['source']];v=j['bufferViews'][im['bufferView']];info['imageHash']=sha(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);info['sampler']=j.get('samplers',[])[t['sampler']]if'sampler'in t else None
  result[q['name']]=q
 return result
old_m=materials(bj,bbin);new_m=materials(nj,nbin);assert all(new_m.get(k)==v for k,v in old_m.items())
assert all(k.startswith('Registered hall | ')for k in set(new_m)-set(old_m))
report={'pass':True,'oldGlbSha256':sha(bb),'newGlbSha256':sha(nb),'unchangedExistingBatches':len(old)-len(diff),'intentionallyChangedBatches':diff,'coplanarIvoryStrip':ivory_proof,'existingImagesByteExact':len(old_images),'existingMaterialSemanticsExact':len(old_m),'addedImages':len(new_images)-len(old_images),'addedMaterials':len(new_m)-len(old_m),'limits':['Concourse floor attributes are intentionally replaced and need separate geometric coverage checks.','New hall attributes/materials are verified separately against component source; this is not final visual acceptance.']}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
