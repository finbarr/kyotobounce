"""Check the new public floor, connections and retained garden against the parent."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,LineString
from shapely.ops import unary_union
parent_path,manifest,component,out=map(Path,sys.argv[1:]);read=lambda p:json.loads(p.read_text())
m=read(manifest);parent=read(parent_path);raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
new=json.loads(raw);old=read(Path(parent['layout']));spec=read(component/'spec.json');report=read(component/'report.json')
assert spec['parentLayoutSha256']==parent['layoutSha256']
before={p['id']:p for p in old['panels']};after={p['id']:p for p in new['panels']}
for key in ('flights','escalators','lifts','beams','boxes'):assert old[key]==new[key]
retained=0
for id,p in before.items():
 if id.startswith('garden-')and id not in spec['retiredIds']:
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
ids=['garden-south-enclosure-'+s+'-outlook-floor'for s in ('west','east')]
floors=[after[id]for id in ids];added=unary_union([surface(p)for p in floors]);existing=surface(before['garden-promenade-public-floor'])
expected=unary_union([box(-202.3,-35.2,-189.1,-25),box(-183.3,-35.2,-168,-25)])
assert added.symmetric_difference(expected).area<.0002
assert added.intersection(existing).area<.0001
whole=unary_union([added,existing]);assert whole.geom_type=='Polygon'
for route in report['geometry']['routes']:
 path=LineString([(p['x'],p['z'])for p in route['points']]).buffer(.24)
 assert whole.buffer(.00002).covers(path),route['label']
for p in floors:
 assert p['appearance']==before['garden-promenade-public-floor']['appearance']
 assert abs(max(v['y']for v in p['vertices'])-spec['floor'])<1e-5
 for v,uv in zip(p['vertices'],p['uv']):
  assert abs(uv['x']-(v['x']+202.3)/2.4)<1e-6 and abs(uv['y']-(1-(v['z']+25)/2.4))<1e-6
panes=[p for id,p in after.items()if id.startswith('garden-south-enclosure-')and'-screen-pane-'in id]
assert len(panes)==21 and all(p['collision']and p['material']=='glass'for p in panes)
# The backing must remain behind the public cladding, including its metal face.
back=after['garden-south-enclosure-west-wall-backing'];metal=after['garden-south-enclosure-west-boundary-metal']
assert max(v['x']for v in back['vertices'])<min(v['x']for v in metal['vertices'])+.001
proof=dict(pass_=True,layoutSha256=m['layoutSha256'],geometrySha256=m['geometrySha256'],addedFloorArea=added.area,publicFloorConnected=True,routeCapsulesSupported=True,pavingUVsContinuous=True,retainedGardenPanels=retained,retiredPanels=len(spec['retiredIds']),windowPanes=len(panes),westernBackingBehindCladding=True,allMovingHardwareExact=True)
proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
