"""Fit the Exit 5 shaft to the public corridor and retained paving surface."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,Point,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
opening=dict(minX=146,maxX=149.2,minZ=38.2,maxZ=41.15);hole=box(146,38.2,149.2,41.15)
def triangles(p):return [[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)]
def top(p):
 y=max(v['y']for v in p['vertices']);return unary_union([Polygon([(v['x'],v['z'])for v in t])for t in triangles(p)if all(abs(v['y']-y)<1e-6 for v in t)])
plaza=panels['municipal-plaza-642152272'];ground=unary_union([Polygon([(v['x'],v['z'])for v in t])for t in triangles(plaza)]);assert hole.difference(ground).area<1e-5
def height(x,z):
 for t in triangles(plaza):
  q=Polygon([(v['x'],v['z'])for v in t])
  if q.area<1e-9 or not q.buffer(1e-8).covers(Point(x,z)):continue
  a,b,c=t;den=(b['z']-c['z'])*(a['x']-c['x'])+(c['x']-b['x'])*(a['z']-c['z']);u=((b['z']-c['z'])*(x-c['x'])+(c['x']-b['x'])*(z-c['z']))/den;v=((c['z']-a['z'])*(x-c['x'])+(a['x']-c['x'])*(z-c['z']))/den
  return u*a['y']+v*b['y']+(1-u-v)*c['y']
 raise AssertionError(('No paving at',x,z))
retired=[];slabs=[]
for id in ['porta-east-public-extension-floor','porta-east-public-extension-ceiling']:
 p=panels[id];q=top(p).union(box(145.85,35.7,147,41.3)).difference(hole);assert q.geom_type=='Polygon'and q.is_valid
 slabs.append(dict(id=id,shape=mapping(q),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role']));retired.append(id)
retired.append('porta-east-public-extension-wall-147');assert retired[-1]in panels
# Clip actual triangles against the shaft volume, including vertical faces.
def prism_area(t):
 poly=[[v[k]for k in ('x','y','z')]for v in t]
 for axis,bound,sign in [(0,146,1),(0,149.2,-1),(1,-6.7,1),(1,2.7,-1),(2,38.2,1),(2,41.15,-1)]:
  kept=[]
  for i,a in enumerate(poly):
   b=poly[(i+1)%len(poly)];da=sign*(a[axis]-bound);db=sign*(b[axis]-bound)
   if da>=0:kept.append(a)
   if (da>=0)!=(db>=0):
    u=da/(da-db);kept.append([x+(y-x)*u for x,y in zip(a,b)])
  poly=kept
 area=0
 for i in range(1,len(poly)-1):
  a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)]
  cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];area+=sum(x*x for x in cross)**.5/2
 return area
conflicts=[]
for p in layout['panels']:
 if p['id']in retired+[plaza['id']]:continue
 vs=p['vertices']
 if min(v['x']for v in vs)>149.2 or max(v['x']for v in vs)<146 or min(v['z']for v in vs)>41.15 or max(v['z']for v in vs)<38.2:continue
 for t in triangles(p):
  if min(v['y']for v in t)>2.7 or max(v['y']for v in t)<-6.7:continue
  if prism_area(t)>1e-7:conflicts.append(p['id']);break
assert not conflicts,conflicts
spec=dict(parentLayoutSha256=m['layoutSha256'],opening=opening,retiredIds=retired,retiredLights=[],modifiedPaving=plaza['id'],slabs=slabs,materials=[p for p in layout['authoredMaterials']if p['id']in {s['appearance']for s in slabs}],centerX=147.6,centerZ=39.8,lower=-6.2,upper=height(147.6,38.2),frontEdge=[height(x,38.2)for x in [146,149.2]],forecourtRoute=[dict(x=x,y=height(x,z),z=z)for x,z in [(147.6,36.8),(147.6,33),(141,28)]])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print({k:spec[k]for k in ['retiredIds','upper','frontEdge','forecourtRoute']})
