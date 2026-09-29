"""Verify the five thresholds and complete rotated central car travel volume."""
import hashlib,json,sys,math
from pathlib import Path
from shapely.geometry import Polygon,shape
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);s=json.loads((component/'spec.json').read_text());panels={p['id']:p for p in layout['panels']};hole=shape(s['opening']);prefix='central-lift-'
def surface(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
for slab in s['slabs']:
 p=panels[prefix+'rebuilt-'+slab['id']];expected=shape(slab['shape'])
 for y in [slab['top'],slab['bottom']]:assert surface(p,y).symmetric_difference(expected).area<.001;assert surface(p,y).intersection(hole).area<.0001
for y in [0,-.6000000238418579]:assert surface(panels['concourse'],y).intersection(hole).area<.0001
lift=next(l for l in layout['lifts']if l['id']=='station-central-lift');assert lift['origin']==s['origin'] and lift['yaw']==-90;assert len(lift['stops'])==5
X,Z=lift['origin']['x'],lift['origin']['z']
for i,y in enumerate(s['levels']):
 assert abs(lift['origin']['y']+lift['stops'][i]['height']-y)<1e-7
 sill=panels[prefix+'sill-'+str(i)];assert abs(max(v['y']for v in sill['vertices'])-y)<1e-5;assert min(v['x']for v in sill['vertices'])<X+1.2 and max(v['x']for v in sill['vertices'])>=X+1.6-1e-5
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

volumes=[('car travel',[(X-1.08,X+1.08),(s['lower']+.02,s['upper']+2.54),(Z-1.15,Z+1.15)])]
for y in s['levels']:volumes.append(('door '+str(y),[(X+1.05,X+2),(y+.04,y+2.1),(Z-.65,Z+.65)]))
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
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],shaftTravelM=lift['height'],fiveSillsMeetCar=True,existingSlabOpeningsPreserved=True,staticTravelAndDoorVolumesClear=True);proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
