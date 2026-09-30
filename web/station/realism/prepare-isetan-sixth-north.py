"""Connect the northern 6F landing and extend the existing lift by one stop."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];l=json.loads(raw);panels={p['id']:p for p in l['panels']}
old_lift=next(v for v in l['lifts']if v['id']=='isetan-north-lift');assert len(old_lift['stops'])==8
X,Z=old_lift['origin']['x'],old_lift['origin']['z'];F=max(v['y']for v in panels['isetan-sixth-west-north-floor-04']['vertices']);C=29.;G=old_lift['origin']['y']+old_lift['stops'][-1]['height'];old_top=max(v['y']for v in panels['isetan-north-core-shaft-back']['vertices'])
hole=box(X-1.6,Z-1.6,X+1.6,Z+1.35)
def top_shape(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
landing=top_shape(panels['north-escalator-upper-landing']);a,b=-97.9,-96.5
edge=lambda x:18.306690216064453+(x+98.77769470214844)*(18.10002326965332-18.306690216064453)/(-96.42921447753906+98.77769470214844)
portal=[[a,edge(a)+.12],[b,edge(b)+.12]];hall=Polygon([[a,edge(a)-.08],[b,edge(b)-.08],[b,21.08],[a,21.08]])
retired=['isetan-north-core-core-roof','isetan-north-core-front-head','isetan-sixth-perimeter-8'];slabs=[]
for id in ['isetan-sixth-west-north-floor-04','isetan-sixth-isetan-fifth-ceiling']:
 p=panels[id];before=top_shape(p);after=before.difference(hole);assert after.is_valid and after.geom_type=='Polygon' and abs(before.intersection(hole).area-hole.area)<.001
 slabs.append(dict(id=id,original=mapping(before),shape=mapping(after),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],role=p['role'],material=p['material'],collision=p['collision']));retired.append(id)
existing=unary_union([top_shape(p)for p in l['panels']if p['role']in ('floor','building-floor','landing')and abs(max(v['y']for v in p['vertices'])-F)<1e-5]);infill=hall.difference(existing);assert infill.geom_type=='Polygon'
volumes=[[[a-.12,b+.12],[F-.04,C],[min(p[1]for p in portal),21.09]]]
def clipped_area(vs,bounds):
 poly=[[v[k]for k in ('x','y','z')]for v in vs]
 for axis,(low,high)in enumerate(bounds):
  for bound,sign in [(low,1),(high,-1)]:
   kept=[]
   for i,a in enumerate(poly):
    b=poly[(i+1)%len(poly)];da=sign*(a[axis]-bound);db=sign*(b[axis]-bound)
    if da>=0:kept.append(a)
    if (da>=0)!=(db>=0):
     t=da/(da-db);kept.append([x+(y-x)*t for x,y in zip(a,b)])
   poly=kept
 area=0
 for i in range(1,len(poly)-1):
  a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)];cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];area+=sum(v*v for v in cross)**.5/2
 return area
cuts={}
for p in l['panels']:
 if not p['id'].startswith('west-north-')or p['id']in retired:continue
 bounds=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
 if any(bounds[i][1]<=volumes[0][i][0]or bounds[i][0]>=volumes[0][i][1]for i in range(3)):continue
 ts=[[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)];amount=sum(clipped_area(t,volumes[0])for t in ts)
 if amount<1e-7:continue
 total=sum(clipped_area(t,[(a-.01,b+.01)for a,b in bounds])for t in ts)
 if abs(total-amount)<1e-6:retired.append(p['id'])
 else:cuts[p['id']]=volumes
used={p['appearance']for p in slabs}
spec=dict(componentPrefix='isetan-sixth-north-',parentLayoutSha256=m['layoutSha256'],origin=old_lift['origin'],oldLift=old_lift,floor=F,lowerFloor=G,ceiling=C,oldTop=old_top,opening=mapping(hole),hall=mapping(hall),portal=portal,infill=mapping(infill),infillArea=infill.area,slabs=slabs,retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],retiredRouteIds=[],retiredLabelIds=[],retiredLights=[],retiredLiftIds=[old_lift['id']],modifiedFlightIds=[],preservedIds=['north-escalator-upper-landing'],cuts=cuts,cutVolumes=volumes,materials=[r for r in l['authoredMaterials']if r['id']in used])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n');print(dict(retired=len(retired),cuts=len(cuts),infill=infill.area,floor=F))
