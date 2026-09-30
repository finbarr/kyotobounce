"""Check 7F floor coverage, retained landing geometry and public stair clearance."""
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
assert l['flights']==[dict(f,foundationDepth=0)if f['id']in spec['modifiedFlightIds']else f for f in parent['flights']]
for id in ['isetan-seventh-west-north-floor-05','isetan-seventh-west-south-floor-05']:
 p=panels[id];assert len(p['uv'])==len(p['vertices'])
 assert max(max(abs(q['x']-v['x']/2.4),abs(q['y']-v['z']/2.4))for q,v in zip(p['uv'],p['vertices']))<.00001
landing_shape=shape(spec['landingShape'])
original=unary_union([flat_faces(old[id],F)for id in spec['retainedFloorIds']]+[landing_shape]);room=unary_union([Polygon(spec['room']),Polygon(spec['approach'])]);cut=shape(next(s for s in spec['slabs']if s['id']=='west-south-floor-05')['cut'])
kept=unary_union([flat_faces(panels[id],F)for id in ['isetan-seventh-west-north-floor-05','isetan-seventh-west-south-floor-05']]);infill=unary_union([flat_faces(p,F)for p in l['panels']if p['id'].startswith('isetan-seventh-floor-infill-')]);actual=unary_union([kept,infill,landing_shape]).intersection(room);expected=room.difference(cut.difference(landing_shape))
missing=expected.difference(actual).area;excess=actual.difference(expected).area;overlap=infill.intersection(kept).area+kept.intersection(landing_shape).area
assert max(missing,excess,overlap)<.002,(missing,excess,overlap)
assert infill.symmetric_difference(room.difference(original)).area<.002
assert flat_faces(panels['isetan-seventh-ceiling'],spec['ceiling']).symmetric_difference(Polygon(spec['room'])).area<.002
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
# Check each tread at the elevation used by StairGeometry.Create. A single
# box spanning the entire flight wrongly treats its lower end as the top step.
added=[]
for p in l['panels']:
 if p['id'].startswith('isetan-seventh-'):
  bounds=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
  added.append((p,bounds))
quantized_edges=0;tread_checks=0
# The reconstructed floor and step datums can differ by fractions of a
# millimetre. Require nominal 2.1 m clearance within a 1 mm modeling tolerance.
headroom=2.1;vertical_tolerance=.001
for f in l['flights']:
 if not f['id'].startswith(('south-approach','daikaidan-flight-','north-side-flight-')):continue
 for step,(row,back)in enumerate(zip(f['contours'],f['contours'][1:])):
  points=row['points']+back['points'];top=f['baseElevation']+(step+1)*f['rise']
  bounds=[(min(v['x']for v in points),max(v['x']for v in points)),(top+.35,top+headroom-vertical_tolerance),(min(v['y']for v in points),max(v['y']for v in points))]
  nearby=[p for p,b in added if all(b[i][1]>bounds[i][0]and b[i][0]<bounds[i][1]for i in range(3))]
  if not nearby:continue
  triangles=[]
  for k in range(len(row['points'])-1):
   q=[row['points'][k],row['points'][k+1],back['points'][k+1],back['points'][k]]
   for ix in [(0,1,2),(0,2,3)]:triangles.append(Polygon([(q[i]['x'],q[i]['y'])for i in ix]))
  footprint=unary_union(triangles).buffer(-.00001);tread_checks+=1
  for p in nearby:
   for i in range(0,len(p['triangles']),3):
    vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
    if clipped_area(vs,bounds)<1e-8:continue
    # Clip vertically before projecting; a sloping face's distant upper
    # vertices must not create a false overlap at this particular tread.
    poly=[[v['x'],v['y'],v['z']]for v in vs]
    for bound,sign in [(bounds[1][0],1),(bounds[1][1],-1)]:
     kept=[]
     for j,a in enumerate(poly):
      b=poly[(j+1)%len(poly)];da=sign*(a[1]-bound);db=sign*(b[1]-bound)
      if da>=0:kept.append(a)
      if (da>=0)!=(db>=0):
       t=da/(da-db);kept.append([x+(y-x)*t for x,y in zip(a,b)])
     poly=kept
    if len(poly)<3:continue
    coords=[(v[0],v[2])for v in poly];projected=Polygon(coords)
    if projected.area<1e-8:projected=LineString(coords)
    overlap_shape=projected.intersection(footprint)
    # Float32 positions here resolve about 0.008 mm. Apply a 0.01 mm
    # margin to both polygons for micron-wide collinear edge artifacts.
    # Vertical faces remain lines and must still be completely clear.
    if not overlap_shape.is_empty and projected.geom_type=='Polygon' and overlap_shape.buffer(-.00001).is_empty:
     quantized_edges+=1;continue
    assert overlap_shape.is_empty,('New geometry crosses public stair headroom',p['id'],f['id'],step)
proof=dict(layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],infillArea=infill.area,missingFloorArea=missing,excessFloorArea=excess,duplicateFloorArea=overlap,preservedIds=spec['preservedIds'],publicApproachUnobstructed=True,publicTreadChecks=tread_checks,publicStairHeadroomM=headroom,verticalToleranceM=vertical_tolerance,quantizedEdgeTriangles=quantized_edges,planPrecisionM=.00001);proof['pass']=True;out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
