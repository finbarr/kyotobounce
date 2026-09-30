"""Check the fitted 3F floor joins and both stairwell openings in the candidate."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
l=json.loads(raw);spec=json.loads((component/'spec.json').read_text());panels={p['id']:p for p in l['panels']};F=spec['second']
def flat_faces(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
retained=unary_union([flat_faces(panels[id],F)for id in spec['retainedFloorIds']])
added=unary_union([flat_faces(p,F)for p in l['panels']if p['id'].startswith('isetan-third-floor-infill-')])
hall=box(-123,-28,-69,16);well=box(-86.3,8.2,-77.8,14.2)
expected=hall.difference(well);actual=unary_union([retained,added]).intersection(hall)
missing=expected.difference(actual).area;excess=actual.difference(expected).area;overlap=added.intersection(retained).area
assert max(missing,excess,overlap)<.002,(missing,excess,overlap)
ceiling=flat_faces(panels['isetan-third-second-ceiling'],11.15)
assert ceiling.symmetric_difference(expected).area<.002
parent=json.loads(Path(json.loads((component/'parent-assets.json').read_text())['layout']).read_text())
for id in spec['retainedFloorIds']:assert panels[id]==next(p for p in parent['panels']if p['id']==id)
assert l['flights']==parent['flights']
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

# Added walls and ceiling must stay out of the retained southern stair approach.
# Use its complete plan bounds and the lowest walkable elevation as a conservative
# envelope; this catches the former entrance crossing that public stair.
for f in l['flights']:
 if not f['id'].startswith('south-approach'):continue
 vs=[p for row in f['contours']for p in row['points']]
 b=[(min(p['x']for p in vs),max(p['x']for p in vs)),(f['baseElevation']+.35,f['baseElevation']+f['rise']*(len(f['contours'])-1)+2.1),(min(p['y']for p in vs),max(p['y']for p in vs))]
 for p in l['panels']:
  if not p['id'].startswith('isetan-third-'):continue
  q=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
  if any(q[i][1]<=b[i][0]or q[i][0]>=b[i][1]for i in range(3)):continue
  for i in range(0,len(p['triangles']),3):
   assert clipped_area([p['vertices'][k]for k in p['triangles'][i:i+3]],b)<1e-8,('New geometry crosses public stair envelope',p['id'],f['id'])
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],infillArea=added.area,missingFloorArea=missing,excessFloorArea=excess,duplicateFloorArea=overlap,retainedFloorPanelsExact=spec['retainedFloorIds'],publicApproachUnobstructed=True);proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
