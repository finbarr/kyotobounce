"""Check the pavilion stair, ceiling opening and headroom in the complete station."""
import hashlib,json,sys,math
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);report=json.loads((component/'report.json').read_text());g=report['geometry'];s=g['stair'];panels={p['id']:p for p in layout['panels']}
assert not set(g['retiredIds'])&({p['id']for p in layout['panels']}|{p['id']for p in layout['boxes']})
def surface(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  t=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in t):
   q=Polygon([(v['x'],v['z'])for v in t])
   if q.area>1e-10:faces.append(q)
 return unary_union(faces)
O=g['opening'];well=box(O['minX'],O['minZ'],O['maxX'],O['maxZ']);spec=json.loads((component/'spec.json').read_text());old_shape=__import__('shapely.geometry',fromlist=['shape']).shape(spec['slabs'][0]['originalShape'])
ceiling=panels['porta-pavilion-rebuilt-porta-west-lift-rebuilt-porta-plaza-ceiling'];assert surface(ceiling,max(v['y']for v in ceiling['vertices'])).symmetric_difference(old_shape.difference(well)).area<.001
volumes=[]
for i in range(s['steps']):
 p=panels['porta-pavilion-step-'+str(i)];top=max(v['y']for v in p['vertices']);a=min(v['z']for v in p['vertices']);b=max(v['z']for v in p['vertices']);expected=g['upper']-(i+1)*s['rise']
 assert abs(top-expected)<1e-5 and abs(b-a-s['going'])<1e-5
 for x0,x1,label in [(38,42.8,'west'),(43.5,48.5,'east')]:volumes.append((label+' tread '+str(i),[(x0,x1),(top+.35,top+2.1),(a+.035,b-.035)]))
assert .14<s['rise']<.19
for x0,x1,label in [(38,42.8,'west'),(43.5,48.5,'east')]:volumes.append((label+' middle landing',[(x0,x1),(s['mid']+.35,s['mid']+2.1),(s['firstEnd']+.1,s['secondStart']-.1)]))
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
 if bounds[0][0]>49 or bounds[0][1]<37.5 or bounds[2][0]>51.3 or bounds[2][1]<39.5:continue
 near.append((id,vs,ids,bounds))
conflicts=set()
for name,bounds in volumes:
 for id,vs,ids,b in near:
  if any(b[a][1]<bounds[a][0]or b[a][0]>bounds[a][1]for a in range(3)):continue
  for tri in ids:
   if clipped_area([vs[k]for k in tri],bounds)>=1e-8:conflicts.add((name,id))
assert not conflicts,sorted(conflicts)
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],treads=s['steps'],stepRiseM=s['rise'],stairHeadroomM=2.1,headroomVolumes=len(volumes),ceilingWellOpen=True);proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
