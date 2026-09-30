"""Check the second-floor public routes against complete collision geometry."""
import hashlib,json,sys,math
from pathlib import Path
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);r=json.loads((component/'report.json').read_text());g=r['geometry'];panels={p['id']:p for p in layout['panels']}
assert not set(g['retiredIds'])&({p['id']for p in layout['panels']}|{p['id']for p in layout['boxes']})
ceiling_top=max(v['y']for v in panels['isetan-second-ceiling']['vertices']);upper_landing_bottom=min(v['y']for v in panels['west-3f-landing']['vertices'])
assert ceiling_top<upper_landing_bottom,'The hall ceiling must stay below the retained upper landing'
upper_landing_top=max(v['y']for v in panels['west-3f-landing']['vertices'])
assert all(max(v['y']for v in p['vertices'])<upper_landing_top for p in layout['panels']if p['id'].startswith('isetan-second-'))
assert all(b[1][1]<upper_landing_bottom for b in json.loads((component/'spec.json').read_text())['cuts'].values())
volumes=[]
for route in g['routes']:
 if route['label'].endswith(' return') or not any(route['label'].startswith(t) for t in ('Second floor','Information desk','Central lift')):continue
 for a,b in zip(route['points'],route['points'][1:]):
  if abs(a['y']-b['y'])>.001:continue
  n=max(1,math.ceil(math.hypot(b['x']-a['x'],b['z']-a['z'])/.4))
  for i in range(n+1):
   x=a['x']+(b['x']-a['x'])*i/n;z=a['z']+(b['z']-a['z'])*i/n;y=a['y']
   volumes.append((route['label']+' at '+str((x,y,z)),[(x-.24,x+.24),(y+.35,y+2.1),(z-.24,z+.24)]))
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
 if bounds[0][0]>-32 or bounds[0][1]<-124 or bounds[2][0]>17 or bounds[2][1]<-29:continue
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
proof={'pass':True,'layoutSha256':m['layoutSha256'],'geometrySha256':m['geometrySha256'],'headroomM':2.1,'headroomVolumes':len(volumes),'upperLandingSeparationM':upper_landing_bottom-ceiling_top};out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
