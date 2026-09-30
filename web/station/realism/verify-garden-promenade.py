"""Independently check the roof floor, relocated garden, and retained stair."""
import hashlib,json,sys,math,struct
from pathlib import Path
from shapely.geometry import Polygon,LineString,box
from shapely.ops import unary_union
parent_path,candidate_path,component,out=map(Path,sys.argv[1:]);read=lambda p:json.loads(p.read_text())
parent=read(parent_path);candidate=read(candidate_path);raw=Path(candidate['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==candidate['layoutSha256']
old=read(Path(parent['layout']));new=json.loads(raw);s=read(component/'spec.json');report=read(component/'report.json');a={p['id']:p for p in old['panels']};b={p['id']:p for p in new['panels']};G=s['floor']
def top_surface(p):
 fs=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-G)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-10:fs.append(q)
 return unary_union(fs)
expected=unary_union([top_surface(a['garden-access-garden-floor']),box(-202.3,-25,-168,5.4),box(-244,-1.7,-202.3,5.4),box(-201.9,5.4,-190,8.4)])
actual=top_surface(b['garden-promenade-public-floor']);error=expected.symmetric_difference(actual).area;assert error<.01,error
clearance=[]
for r in report['geometry']['routes']:
 q=LineString([(v['x'],v['z'])for v in r['points']]).buffer(.24)
 missing=q.difference(actual).area;assert missing<.0001,(r['label'],missing)
 clearance.append(dict(label=r['label'],unsupportedCapsuleArea=missing))
assert len(s['movedIds'])==18
for id in s['movedIds']:
 p=a[id];q=b[s['componentPrefix']+id]
 assert {k:v for k,v in p.items()if k not in ['id','vertices','uv']}=={k:v for k,v in q.items()if k not in ['id','vertices','uv']},id
 f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
 assert q['uv']==[dict(x=f32(v['x']),y=1-f32(1-v['y']))for v in p['uv']],id
 assert len(p['vertices'])==len(q['vertices'])
 assert all(abs(v[k]+s['translation'][k]-w[k])<2e-5 for v,w in zip(p['vertices'],q['vertices'])for k in ['x','y','z']),id
source={o['name']:o for o in read(component/'retired-source.json')}
assert len(s['movedSourceIds'])==243
for id in s['movedSourceIds']:
 o=source[id];q=b[s['componentPrefix']+id];assert len(q['vertices'])==len(o['faces'])*3
 expected=[];normal=[];uv=[]
 for f in o['faces']:
  for i,k in enumerate(f['vertices']):
   v=o['vertices'][k];n=f['normals'][i];length=math.sqrt(sum(x*x for x in n));expected.append(dict(x=f32(v[0]-29),y=f32(v[1]),z=f32(-v[2]+12)));normal.append(dict(x=n[0]/length,y=n[1]/length,z=-n[2]/length));uv.append(dict(x=f32(f['uv'][i][0]),y=1-f32(1-f['uv'][i][1])))
 assert q['vertices']==expected and q['uv']==uv,id
 # JavaScript hypot and Python sqrt can differ by one double-precision ULP.
 assert all(abs(a[k]-b[k])<1e-12 for a,b in zip(q['normals'],normal)for k in a),id
 assert q['triangles']==[k for i in range(0,len(expected),3)for k in [i+2,i+1,i]],id
 original=next((p for p in old['boxes']if p['id']==id),None)
 assert q['collision']==(original.get('collision',True)if original else False),id
assert not set(s['retiredIds'])&set(b)
retained_steps=[p for id,p in a.items()if id.startswith('garden-access-')and id!='garden-access-garden-floor']
for p in retained_steps:assert p==b[p['id']],p['id']
assert new['boxes']==[p for p in old['boxes']if p['id']not in s['retiredBoxIds']]
for key in ['flights','escalators','lifts','beams','authoredLights']:assert old[key]==new[key],key
proof=dict(pass_=True,layoutSha256=candidate['layoutSha256'],geometrySha256=candidate['geometrySha256'],publicFloorArea=actual.area,floorAreaError=error,relocatedObjects=len(s['movedIds'])+len(s['movedSourceIds']),retiredBoxes=len(s['retiredBoxIds']),relocatedDecorativeObjects=len(s['retiredSourceOnlyIds']),translation=s['translation'],retainedStairObjects=len(retained_steps),routes=clearance,allMovingHardwareExact=True)
proof['pass']=proof.pop('pass_');out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
