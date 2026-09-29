"""Check retained floor footprints, thresholds and the complete South lift travel volume."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,shape
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);s=json.loads((component/'spec.json').read_text());panels={p['id']:p for p in layout['panels']};hole=shape(s['hole']);prefix='subway-south-lift-';rows=[]
def surface(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
for slab in s['slabs']:
 assert slab['id']not in panels
 p=panels[prefix+'rebuilt-'+slab['id']];old=shape(slab['originalShape']);expected=old.difference(hole)
 for y in [slab['top'],slab['bottom']]:
  actual=surface(p,y);assert actual.symmetric_difference(expected).area<.001,(p['id'],y);assert actual.intersection(hole).area<.0001,p['id']
 assert abs(old.area-expected.area-9.44)<.001
 rows.append({'id':p['id'],'removedAreaM2':old.area-expected.area,'retainedAreaM2':expected.area})
for p in s['joints']:
 actual=surface(panels[prefix+'rebuilt-'+p['id']],p['top']);assert actual.symmetric_difference(shape(p['shape'])).area<.0001;assert actual.intersection(hole).area<.0001
lift=next(l for l in layout['lifts']if l['id']=='subway-south-platform-lift');assert lift['origin']==s['origin'];assert abs(lift['height']-(s['upper']-s['lower']))<1e-7 and abs(lift['height']-5)<1e-7
X,Z=lift['origin']['x'],lift['origin']['z']
for name,y in [('platform',s['lower']),('south-gate',s['upper'])]:
 sill=panels[prefix+name+'-sill'];assert abs(max(v['y']for v in sill['vertices'])-y)<1e-5;assert abs(min(v['z']for v in sill['vertices'])-hole.bounds[1])<1e-5;assert max(v['z']for v in sill['vertices'])>Z-1.2
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
volumes=[('car travel',[(X-1.15,X+1.15),(s['lower']+.02,s['upper']+2.54),(Z-1.08,Z+1.08)])]
for y in [s['lower'],s['upper']]:volumes.append(('door '+str(y),[(X-.65,X+.65),(y+.04,y+2.1),(Z-2,Z-1.05)]))
for name,bounds in volumes:
 for p in layout['panels']:
  if not p.get('collision',True):continue
  vs=p['vertices']
  if any(max(v[k]for v in vs)<bounds[a][0]or min(v[k]for v in vs)>bounds[a][1]for a,k in enumerate(['x','y','z'])):continue
  for i in range(0,len(p['triangles']),3):assert clipped_area([vs[k]for k in p['triangles'][i:i+3]],bounds)<1e-8,(name,p['id'])
proof={'pass':True,'layoutSha256':m['layoutSha256'],'geometrySha256':m['geometrySha256'],'slabs':rows,'clippedFloorJointParts':len(s['joints']),'shaftTravelM':lift['height'],'bothSillsMeetCar':True,'existingSlabOpeningsPreserved':True,'staticTravelAndDoorVolumesClear':True};out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
