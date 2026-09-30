"""Fit the documented north lift bank into the constructed hotel and garage."""
import hashlib,json,math,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union

manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);B3=-12.31358299255371;U=5.5
bounds=[[34.7,43.7],[B3-.6,8.6],[-5.85,-2.35]];opening=box(34.7,-5.85,43.7,-2.35)
def clipped_area(vs):
 poly=[[v[k]for k in ['x','y','z']]for v in vs]
 for axis,(low,high)in enumerate(bounds):
  for bound,sign in [(low,1),(high,-1)]:
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
  area+=math.sqrt(sum(x*x for x in [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]))/2
 return area

retired=[];cuts={'concourse':bounds};slabs=[]
for p in layout['panels']:
 vs=p['vertices'];ranges=[[min(v[k]for v in vs),max(v[k]for v in vs)]for k in ['x','y','z']]
 if any(hi<=a+1e-5 or lo>=b-1e-5 for (lo,hi),(a,b)in zip(ranges,bounds)):continue
 if sum(clipped_area([vs[k]for k in p['triangles'][i:i+3]])for i in range(0,len(p['triangles']),3))<1e-7:continue
 if p['id']=='concourse':continue
 if all(lo>=a-1e-5 and hi<=b+1e-5 for (lo,hi),(a,b)in zip(ranges,bounds)):
  retired.append(p['id']);continue
 if p.get('uv'):
  assert p.get('normals');cuts[p['id']]=bounds;continue
 # The untextured garage slabs and Porta ceiling grid are flat prisms.
 top=ranges[1][1];faces=[]
 for i in range(0,len(p['triangles']),3):
  tri=[vs[k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-top)<1e-5 for v in tri):
   q=Polygon([(v['x'],v['z'])for v in tri])
   if q.area>1e-12:faces.append(q)
 before=unary_union(faces);after=before.difference(opening);assert before.is_valid and after.is_valid and not after.is_empty,p['id']
 pieces=list(after.geoms)if after.geom_type=='MultiPolygon'else[after]
 for i,shape in enumerate(pieces):
  slabs.append(dict(id=p['id']+'-'+str(i),shape=mapping(shape),top=top,bottom=ranges[1][0],appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']))
 retired.append(p['id'])
spec=dict(componentPrefix='granvia-parking-',parentLayoutSha256=m['layoutSha256'],lower=B3,upper=U,bankBounds=bounds,opening=mapping(opening),origins=[dict(x=x,y=B3,z=-4.1)for x in [36.2,42.2]],yaws=[-90,90],slabs=slabs,retiredIds=retired,retiredLights=[],modifiedFlightIds=[],modifiedPanelIds=list(cuts),cuts=cuts,wallCuts={k:v for k,v in cuts.items()if k!='concourse'},materials=[p for p in layout['authoredMaterials']if p['id']in{s['appearance']for s in slabs}])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n')
(out/'pit.json').write_text(json.dumps(dict(shaftBounds=dict(minX=34.7,maxX=43.7,minZ=-5.85,maxZ=-2.35),sharedFloorPanel='east-frontage-recess-floor'))+'\n')
print(dict(retired=len(retired),rebuiltSlabs=len(slabs),texturedCuts=len(cuts)-1))
