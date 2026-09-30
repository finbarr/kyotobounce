"""Check the connected hotel routes, moving lanes and lift against full geometry."""
import hashlib,json,sys,math
from pathlib import Path
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);r=json.loads((component/'report.json').read_text());g=r['geometry'];panels={p['id']:p for p in layout['panels']}
assert not set(g['retiredIds'])&({p['id']for p in layout['panels']}|{p['id']for p in layout['boxes']})
volumes=[];count=0
for i in range(g['stair']['count']):
 p=panels['granvia-entrance-step-'+str(i)];top=max(v['y']for v in p['vertices']);a=min(v['x']for v in p['vertices']);b=max(v['x']for v in p['vertices']);z=(g['stair']['z0']+g['stair']['z1'])/2
 assert abs(b-a-.3)<1e-5
 volumes.append((p['id'],[(a+.035,b-.035),(top+.35,top+2.1),(z-1.2,z+1.2)]));count+=1
assert .14<g['stair']['rise']<.19
motion=json.loads((component/'motion.json').read_text())
for lane,pit in zip(motion['escalators'],g['pits'][:2]):
 cover=panels[lane['id']+'-lower-pit-cover']
 assert abs(pit['maxX']-max(v['x']for v in cover['vertices']))<1e-5,'The lower cover must meet the fixed concourse'
 for i,p in enumerate(lane['path'][:lane['publicPointCount']]):
  if i%5:continue
  x=lane['lowerCenter']['x']-p['z'];z=lane['lowerCenter']['z'];y=p['y']
  volumes.append((lane['id']+' path '+str(i),[(x-.06,x+.06),(y+.35,y+2.1),(z-.30,z+.30)]))
for route in g['routes']:
 if route['label'].endswith(' return'):continue
 for a,b in zip(route['points'],route['points'][1:]):
  if abs(a['y']-b['y'])>.001:continue
  n=max(1,math.ceil(math.hypot(b['x']-a['x'],b['z']-a['z'])/.4))
  for i in range(n+1):
   x=a['x']+(b['x']-a['x'])*i/n;z=a['z']+(b['z']-a['z'])*i/n;y=a['y']
   volumes.append((route['label']+' at '+str((x,y,z)),[(x-.24,x+.24),(y+.35,y+2.1),(z-.24,z+.24)]))
for l in motion['lifts']:
 assert l['yaw']==180
 x=l['origin']['x'];z=l['origin']['z']
 volumes.append((l['id']+' swept car',[(x-1.1,x+1.1),(-.16,l['height']+2.55),(z-1.07,z+1.07)]))
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
for id,vs,ids in solids:
 bounds=[(min(v[k]for v in vs),max(v[k]for v in vs))for k in ('x','y','z')]
 if bounds[0][0]>68 or bounds[0][1]<30 or bounds[2][0]>15 or bounds[2][1]<-23:continue
 near.append((id,vs,ids,bounds))
for name,bounds in volumes:
 for id,vs,ids,b in near:
  if any(b[a][1]<bounds[a][0]or b[a][0]>bounds[a][1]for a in range(3)):continue
  for tri in ids:assert clipped_area([vs[k]for k in tri],bounds)<1e-8,(name,id)
# Older generated flights and beams are outside these volumes. Conservative
# bounds include their foundations and profiles; an overlap requires inspection.
other=[]
for f in layout['flights']:
 if f.get('role')=='escalator' and not f.get('foundationDepth'):continue
 ps=[p for row in f['contours']for p in row['points']]
 other.append((f['id'],[(min(p['x']for p in ps),max(p['x']for p in ps)),(f['baseElevation']-.31-max(0,f.get('foundationDepth',0)),f['baseElevation']+f['rise']*(len(f['contours'])-1)),(min(p['y']for p in ps),max(p['y']for p in ps))]))
for b in layout['beams']:
 if not b.get('collision',False):continue
 other.append((b['id'],[(min(b['a'][k],b['b'][k])-b['radius'],max(b['a'][k],b['b'][k])+b['radius'])for k in ('x','y','z')]))
for name,bounds in volumes:
 for id,b in other:
  assert any(b[a][1]<=bounds[a][0]or b[a][0]>=bounds[a][1]for a in range(3)),('Inspect generated collider',name,id)
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],treads=count,stepRiseM=g['stair']['rise'],stairHeadroomM=2.1,headroomVolumes=len(volumes),escalators=len(motion['escalators']),lifts=len(motion['lifts']));proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
