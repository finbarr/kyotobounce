"""Exact triangle half-space clipping for closed source solids."""
import numpy as np
from shapely.geometry import Polygon
from shapely import constrained_delaunay_triangles

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

