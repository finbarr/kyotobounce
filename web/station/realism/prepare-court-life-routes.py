"""Route hypotheses for the changed courtyard geometry; native walks remain mandatory."""
import json,sys,hashlib
from pathlib import Path
spec_path,base_path,out=map(Path,sys.argv[1:]);s=json.loads(spec_path.read_text());r=json.loads(base_path.read_text());f=s['frame'];O=f['origin'];D=f['forward'];A=f['south'];Y=f['floorY'];P=lambda u,v,h=0:[O[0]+u*D[0]+v*A[0],Y+h,O[2]+u*D[2]+v*A[2]]
lookup={p['id']:p for p in r['routes']+r['additionalRoutes']};changes=[]
def replace(id,points,reason):
 old=lookup[id]['points'];lookup[id]['points']=points;changes.append({'id':id,'oldPoints':old,'reason':reason,'oldEndpointsPreserved':old[0]==points[0] and old[-1]==points[-1]})
# All seven established main paths stay exact; the table placement clears their endpoints.
for id in ['niwa-entrance-0','garden-to-niwa-0']:
 q=lookup[id]['points'];replace(id,q[:-3]+[P(43.8,14.8),P(44.12,14.8),P(47,14.8,.7929726558515355),q[-1]],'Pass south of the near planter, retaining the same entrance and original endpoints.')
q=lookup['garden-to-niwa-1']['points'];replace('garden-to-niwa-1',[q[0],P(30,14.199),P(40.9,14.199)]+q[1:],'Use the open north aisle around the September dining furniture; retain the original courtyard and cafe endpoints.')
q=lookup['niwa-lower-walkway-length']['points'];replace('niwa-lower-walkway-length',[q[0],P(42.5,20),P(39.9,20),P(39.9,31.3)],'The expanded terrace covers the old straight walk and endpoint. Follow its western pale aisle and finish at v31.3, within the established garden floor; ground beyond the south edge is not a supported continuation.')
for v in [25,30]:
 pts=[P(41.3,20.5),P(41.85,20.5),P(41.85,22.2,.3171890623406142),P(41.85,24.8,.6343781246812284),P(41.85,29,.6343781246812284),P(43.5,29,.7929726558515355),P(45.8,29,.7929726558515355),P(45.8,v,.7929726558515355)]
 replace('niwa-stone-terrace-v'+str(v),pts,'Replace the former uniform lateral flight with the five-level sculpted front approach, ending on the narrow cafe-side upper landing. Both endpoints move to legitimate surfaces in the same access area.')
r.update(meaning='Courtyard route candidates for the sculpted terrace, near planter and September dining furniture; not validated until native walks and browser clearance pass.',reason='Retain all seven main court endpoints. Additional cafe access routes follow the reconstructed circulation rather than the retired uniform terrace.',courtLifeSpecSha256=hashlib.sha256(spec_path.read_bytes()).hexdigest(),parentRoutesSha256=hashlib.sha256(base_path.read_bytes()).hexdigest(),changes=changes)
assert not out.exists() and Path('.local').resolve() in out.resolve().parents;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'routes':len(r['routes'])+len(r['additionalRoutes']),'changedRoutes':len(changes)}))
