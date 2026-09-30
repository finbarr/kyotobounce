"""Check floor joins and preservation for the western rooftop connection."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,shape,box
from shapely.ops import unary_union
parent_path,manifest,component,out=map(Path,sys.argv[1:])
read=lambda p:json.loads(p.read_text())
m=read(manifest);parent=read(parent_path);raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
new=json.loads(raw);old=read(Path(parent['layout']));spec=read(component/'spec.json')
assert spec['parentLayoutSha256']==parent['layoutSha256']
before={p['id']:p for p in old['panels']};after={p['id']:p for p in new['panels']}
for key in ('flights','escalators','lifts','beams','boxes'):assert old[key]==new[key]
for id,p in before.items():
 if id.startswith(('garden-access-','garden-promenade-'))and id not in spec['retiredIds']:assert after[id]==p
assert not set(spec['retiredIds'])&set(after)
def surface(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-10:faces.append(q)
 return unary_union(faces)
F,G=spec['floor'],spec['gardenFloor'];prefix=spec['componentPrefix']
retained=unary_union([surface(p)for p in before.values()if p['role']in ('floor','building-floor','landing')and abs(max(v['y']for v in p['vertices'])-F)<1e-5])
added=unary_union([surface(p)for id,p in after.items()if id.startswith(prefix+'hall-infill')])
missing=shape(spec['hall']).difference(unary_union([retained,added])).area
overlap=added.intersection(retained).area
assert missing<.001 and overlap<.001,(missing,overlap)
roof=surface(after[prefix+'roof-landing']);assert roof.symmetric_difference(shape(spec['roofFloor'])).area<.001
for i in range(spec['steps']):
 p=after[prefix+'step-'+str(i).zfill(2)];y=max(v['y']for v in p['vertices'])
 assert abs(y-F-(i+1)*(G-F)/28)<1e-5
 target=box(spec['startX']-(i+1)*.32,spec['centerZ']-1.9,spec['startX']-i*.32,spec['centerZ']+1.9)
 assert surface(p).symmetric_difference(target).area<.0001
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],missingFloorArea=missing,duplicateFloorArea=overlap,addedFloorArea=added.area,steps=28,retainedGardenAndOutdoorStairExact=True,allMovingHardwareExact=True)
proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
