"""Independent supported-triangle and reserved-route checks, native metres."""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
layout=json.loads((root/'runtime/station-layout.json').read_text())
floor=next(p for p in layout['panels'] if p['id']=='east-court-garden-floor')
v=floor['vertices'];t=floor['triangles'];top=[]
for i in range(0,len(t),3):
 ps=[v[j] for j in t[i:i+3]]
 if all(abs(p['y']-34.62)<1e-5 for p in ps):top.append(ps)
def supported(x,z):
 for ps in top:
  c=[(b['x']-a['x'])*(z-a['z'])-(b['z']-a['z'])*(x-a['x']) for a,b in zip(ps,ps[1:]+ps[:1])]
  if min(c)>=-1e-6 or max(c)<=1e-6:return True
 return False
spec=json.loads((root/'web/station/east-square/spec.json').read_text());samples=[]
for key,radius in [('tree',1.65),('gazebo',1.84)]:
 p=spec[key]
 for i in range(73):
  x=p['x']+radius*math.cos(i*math.tau/72);z=p['z']+radius*math.sin(i*math.tau/72)
  assert supported(x,z),(key,x,z);samples.append([x,34.62,z])
for seat in spec['seats']:
 a=math.radians(seat['rotation'])
 for i in range(47):
  for j in range(15):
   u=(i/46-.5)*seat['length'];w=(j/14-.5)*seat['depth']
   x=seat['x']+u*math.cos(a)-w*math.sin(a);z=seat['z']+u*math.sin(a)+w*math.cos(a)
   assert supported(x,z),(seat['id'],x,z);samples.append([x,34.62,z])
# This verifies a real floor, including rejection of the ramp cutout.
assert not supported(97,-5)
assert not supported(93,2)
result={'status':'pass','topTriangles':len(top),'supportedBaseSamples':len(samples),'floorY':34.62,'cutoutRejections':[[97,-5],[93,2]],'bases':samples}
proposal=root/'.local/station-detail/candidate/collision-proposal.json'
actual=0
if proposal.exists():
 for panel in json.loads(proposal.read_text())['panels']:
  for p in panel['vertices']:
   if p['y']<=34.72:
    assert supported(p['x'],p['z']),(panel['id'],p)
    actual+=1
result['supportedActualBaseVertices']=actual
out=root/'artifacts/station-detail/east-square/support.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result))
print('PASS',len(samples),'base samples on',len(top),'real top triangles')

# Reproducible pre-export reservation receipt. This is a proposal, not integration.
occupied=[]
for name in ['tree','gazebo']:
 p=spec[name];r=p.get('approximateCrownRadius',p.get('radius',0))+.05;h=p.get('approximateCrownHeight',p.get('height',0))+.05
 occupied.append({'id':'k027-'+name,'min':[p['x']-r,34.59,p['z']-r],'max':[p['x']+r,34.62+h,p['z']+r]})
for p in spec['seats']:
 a=math.radians(p['rotation']);rx=(abs(math.cos(a))*p['length']+abs(math.sin(a))*p['depth'])/2+.01;rz=(abs(math.sin(a))*p['length']+abs(math.cos(a))*p['depth'])/2+.01
 occupied.append({'id':'k027-seat-'+p['id'],'min':[p['x']-rx,34.62,p['z']-rz],'max':[p['x']+rx,35.16,p['z']+rz]})
for p in occupied:p['rationale']='Inferred core composition from operator photograph; real floor triangle base samples pass. Preserve circulation and K029 boundary niches.'
anchors=root/'.local/station-detail/anchors.json';anchors.parent.mkdir(parents=True,exist_ok=True)
anchors.write_text(json.dumps({'task':'K027','status':'proposal only; coordinator resolves integration','coordinateSystem':'native X east Y up Z north','source':spec['reference'],'floor':spec['floor'],'floorY':34.62,'occupied':occupied},indent=2))

geometry=root/'.local/station-detail/candidate/geometry.json'
if geometry.exists():
 a=json.loads(anchors.read_text());a['meshOccupied']=json.loads(geometry.read_text())['objects'];anchors.write_text(json.dumps(a,indent=2))
