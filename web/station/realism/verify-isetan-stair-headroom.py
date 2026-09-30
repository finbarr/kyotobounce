"""Verify the declared store stairs and routes have 2.1 m clear headroom."""
import hashlib,json,sys,math
from pathlib import Path
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);r=json.loads((component/'report.json').read_text());g=r['geometry'];panels={p['id']:p for p in layout['panels']}
assert not set(g['retiredIds'])&({p['id']for p in layout['panels']}|{p['id']for p in layout['boxes']})
spec=json.loads((component/'spec.json').read_text());retained_stair=spec.get('retainedStair',[])
for old in retained_stair:
 p=panels[r['componentPrefix']+'retained-'+old['id'].removeprefix('isetan-basement-')]
 b=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
 assert all(abs(b[a][i]-old['bounds'][a][i])<1e-6 for a in (0,2)for i in (0,1)),old['id']
 assert abs(b[1][1]-old['bounds'][1][1])<1e-6 and b[1][0]>old['bounds'][1][0],old['id']
if r['componentPrefix']=='isetan-parking-':
 floor_bottom=min(v['y']for v in panels['isetan-parking-b2-floor']['vertices'])
 for id in ('outer-west','outer-south','outer-north','extension-east-return'):
  assert max(v['y']for v in panels['isetan-parking-'+id]['vertices'])<=floor_bottom+1e-6,('Wall overlaps floor finish',id)
volumes=[];count=0
for prefix,steps in g.get('headroomStairs',[('isetan-stair-',21),('isetan-ground-',14),('isetan-basement-',11)]):
 for flight in ('lower','upper'):
  for i in range(steps):
   p=panels[prefix+flight+'-step-'+str(i)];top=max(v['y']for v in p['vertices']);a=min(v['x']for v in p['vertices']);b=max(v['x']for v in p['vertices']);z=9.7 if flight=='lower'else 12.7
   assert abs(b-a-.3)<1e-5
   volumes.append((p['id'],[(a+.035,b-.035),(top+.35,top+2.1),(z-.3,z+.3)]));count+=1
 p=panels[prefix+'stair-landing'];top=max(v['y']for v in p['vertices']);a=min(v['x']for v in p['vertices']);b=max(v['x']for v in p['vertices']);volumes.append((p['id'],[(a+.2,b-.2),(top+.35,top+2.1),(8.6,13.8)]))
assert g.get('stair') or r['componentPrefix']in ('isetan-fourth-','isetan-fifth-','isetan-sixth-','isetan-seventh-','isetan-eighth-','isetan-sixth-north-','isetan-seventh-north-','isetan-eighth-north-','isetan-north-core-')
if g.get('stair'):assert .14<g['stair']['rise']<.19
# Check flat approaches and the north bypass with the player capsule width.
for route in g['routes']:
 if g.get('headroomRoutes') and route['label']not in g['headroomRoutes']:continue
 if route['label'].endswith(' return'):continue
 for a,b in zip(route['points'],route['points'][1:]):
  if abs(a['y']-b['y'])>.001:continue
  n=max(1,math.ceil(math.hypot(b['x']-a['x'],b['z']-a['z'])/.4))
  for i in range(n+1):
   x=a['x']+(b['x']-a['x'])*i/n;z=a['z']+(b['z']-a['z'])*i/n;y=a['y']
   volumes.append((route['label']+' '+str((x,y,z)),[(x-.24,x+.24),(y+.35,y+2.1),(z-.24,z+.24)]))
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

solids=[]
for p in layout['panels']:
 if p.get('collision',True):solids.append((p['id'],p['vertices'],[p['triangles'][i:i+3]for i in range(0,len(p['triangles']),3)]))
for p in layout['boxes']:
 if not p.get('collision',True):continue
 a=math.radians(p.get('yaw',0));center=p['center'];size=p['size'];vs=[]
 for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
  x*=size['x']/2;y*=size['y']/2;z*=size['z']/2;vs.append(dict(x=center['x']+math.cos(a)*x+math.sin(a)*z,y=center['y']+y,z=center['z']-math.sin(a)*x+math.cos(a)*z))
 ids=[]
 for q in [(0,1,2,3),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,3,7,4),(1,2,6,5)]:ids.extend([q[:3],(q[0],q[2],q[3])])
 solids.append((p['id'],vs,ids))
