"""Clip original metal triangles at explicit planes, preserving their triangulation."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely import constrained_delaunay_triangles
profilep,lanep,nativep,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=True);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();spec=load(profilep);lanes=load(lanep);native=load(nativep)

def closed(vs,fs):
 edges={};vol=0
 for tri in fs:
  a,b,c=vs[tri];vol+=a@np.cross(b,c)/6
  for a,b in zip(tri,np.roll(tri,-1)):edges.setdefault(tuple(sorted([int(a),int(b)])),[]).append((int(a),int(b)))
 assert all(len(e)==2 and e[0]==e[1][::-1]for e in edges.values()),[(k,e)for k,e in edges.items()if len(e)!=2 or e[0]!=e[1][::-1]][:4]
 assert vol>1e-9,vol
 return float(vol)

def clip(vertices,faces,axis,value,keepAbove):
 if len(faces)==0:return vertices,faces
 signed=(vertices[:,axis]-value)*(1 if keepAbove else -1)
 if min(signed)>=-1e-10:return vertices,faces
 if max(signed)<=1e-10:return np.empty((0,3)),np.empty((0,3),dtype=int)
 outV=[];outF=[];lookup={};intersections={}
 def index(p):
  key=tuple(round(float(x),9)for x in p)
  if key not in lookup:lookup[key]=len(outV);outV.append(np.array(p))
  return lookup[key]
 for tri in faces:
  poly=[]
  for i,j in zip(tri,np.roll(tri,-1)):
   a,b=vertices[i],vertices[j];da,db=signed[i],signed[j]
   if da>=-1e-10:poly.append(a)
   if (da>1e-10 and db< -1e-10)or(da< -1e-10 and db>1e-10):
    key=tuple(sorted([int(i),int(j)]))
    if key not in intersections:
     p=a+(b-a)*(da/(da-db));p[axis]=value;intersections[key]=p
    poly.append(intersections[key])
  ids=[index(p)for p in poly];ids=[i for k,i in enumerate(ids)if i!=ids[k-1]]
  if len(ids)>=3:
   for i in range(1,len(ids)-1):outF.append([ids[0],ids[i],ids[i+1]])
 if not outF:return np.empty((0,3)),np.empty((0,3),dtype=int)
 edges={}
 for tri in outF:
  for a,b in zip(tri,tri[1:]+tri[:1]):edges.setdefault(tuple(sorted([a,b])),[]).append((a,b))
 boundary=[es[0]for es in edges.values()if len(es)==1];nexts={a:b for a,b in boundary};assert len(nexts)==len(boundary)
 loops=[]
 while nexts:
  first=min(nexts);cur=first;loop=[]
  while True:
   loop.append(cur);cur=nexts.pop(cur)
   if cur==first:break
  assert len(loop)>=3 and max(abs(outV[i][axis]-value)for i in loop)<1e-8
  loops.append(loop)
 axes=[i for i in range(3)if i!=axis];polys=[Polygon([[outV[i][k]for k in axes]for i in loop])for loop in loops];
 for polygon in polys:
  if not polygon.is_valid:
   from shapely.validation import explain_validity
   print('INVALID CLIP',axis,value,keepAbove,explain_validity(polygon),polygon.wkt,flush=True)
 assert all(p.is_valid for p in polys)
 depths=[sum(p.contains(q)for j,p in enumerate(polys)if j!=i)for i,q in enumerate(polys)]
 for i,p in enumerate(polys):
  if depths[i]%2:continue
  holes=[polys[j].exterior.coords for j in range(len(polys))if depths[j]==depths[i]+1 and p.contains(polys[j])]
  filled=Polygon(p.exterior.coords,holes)
  for triangle in constrained_delaunay_triangles(filled).geoms:
   ids=[]
   for coords in list(triangle.exterior.coords)[:3]:
    q=np.zeros(3);q[axis]=value
    for k,x in zip(axes,coords):q[k]=x
    ids.append(index(q))
   a,b,c=[outV[j]for j in ids];normal=np.cross(b-a,c-a);desired=-1 if keepAbove else 1
   if normal[axis]*desired<0:ids.reverse()
   outF.append(ids)
 v=np.array(outV);f=np.array(outF,dtype=int);closed(v,f);return v,f

receipts=[]
for core in spec.pop('metalCores'):
 bank=next(b for b in lanes['banks']if b['name']==core['bank']);U=np.array(bank['uphillRenderer']);R=np.array([-U[2],0,U[0]]);O=np.array(bank['lowerCenterRenderer']);O[1]=0
 original=np.array(core['vertices']);v=np.column_stack(((original-O)@U,original[:,1],(original-O)@R));f=np.array(core['indices']).reshape((-1,3));cuts=[];bands=[]
 for lane in [e for e in native['escalators']if core['bank']in e['id']]:
  p=np.array([lane['lowerCenter']['x'],0,-lane['lowerCenter']['z']]);w=float((p-O)@R);half=lane['width']/2+.05;z0=-lane['flatLength']-.71;z1=lane['run']+lane['flatLength']+.71
  assert min(v[:,0])>z0 and max(v[:,0])<z1 and min(v[:,1])>-8 and max(v[:,1])<3
  cuts.append(dict(kind='tread-and-casing-clearance',lane=lane['id'],along=[z0,z1],lateral=[w-half,w+half],y=[-8,3]))
 cuts.sort(key=lambda c:c['lateral'][0]);bands=[(-2,cuts[0]['lateral'][0]),(cuts[0]['lateral'][1],cuts[1]['lateral'][0]),(cuts[1]['lateral'][1],2)]
 count=0;total=0
 for wi,(lo,hi)in enumerate(bands):
  cv,cf=clip(v,f,2,lo,True);cv,cf=clip(cv,cf,2,hi,False)
  if not len(cf):continue
  volume=closed(cv,cf);total+=volume;world=O+cv[:,0,None]*U+cv[:,2,None]*R;world[:,1]=cv[:,1]
  spec['meshes'].append(dict(id=core['id']+f'-{wi}',sourceMetalCoreId=core['id'],vertices=world.tolist(),indices=cf.flatten().tolist(),material='steel',role='hall-basement-steel-trim',sourceFaces=core['sourceFaces'],booleanCuts=cuts,volumeM3=volume,method='Original-triangle half-space clipping and planar constrained triangulation; source curved profiles are preserved.'))
  count+=1
 receipts.append(dict(id=core['id'],inputVolumeM3=core['volumeM3'],outputVolumeM3=total,closedRegions=count,cuts=cuts))
spec['metalTrimInputs']={str(p):sha(p)for p in [profilep,lanep,nativep]};spec['limits'].append('Metal retains original triangle planes and is clipped only to the two existing moving-casing lanes. Existing flat landing infills must exclude retained source metal plate coverage.')
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'clip-receipt.json').write_text(json.dumps(dict(inputs=spec['metalTrimInputs'],banks=receipts),indent=2)+'\n');print(json.dumps(receipts,indent=2))
