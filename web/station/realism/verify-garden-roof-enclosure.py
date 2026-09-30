"""Check the supported viewing bay and preserved garden connections."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
parent_path,manifest,component,out=map(Path,sys.argv[1:]);read=lambda p:json.loads(p.read_text())
m=read(manifest);parent=read(parent_path);raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
new=json.loads(raw);old=read(Path(parent['layout']));spec=read(component/'spec.json');assert spec['parentLayoutSha256']==parent['layoutSha256']
before={p['id']:p for p in old['panels']};after={p['id']:p for p in new['panels']}
for key in ('flights','escalators','lifts','beams','boxes'):assert old[key]==new[key]
retained=0
for id,p in before.items():
 if id.startswith(('garden-access-','garden-store-entry-','garden-promenade-'))and id not in spec['retiredIds']:
  assert after[id]==p;retained+=1
assert not set(spec['retiredIds'])&set(after)
def surface(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-10:faces.append(q)
 return unary_union(faces)
floor=surface(after['garden-roof-enclosure-view-floor']);existing=surface(before['garden-promenade-public-floor'])
expected=box(-201.9,8.4,-190,9.04)
assert floor.symmetric_difference(expected).area<.0001
assert floor.intersection(existing).area<.0001
assert abs(max(v['y']for v in after['garden-roof-enclosure-view-floor']['vertices'])-spec['floor'])<1e-5
assert unary_union([floor,existing]).contains(box(-195.24,7.76,-194.76,8.74))
for i in range(3):
 p=after['garden-roof-enclosure-view-glass-'+str(i)];assert p['material']=='glass'and p['collision']
assert all(p['collision']for id,p in after.items()if id.startswith('garden-roof-enclosure-'))
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],floorCollarArea=floor.area,retainedGardenPanels=retained,retiredPanels=len(spec['retiredIds']),windowPanes=3,windowApproachSupported=True,allMovingHardwareExact=True)
proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
