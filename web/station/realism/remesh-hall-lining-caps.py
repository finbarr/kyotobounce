"""Retriangulate exact cut caps with uniformly subdivided boundary edges."""
import json,sys,hashlib,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely import constrained_delaunay_triangles
from closed_mesh_clip import closed
src,out=map(Path,sys.argv[1:]);out.mkdir();s=json.loads(src.read_text());v=[np.array(p)for p in s['vertices']];f=np.array(s['indices']).reshape(-1,3).tolist();original=len(f);rows=[]
for y in s['clipWorldY']:
 f=[tri for tri in f if max(abs(v[k][1]-y)for k in tri)>1e-8]
 edges={}
 for tri in f:
  for a,b in zip(tri,tri[1:]+tri[:1]):edges.setdefault(tuple(sorted([a,b])),[]).append((a,b))
 boundary=[e[0]for e in edges.values()if len(e)==1];assert all(max(abs(v[k][1]-y)for k in edge)<1e-8 for edge in boundary)
 subdivisions={}
 for a,b in boundary:
  count=math.ceil(np.linalg.norm(v[b]-v[a])/.5);ids=[a]
  for k in range(1,count):ids.append(len(v));v.append(v[a]+(v[b]-v[a])*(k/count))
  ids.append(b);subdivisions[(a,b)]=ids
 nf=[]
 for tri in f:
  split=False
  for i in range(3):
   a,b,c=tri[i],tri[(i+1)%3],tri[(i+2)%3]
   if (a,b)in subdivisions:
    ids=subdivisions[(a,b)];nf.extend([[u,w,c]for u,w in zip(ids,ids[1:])]);split=True;break
  if not split:nf.append(tri)
 f=nf;nexts={}
 for ids in subdivisions.values():
  for a,b in zip(ids,ids[1:]):nexts[a]=b
 loops=[]
 while nexts:
  first=min(nexts);cur=first;loop=[]
  while True:
   loop.append(cur);cur=nexts.pop(cur)
   if cur==first:break
  loops.append(loop)
 polys=[Polygon([[v[k][0],v[k][2]]for k in loop])for loop in loops];assert all(p.is_valid for p in polys)
 depths=[sum(p.contains(q)for j,p in enumerate(polys)if i!=j)for i,q in enumerate(polys)]
 lookup={tuple(np.round(p[[0,2]],9)):i for i,p in enumerate(v)if abs(p[1]-y)<1e-8};capcount=0
 for i,p in enumerate(polys):
  if depths[i]%2:continue
  poly=Polygon(p.exterior.coords,[q.exterior.coords for j,q in enumerate(polys)if depths[j]==depths[i]+1 and p.contains(q)])
  for t in constrained_delaunay_triangles(poly).geoms:
   ids=[lookup[tuple(np.round(p,9))]for p in list(t.exterior.coords)[:3]];a,b,c=[v[k]for k in ids];ny=np.cross(b-a,c-a)[1];desired=1 if y==max(s['clipWorldY'])else -1
   if ny*desired<0:ids.reverse()
   f.append(ids);capcount+=1
 rows.append(dict(y=y,boundaryEdges=sum(len(ids)-1 for ids in subdivisions.values()),capTriangles=capcount))
v=np.array(v);f=np.array(f);volume=closed(v,f);assert abs(volume-s['volumeM3'])<1e-8
s['vertices']=v.tolist();s['indices']=f.flatten().tolist();s['capRemesh']=dict(input=str(src),sha256=hashlib.sha256(src.read_bytes()).hexdigest(),originalTriangles=original,finalTriangles=len(f),maximumBoundaryEdgeM=.5,planes=rows,decision='Boundary interpolation and constrained planar triangulation. Original surface planes, solid volume and boundary geometry preserved.')
(out/'spec.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s['capRemesh']))
