"""Check the complete car path and public approaches and landing doors against the composed station."""
import hashlib,json,sys,math
from pathlib import Path
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);motion=json.loads((component/'motion.json').read_text())
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

volumes=[]
for source in motion['lifts']:
 lift=next(l for l in layout['lifts']if l['id']==source['id']);assert lift.get('yaw',0)==0
 X,Z=lift['origin']['x'],lift['origin']['z'];B=lift['origin']['y'];U=B+lift['height']
 volumes.append((lift['id']+' car travel',[(X-1.15,X+1.15),(B+.02,U+2.54),(Z-1.08,Z+1.08)]))
 for stop in lift['stops']:
  y=B+stop['height'];volumes.append((lift['id']+' door '+stop['id'],[(X-.65,X+.65),(y+.04,y+2.1),(Z-2,Z-1.05)]))
volumes.extend([
 ('Ground entry',[(170.1,172.2),(.05,2.65),(15.2,24.1)]),
 ('Ground lobby',[(170.1,176.7),(.05,2.65),(10.3,14.55)]),
 ('Theatre west passage',[(74.31,173.7),(7.4,10),(-3.55,-1.15)]),
 ('Theatre north passage',[(170.3,173.7),(7.4,10),(-3.55,9.99)]),
 ('Theatre lift lobby',[(170.3,176.7),(7.4,10),(10.3,14.55)])])
for name,bounds in volumes:
 for p in layout['panels']:
  if not p.get('collision',True):continue
  vs=p['vertices']
  if any(max(v[k]for v in vs)<bounds[a][0]or min(v[k]for v in vs)>bounds[a][1]for a,k in enumerate(['x','y','z'])):continue
  for i in range(0,len(p['triangles']),3):assert clipped_area([vs[k]for k in p['triangles'][i:i+3]],bounds)<1e-8,(name,p['id'])
 # Boxes are checked in their own rotated frame through a triangle shell.
 for p in layout['boxes']:
  if not p.get('collision',True):continue
  a=math.radians(p.get('yaw',0));center=p['center'];size=p['size'];vs=[]
  for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
   x*=size['x']/2;y*=size['y']/2;z*=size['z']/2;vs.append(dict(x=center['x']+math.cos(a)*x+math.sin(a)*z,y=center['y']+y,z=center['z']-math.sin(a)*x+math.cos(a)*z))
  if any(max(v[k]for v in vs)<bounds[a][0]or min(v[k]for v in vs)>bounds[a][1]for a,k in enumerate(['x','y','z'])):continue
  for quad in [(0,1,2,3),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,3,7,4),(1,2,6,5)]:
   for ids in [quad[:3],(quad[0],quad[2],quad[3])]:assert clipped_area([vs[k]for k in ids],bounds)<1e-8,(name,p['id'])
proof={'pass':True,'layoutSha256':m['layoutSha256'],'geometrySha256':m['geometrySha256'],'clearVolumes':[name for name,_ in volumes]};out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
