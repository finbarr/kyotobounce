"""Open the retained 5F doorway and fit a store hall plus stacked escalators."""
import hashlib,json,sys,math
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw);assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
panels={p['id']:p for p in layout['panels']};F=max(v['y']for v in panels['west-south-floor-03']['vertices']);G=max(v['y']for v in panels['isetan-escalators-west-south-floor-02']['vertices']);C=24.25
room=[[-118.6,-28],[-81.7,-28],[-81.7,-3.24],[-84.55,-3.62],[-84.55,-8],[-101.5,-8],[-101.5,24.5],[-85,24.5],[-85,34],[-118.6,34]]
volumes=[[[-118.8,-81.65],[F-.04,C],[-28.2,-8]],[[-118.8,-101.5],[F-.04,C],[-8,24.5]],[[-118.8,-84.8],[F-.04,C],[24.5,34.2]],[[-84.65,-81.65],[F-.04,C],[-8,-3.57]]]
for i,a in enumerate(volumes):
 for b in volumes[i+1:]:assert any(a[k][1]<=b[k][0]or b[k][1]<=a[k][0]for k in range(3))
template=next(e for e in layout['escalators']if e['id']=='hall-basement-west-escalator-1');chassis=[p for p in layout['panels']if p['id'].startswith(template['id']+'-')]
prior=json.loads(Path('.local/v2/current/components/isetan-escalators/spec.json').read_text());half=prior['pitHalfWidth'];back=prior['pitBack'];run=(F-G)/math.tan(math.pi/6)
banks=[dict(name=name,lowerCenter=dict(x=-104,y=G,z=z),uphill=dict(x=1,y=0,z=0),run=run,height=F-G,flatLength=template['flatLength'],speed=speed)for name,z,speed in [('up',-20,.5),('down',-17,-.5)]]
upper=[box(-104+back,z-half,-104+run-back,z+half)for z in [-20,-17]];ceiling=[box(-104+back-.1,z-.72,-104+run-back+.1,z+.72)for z in [-20,-17]]
def top_shape(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
slabs=[];retired=['west-south-5f-landing-door-leaf-2-0','west-south-5f-landing-door-meeting-stile-2-0']+[id for id in panels if id.startswith(('isetan-escalators-up-well-west-','isetan-escalators-down-well-west-'))]
for id,holes in [('west-south-floor-03',upper),('isetan-fourth-ceiling',ceiling)]:
 p=panels[id];shape=top_shape(p);cut=unary_union(holes);kept=shape.difference(cut);assert kept.is_valid and kept.geom_type=='Polygon' and cut.difference(shape).area<1e-8
 slabs.append(dict(id=id,shape=mapping(kept),original=mapping(shape),cut=mapping(cut),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']));retired.append(id)
# Preserve the source door frame and use its opening instead of inventing a door.
preserved=['west-north-floor-03','west-south-5f-landing-door-head-2-0','west-south-5f-landing-door-jamb--1-2-0','west-south-5f-landing-door-jamb-1-2-0']
def clipped_area(vs,bounds):
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
  a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)];cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];area+=sum(x*x for x in cross)**.5/2
 return area

cuts={}
for p in layout['panels']:
 if p['id']in retired+preserved:continue
 if not(p['id'].startswith(('west-north-','west-south-'))or p['id'].startswith(('isetan-ground-','isetan-fourth-'))and p.get('role')=='foundation'or p['id'].startswith('north-side-')and p.get('role')=='parapet'):continue
 b=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')];possible=[v for v in volumes if all(a<hi and z>lo for(a,z),(lo,hi)in zip(b,v))]
 if not possible:continue
 triangles=[[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)]
 amounts=[sum(clipped_area(t,v)for t in triangles)for v in possible];selected=[v for v,area in zip(possible,amounts)if area>1e-7]
 if not selected:continue
 total=sum(clipped_area(t,[(a-.01,z+.01)for a,z in b])for t in triangles)
 if abs(total-sum(amounts))<1e-6:retired.append(p['id'])
 else:cuts[p['id']]=selected
landing=next(f for f in layout['flights']if f['id']=='daikaidan-landing-02');a,b=[row['points'][-1]for row in landing['contours']]
def edge_z(x):return a['y']+(b['y']-a['y'])*(x-a['x'])/(b['x']-a['x'])
approach=[[-83.7,-3.8],[-82.25,-3.8],[-82.25,edge_z(-82.25)],[-83.7,edge_z(-83.7)]]
a,b=landing['contours'][0]['points'],landing['contours'][-1]['points'];landing_shape=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
footprint=unary_union([Polygon(room),Polygon(approach)]);floor_ids=['west-north-floor-03','west-south-floor-03'];retained_floor=unary_union([top_shape(panels[id])for id in floor_ids]+[landing_shape]);infill=footprint.difference(retained_floor);parts=list(infill.geoms)if infill.geom_type=='MultiPolygon'else[infill]
# No generated foundation may cross the intended hall. Existing converted
# foundation panels are trimmed by the same declared room volumes above.
for f in layout['flights']:
 if not f.get('foundationDepth'):continue
 a,b=f['contours'][0]['points'],f['contours'][-1]['points'];fp=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
 assert f['baseElevation']-.31<=F or fp.intersection(footprint).area<1e-8,('Unresolved generated foundation',f['id'])
used={p['appearance']for p in slabs+chassis}
spec=dict(componentPrefix='isetan-fifth-',parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],modifiedFlightIds=[],retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,cutVolumes=volumes,floor=F,lowerFloor=G,ceiling=C,room=room,approach=approach,landingId=landing['id'],preservedIds=preserved,retainedFloorIds=floor_ids,infill=[dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in parts if p.area>1e-8],infillArea=infill.area,slabs=slabs,banks=banks,template=template,chassis=chassis,materials=[r for r in layout['authoredMaterials']if r['id']in used],pitHalfWidth=half,pitBack=back,retainedEscalatorIds=['isetan-escalators-up','isetan-escalators-down'])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n');print(dict(retired=len(retired),cuts=len(cuts),infillArea=infill.area,floor=F,rise=F-G))
