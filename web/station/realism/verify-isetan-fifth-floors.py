"""Check 5F floor coverage, retained doorway geometry and public stair clearance."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString,box,shape
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
l=json.loads(raw);spec=json.loads((component/'spec.json').read_text());panels={p['id']:p for p in l['panels']};F=spec['floor']
def flat_faces(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
parent=json.loads(Path(json.loads((component/'parent-assets.json').read_text())['layout']).read_text());old={p['id']:p for p in parent['panels']}
for id in spec['preservedIds']:assert panels[id]==old[id]
assert l['flights']==parent['flights']
landing=next(f for f in parent['flights']if f['id']==spec['landingId']);a,b=landing['contours'][0]['points'],landing['contours'][-1]['points'];landing_shape=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
original=unary_union([flat_faces(old[id],F)for id in spec['retainedFloorIds']]+[landing_shape]);room=unary_union([Polygon(spec['room']),Polygon(spec['approach'])]);cut=shape(next(s for s in spec['slabs']if s['id']=='west-south-floor-03')['cut'])
kept=unary_union([flat_faces(panels[id],F)for id in ['west-north-floor-03','isetan-fifth-west-south-floor-03']]);infill=unary_union([flat_faces(p,F)for p in l['panels']if p['id'].startswith('isetan-fifth-floor-infill-')]);actual=unary_union([kept,infill,landing_shape]).intersection(room);expected=room.difference(cut)
missing=expected.difference(actual).area;excess=actual.difference(expected).area;overlap=infill.intersection(kept).area
assert max(missing,excess,overlap)<.002,(missing,excess,overlap)
assert infill.symmetric_difference(room.difference(original)).area<.002
assert flat_faces(panels['isetan-fifth-ceiling'],spec['ceiling']).symmetric_difference(Polygon(spec['room'])).area<.002
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

# The new openings in deep parapet walls end below their actual stair treads.
for id,volumes in spec['cuts'].items():
 if not id.startswith('north-side-'):continue
 parts=id.split('-');index=int(parts[3]);flight=next(f for f in l['flights']if f['id']=='north-side-flight-'+str(index).zfill(2))
 floor=flight['baseElevation'] if parts[2]=='flight' else flight['baseElevation']+flight['rise']*(len(flight['contours'])-1)
 assert all(v[1][1]<floor-.3 for v in volumes),('Opening reaches public stair guard',id)
# Added walls and ceiling must stay out of all retained public stairways.
# Use its complete plan bounds and the lowest walkable elevation as a conservative
# envelope; this catches the former entrance crossing that public stair.
plans={}
for f in l['flights']:
 if not f['id'].startswith(('south-approach','daikaidan-flight-','north-side-flight-')):continue
 vs=[p for row in f['contours']for p in row['points']]
 b=[(min(p['x']for p in vs),max(p['x']for p in vs)),(f['baseElevation']+.35,f['baseElevation']+f['rise']*(len(f['contours'])-1)+2.1),(min(p['y']for p in vs),max(p['y']for p in vs))]
 for p in l['panels']:
  if not p['id'].startswith('isetan-fifth-'):continue
  q=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
  if any(q[i][1]<=b[i][0]or q[i][0]>=b[i][1]for i in range(3)):continue
  # Restrict the stair volume to its actual plan footprint. The building's
  # concave ceiling can share an AABB with the stair while remaining clear.
  if f['id']not in plans:
   triangles=[]
   for row,back in zip(f['contours'],f['contours'][1:]):
    for k in range(len(row['points'])-1):
     q=[row['points'][k],row['points'][k+1],back['points'][k+1],back['points'][k]]
     for ix in [(0,1,2),(0,2,3)]:triangles.append(Polygon([(q[i]['x'],q[i]['y'])for i in ix]))
   plans[f['id']]=unary_union(triangles)
  footprint=plans[f['id']]
  for i in range(0,len(p['triangles']),3):
   vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
   if clipped_area(vs,b)<1e-8:continue
   coords=[(v['x'],v['z'])for v in vs];shape=Polygon(coords)
   if shape.area<1e-8:shape=LineString(coords)
   assert not shape.intersects(footprint.buffer(-.00001)),('New geometry crosses public stair envelope',p['id'],f['id'])
proof=dict(layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],infillArea=infill.area,missingFloorArea=missing,excessFloorArea=excess,duplicateFloorArea=overlap,preservedIds=spec['preservedIds'],publicApproachUnobstructed=True);proof['pass']=True;out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
