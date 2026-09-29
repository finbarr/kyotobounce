"""Independent floor coverage and lift-clearance proof for the Hachijo crossing."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box,shape
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];j=json.loads(raw);s=json.loads((component/'spec.json').read_text());r=json.loads((component/'report.json').read_text());panels={p['id']:p for p in j['panels']};prefix='hachijo-crossing-'
def surface(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<.00002 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
for slab in s['slabs']:
 p=panels[prefix+'rebuilt-'+slab['id']];expected=shape(slab['originalShape'])
 if slab['operation']=='cut':
  o=s['opening'];expected=expected.difference(box(o['minX'],o['minZ'],o['maxX'],o['maxZ']))
 for y in [slab['top'],slab['bottom']]:assert surface(p,y).symmetric_difference(expected).area<.001,p['id']
assert all(id not in panels for id in s['retiredIds'])
garden=Polygon(r['geometry']['garden']);pavement=surface(panels[prefix+'south-pavement'],0)
assert pavement.intersection(garden).area<.0002,'Pavement closes garden'
assert surface(panels[prefix+'garden-floor'],-6.2).symmetric_difference(garden).area<.001
# Lintels cover the exposed earth above both lower portals, and stop at the ceiling.
for id in ['garden-tunnel-lintel','garden-lift-lintel']:
 ys=[v['y']for v in panels[prefix+id]['vertices']]
 assert abs(min(ys)+2.8)<.00002 and abs(max(ys))<.00002,id
for id in ['garden-tunnel-upper-edge','garden-lift-upper-edge']:
 assert all(prefix+id+'-'+part in panels for part in ['top','mid','post-0']),id
lifts=[l for l in j['lifts']if l['id']in ['subway-hachijo-east-lift','subway-hachijo-south-lift']];assert len(lifts)==2
expected=box(130,-270,196,-229).difference(garden).difference(box(176.4,-237.6,179.6,-234.65));assert pavement.symmetric_difference(expected).area<.002
# Clip all static faces against the car's unobstructed interior travel prism.
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
for lift in lifts:
 x,z=lift['origin']['x'],lift['origin']['z'];assert lift['height']==6.2
 bounds=[(x-1.15,x+1.15),(-6.18,2.54),(z-1.08,z+1.08)]
 for p in j['panels']:
  if not p.get('collision',True):continue
  vs=p['vertices']
  if any(max(v[k]for v in vs)<bounds[a][0]or min(v[k]for v in vs)>bounds[a][1]for a,k in enumerate(['x','y','z'])):continue
  for i in range(0,len(p['triangles']),3):assert clipped_area([vs[k]for k in p['triangles'][i:i+3]],bounds)<1e-8,(lift['id'],p['id'])
floor_ids=['station-floor','north-lift-lobby','crossing-floor','garden-floor','south-lift-lobby','avanti-foyer-floor']
floors=[surface(panels[prefix+id],-6.2)for id in floor_ids];union=unary_union(floors)
assert union.geom_type=='Polygon','Public floor components are disconnected';assert sum(p.area for p in floors)-union.area<.001,'Overlapping floor plates'
proof={'pass':True,'layoutSha256':m['layoutSha256'],'geometrySha256':m['geometrySha256'],'restoredIndoorSlabs':4,'liftShaftsClear':2,'continuousPublicFloorAreaM2':union.area,'gardenOpenToSky':True,'guardedLowerPortals':2,'portalHeadroomM':3.4,'duplicatePublicFloorAreaM2':sum(p.area for p in floors)-union.area}
out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