near=[]
region=[(min(b[a][0]for _,b in volumes),max(b[a][1]for _,b in volumes))for a in range(3)]
for id,vs,ids in solids:
 bounds=[(min(v[k]for v in vs),max(v[k]for v in vs))for k in ('x','y','z')]
 if any(bounds[a][1]<region[a][0] or bounds[a][0]>region[a][1] for a in range(3)):continue
 near.append((id,vs,ids,bounds))
for name,bounds in volumes:
 for id,vs,ids,b in near:
  if any(b[a][1]<bounds[a][0]or b[a][0]>bounds[a][1]for a in range(3)):continue
  for tri in ids:assert clipped_area([vs[k]for k in tri],bounds)<1e-8,(name,id)
# Older generated flights and beams are outside these volumes. Conservative
# bounds include their foundations and profiles; an overlap requires inspection.
other=[];flight_plans={};plan_checks=0;beam_checks=0
for f in layout['flights']:
 # StationWorld does not instantiate legacy escalator flight meshes; the
 # operating escalators use separate records and are exercised by route walks.
 if f.get('role')=='escalator' and not f.get('foundationDepth'):continue
 ps=[p for row in f['contours']for p in row['points']]
 if not f.get('foundationDepth'):flight_plans[f['id']]=f['contours']
 other.append((f['id'],[(min(p['x']for p in ps),max(p['x']for p in ps)),(f['baseElevation']-.31-max(0,f.get('foundationDepth',0)),f['baseElevation']+f['rise']*(len(f['contours'])-1)),(min(p['y']for p in ps),max(p['y']for p in ps))],None))
for b in layout['beams']:
 if not b.get('collision',False):continue
 radius=b['radius']*(math.sqrt(2)if b.get('profile')=='square'else 1)
 other.append((b['id'],[(min(b['a'][k],b['b'][k])-radius,max(b['a'][k],b['b'][k])+radius)for k in ('x','y','z')],b))
for name,bounds in volumes:
 for id,b,beam in other:
  if any(b[a][1]<=bounds[a][0]or b[a][0]>=bounds[a][1]for a in range(3)):continue
  if beam:
   # The long sloping escalator rails have huge empty AABB corners. Enclose
   # the actual square prism/capsule by expanding the box around its segment.
   # A disjoint segment proves clearance; an intersection still fails closed.
   radius=beam['radius']*(math.sqrt(2)if beam.get('profile')=='square'else 1);lo=0;hi=1
   for axis,k in enumerate(('x','y','z')):
    a=beam['a'][k];delta=beam['b'][k]-a;low,high=bounds[axis];low-=radius;high+=radius
    if abs(delta)<1e-12:
     if not low<=a<=high:lo=2;break
    else:
     enter,leave=sorted(((low-a)/delta,(high-a)/delta));lo=max(lo,enter);hi=min(hi,leave)
   assert lo>hi,('Inspect generated beam collider',name,id)
   beam_checks+=1;continue
  assert id in flight_plans,('Inspect generated collider',name,id)
  # An oblique flight's axis-aligned bounds include empty space beside its
  # foot. Its contour cells give a conservative plan footprint for every tread
  # and riser (StairGeometry.Create). Require zero plan overlap before accepting
  # a headroom volume inside that broad bounding box.
  rows=flight_plans[id];y=(bounds[1][0]+bounds[1][1])/2
  for a,d in zip(rows,rows[1:]):
   for i in range(len(a['points'])-1):
    q=[a['points'][i],a['points'][i+1],d['points'][i+1],d['points'][i]]
    vs=[dict(x=p['x'],y=y,z=p['y'])for p in q]
    for ix in [(0,1,2),(0,2,3)]:assert clipped_area([vs[k]for k in ix],bounds)<1e-8,('Inspect generated collider',name,id)
  plan_checks+=1
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],treads=count,stepRiseM=g.get('stair',{}).get('rise'),stairHeadroomM=2.1,headroomVolumes=len(volumes),retainedStairSurfaces=len(retained_stair),flightPlanChecks=plan_checks,beamSegmentChecks=beam_checks);proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
