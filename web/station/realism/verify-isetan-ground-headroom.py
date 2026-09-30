"""Verify both stacked stairs have 2.1 m clear headroom in the complete station."""
import hashlib,json,sys,math
from pathlib import Path
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);r=json.loads((component/'report.json').read_text());g=r['geometry'];panels={p['id']:p for p in layout['panels']}
assert not set(g['retiredIds'])&({p['id']for p in layout['panels']}|{p['id']for p in layout['boxes']})
volumes=[];count=0
for prefix,steps in [('isetan-ground-',14),('isetan-basement-',11)]:
 for flight in ('lower','upper'):
  for i in range(steps):
   p=panels[prefix+flight+'-step-'+str(i)];top=max(v['y']for v in p['vertices']);a=min(v['x']for v in p['vertices']);b=max(v['x']for v in p['vertices']);z=9.7 if flight=='lower'else 12.7
   assert abs(b-a-.3)<1e-5
   volumes.append((p['id'],[(a+.035,b-.035),(top+.35,top+2.1),(z-.3,z+.3)]));count+=1
 p=panels[prefix+'stair-landing'];top=max(v['y']for v in p['vertices']);a=min(v['x']for v in p['vertices']);b=max(v['x']for v in p['vertices']);volumes.append((p['id'],[(a+.2,b-.2),(top+.35,top+2.1),(8.6,13.8)]))
assert .14<g['stair']['rise']<.19
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
 if bounds[0][0]>-77 or bounds[0][1]<-85 or bounds[2][0]>14.2 or bounds[2][1]<8.2:continue
 near.append((id,vs,ids,bounds))
for name,bounds in volumes:
 for id,vs,ids,b in near:
  if any(b[a][1]<bounds[a][0]or b[a][0]>bounds[a][1]for a in range(3)):continue
  for tri in ids:assert clipped_area([vs[k]for k in tri],bounds)<1e-8,(name,id)
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],treads=count,stepRiseM=g['stair']['rise'],stairHeadroomM=2.1,headroomVolumes=len(volumes));proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
