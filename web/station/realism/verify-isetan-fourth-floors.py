"""Check the fitted 4F floor joins and retained public circulation in the candidate."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString,box
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
l=json.loads(raw);spec=json.loads((component/'spec.json').read_text());panels={p['id']:p for p in l['panels']};F=spec['floor']
def flat_faces(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
retained=unary_union([flat_faces(panels[id],F)for id in spec['retainedFloorIds']])
added=unary_union([flat_faces(p,F)for p in l['panels']if p['id'].startswith('isetan-fourth-floor-infill-')])
hall=unary_union([Polygon(spec['room']),Polygon(spec['forecourt'])]);expected=hall;actual=unary_union([retained,added]).intersection(hall)
missing=expected.difference(actual).area;excess=actual.difference(expected).area;overlap=added.intersection(retained).area
assert max(missing,excess,overlap)<.002,(missing,excess,overlap)
ceiling=flat_faces(panels['isetan-fourth-ceiling'],spec['ceiling'])
assert ceiling.symmetric_difference(Polygon(spec['room'])).area<.002
parent=json.loads(Path(json.loads((component/'parent-assets.json').read_text())['layout']).read_text())
for id in spec['retainedFloorIds']:assert panels[id]==next(p for p in parent['panels']if p['id']==id)
assert l['flights']==[dict(f,foundationDepth=0)if f['id']in spec['modifiedFlightIds']else f for f in parent['flights']]
# Check the replacement solids independently against the original generated
# foundation and editable source, including the retained sections below/above 4F.
source={o['name']:o for o in json.loads((component/'retired-source.json').read_text())}
room_cut=unary_union([box(v[0][0],v[2][0],v[0][1],v[2][1])for v in spec['cutVolumes']])
foundation_checks=[]
for data in spec['foundations']:
 f=next(f for f in parent['flights']if f['id']==data['flightId']);a,b=f['contours'][0]['points'],f['contours'][-1]['points']
 fp=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
 top=f['baseElevation']-.31;bottom=top-f['foundationDepth'];o=source[data['sourceId']]
 assert abs(max(v[1]for v in o['vertices'])-top)<1e-5 and abs(min(v[1]for v in o['vertices'])-bottom)<1e-5
 source_top=unary_union([Polygon([(o['vertices'][i][0],-o['vertices'][i][2])for i in face['vertices']])for face in o['faces']if all(abs(o['vertices'][i][1]-top)<1e-5 for i in face['vertices'])])
 assert source_top.symmetric_difference(fp).area<.002
 replacement=[p for p in l['panels']if p['id'].startswith('isetan-fourth-foundation-'+f['id']+'-')]
 assert len(replacement)==len(data['pieces'])
 for lo,hi in [(bottom,F-.04),(F-.04,spec['ceiling']),(spec['ceiling'],top)]:
  y=(lo+hi)/2;expected=fp.difference(room_cut)if F-.04<y<spec['ceiling']else fp
  section=[flat_faces(p,max(v['y']for v in p['vertices']))for p in replacement if min(v['y']for v in p['vertices'])<y<max(v['y']for v in p['vertices'])]
  actual=unary_union(section);assert actual.symmetric_difference(expected).area<.002
  assert abs(sum(s.area for s in section)-actual.area)<.002
 foundation_checks.append(dict(flightId=f['id'],retainedOutsideRoom=True,sourceFootprintMatches=True,replacementSolids=len(replacement)))
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
  if not p['id'].startswith('isetan-fourth-'):continue
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
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],infillArea=added.area,missingFloorArea=missing,excessFloorArea=excess,duplicateFloorArea=overlap,retainedFloorPanelsExact=spec['retainedFloorIds'],foundationChecks=foundation_checks,publicApproachUnobstructed=True);proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
