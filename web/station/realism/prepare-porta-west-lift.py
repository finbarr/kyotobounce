"""Fit the Porta west lift beside its cross-passage and through the retained forecourt paving."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,Point,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
X,Z=22,45
opening=dict(minX=X-1.6,maxX=X+1.6,minZ=Z-1.6,maxZ=Z+1.35);hole=box(opening["minX"],opening["minZ"],opening["maxX"],opening["maxZ"])
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
for id in ['porta-plaza-deck','porta-plaza-ceiling']:
 p=panels[id];old=top(p);q=old.difference(hole);assert abs(old.area-q.area-hole.area)<1e-4;assert q.geom_type=='Polygon'and q.is_valid
 slabs.append(dict(id=id,shape=mapping(q),originalShape=mapping(old),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']));retired.append(id)
# Clip actual triangles against the shaft volume, including vertical faces.
def prism_area(t):
 poly=[[v[k]for k in ('x','y','z')]for v in t]
 for axis,bound,sign in [(0,X-1.6,1),(0,X+1.6,-1),(1,-6.7,1),(1,3.1,-1),(2,Z-1.6,1),(2,Z+1.35,-1)]:
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
 if min(v['x']for v in vs)>X+1.6 or max(v['x']for v in vs)<X-1.6 or min(v['z']for v in vs)>Z+1.35 or max(v['z']for v in vs)<Z-1.6:continue
 for t in triangles(p):
  if min(v['y']for v in t)>3.1 or max(v['y']for v in t)<-6.7:continue
  if prism_area(t)>1e-7:conflicts.append(p['id']);break
assert not conflicts,conflicts
spec=dict(parentLayoutSha256=m['layoutSha256'],opening=opening,retiredIds=retired,retiredLights=[],modifiedPaving=plaza['id'],slabs=slabs,materials=[p for p in layout['authoredMaterials']if p['id']in {s['appearance']for s in slabs}],componentPrefix='porta-west-lift-',centerX=X,centerZ=Z,origin=dict(x=X,y=-6.2,z=Z),lower=-6.2,upper=height(X,Z-1.6),frontEdge=[height(x,Z-1.6)for x in [X-1.6,X+1.6]],forecourtRoute=[dict(x=x,y=height(x,z),z=z)for x,z in [(X,Z-3),(X,35),(32,30)]])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print({k:spec[k]for k in ['retiredIds','upper','frontEdge','forecourtRoute']})
