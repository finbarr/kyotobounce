"""Cut the public Hachijo lift through both landings and the railway subgrade."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve()in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
opening=dict(minX=155.6,maxX=158.8,minZ=-133.6,maxZ=-130.65);hole=box(155.6,-133.6,158.8,-130.65)
def triangles(p):return [[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)]
def top(p):
 y=max(v['y']for v in p['vertices']);return unary_union([Polygon([(v['x'],v['z'])for v in t])for t in triangles(p)if all(abs(v['y']-y)<1e-6 for v in t)])
ids=['subway-passage-foyer-floor','subway-passage-south-lobby-floor','subway-passage-south-ceiling','east-transfer-rebuilt-railway-railway-subgrade-0'];slabs=[]
for id in ids:
 p=panels[id];q=top(p);kept=q.difference(hole);assert abs(q.area-kept.area-hole.area)<.001;assert kept.geom_type=='Polygon'and kept.is_valid
 slabs.append(dict(id=id,shape=mapping(kept),originalShape=mapping(q),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role']))
# Check neighboring geometry by triangle/prism intersection, including upright faces.
def intersects(t):
 poly=[[v[k]for k in ('x','y','z')]for v in t]
 for axis,bound,sign in [(0,155.6,1),(0,158.8,-1),(1,-6.7,1),(1,3.05,-1),(2,-133.6,1),(2,-130.65,-1)]:
  kept=[]
  for i,a in enumerate(poly):
   b=poly[(i+1)%len(poly)];da=sign*(a[axis]-bound);db=sign*(b[axis]-bound)
   if da>=0:kept.append(a)
   if (da>=0)!=(db>=0):
    u=da/(da-db);kept.append([x+(y-x)*u for x,y in zip(a,b)])
  poly=kept
 for i in range(1,len(poly)-1):
  a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)];cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
  if sum(x*x for x in cross)>1e-12:return True
 return False
for p in layout['panels']:
 if p['id']in ids:continue
 vs=p['vertices']
 if min(v['x']for v in vs)>158.8 or max(v['x']for v in vs)<155.6 or min(v['z']for v in vs)>-130.65 or max(v['z']for v in vs)<-133.6:continue
 assert not any(intersects(t)for t in triangles(p)),p['id']
spec=dict(parentLayoutSha256=m['layoutSha256'],opening=opening,retiredIds=ids,retiredLights=[],slabs=slabs,materials=[p for p in layout['authoredMaterials']if p['id']in {s['appearance']for s in slabs}],centerX=157.2,centerZ=-132,lower=-6.2,upper=0)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print(dict(retiredIds=ids,holeArea=hole.area,unrelatedShaftSurfacesClear=True))
