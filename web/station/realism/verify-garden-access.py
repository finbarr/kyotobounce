"""Check the garden floor replacement, step joins and protected well approaches."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union

parent_path,candidate_path,component,out=map(Path,sys.argv[1:])
read=lambda p:json.loads(p.read_text())
parent=read(parent_path);candidate=read(candidate_path);raw=Path(candidate['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==candidate['layoutSha256']
old=read(Path(parent['layout']));new=json.loads(raw);spec=read(component/'spec.json')
assert spec['parentLayoutSha256']==parent['layoutSha256']
oldp={p['id']:p for p in old['panels']};newp={p['id']:p for p in new['panels']}
assert not set(spec['retiredIds'])&set(newp)
for key in ['flights','escalators','lifts','beams','boxes']:assert old[key]==new[key],key

def surface(p):
 top=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][j]for j in p['triangles'][i:i+3]]
  if all(abs(v['y']-top)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)

F=spec['floor'];G=spec['gardenFloor'];X=spec['startX'];E=spec['endX'];Z=spec['centerZ']
before=unary_union([surface(p)for id,p in oldp.items()if id.startswith('k008-garden-deck-')])
well=box(E,Z-1.45,X+.1,Z+1.45)
old_well=box(-157.3000030517578,-31,-154.6999969482422,-22.31999969482422)
expected=unary_union([before,old_well]).difference(well)
garden=surface(newp['garden-access-garden-floor'])
floor_error=garden.symmetric_difference(expected).area
assert floor_error<.001
lower=unary_union([surface(p)for p in oldp.values()if p['role']in ('floor','building-floor','landing')and abs(max(v['y']for v in p['vertices'])-F)<1e-5])
added=surface(newp['garden-access-arrival-infill']);apron=box(X,Z-1.35,-146.5,Z+1.35)
missing=apron.difference(unary_union([lower,added])).area;overlap=lower.intersection(added).area
assert missing<.001 and overlap<.0001
heights=[]
for i in range(28):
 p=newp['garden-access-step-'+str(i).zfill(2)];top=max(v['y']for v in p['vertices']);heights.append(top)
 assert abs(top-(F+(i+1)*(G-F)/28))<1e-5
 shape=surface(p);assert shape.symmetric_difference(box(X-(i+1)*.31,Z-1.3,X-i*.31,Z+1.3)).area<.0001
assert abs(heights[-1]-G)<1e-6 and .14<heights[0]-F<.20
assert newp['north-circulation-landing-14']==oldp['north-circulation-landing-14']
guards=[
 dict(label='Garden well south guard',start=dict(x=-152,y=G,z=Z-2.4),yaw=0,axis='z',limit=Z-1.6,sign=-1),
 dict(label='Garden well north guard',start=dict(x=-152,y=G,z=Z+2.4),yaw=180,axis='z',limit=Z+1.6,sign=1),
 dict(label='Garden well east guard',start=dict(x=X+1,y=G,z=Z),yaw=-90,axis='x',limit=X+.33,sign=1),
]
guard_dir=component/'guard-check';guard_dir.mkdir(exist_ok=True)
(guard_dir/'report.json').write_text(json.dumps(dict(sourceLayoutSha256=candidate['layoutSha256'],geometry=dict(routes=[],blocked=guards)))+'\n')
proof=dict(pass_=True,layoutSha256=candidate['layoutSha256'],geometrySha256=candidate['geometrySha256'],gardenFloorAreaError=floor_error,missingApronArea=missing,duplicateApronArea=overlap,apronInfillArea=added.area,steps=len(heights),stepRise=(G-F)/28,retainedLandingExact=True,allMovingHardwareExact=True)
proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
