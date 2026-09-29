"""Extract exact replacement scope for the eastern paid underpass and its floor openings."""
from pathlib import Path
import sys,json,hashlib
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];l=json.loads(raw)
by={p['id']:p for p in l['panels']};retired=set();floors=[]
start=126.68;end=140;low=-6.2
platforms=[('0','platform-zero-east-floor',-37.5,9),('2-3','railway-2-3-platform',-52.2,9.5),('4-5','railway-4-5-platform',-78.2,10.1),('6-7','railway-6-7-platform',-94.5,8.7),('8-9','railway-8-9-platform',-111,9.4),('10','kintetsu-corrected-railway-10-platform',-124,4.2)]
steps=[];holes=[]
for label,id,z,width in platforms:
 half=1.2 if label=='10' else 1.8
 hole=Polygon([(start,z+.018*start-half),(end,z+.018*end-half),(end,z+.018*end+half),(start,z+.018*start+half)])
 holes.append(hole);steps.append({'label':label,'panel':id,'z':z,'half':half,'platformWidth':width,'start':start,'midA':start+5.76,'midB':start+7.56,'end':end,'hole':mapping(hole)})
transfer=box(133,-155.36,139,-134.5)
def footprint(p):
 y=max(v['y'] for v in p['vertices']);parts=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][j]for j in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-6 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-10:parts.append(q)
 q=unary_union(parts);assert q.is_valid
 return q,y,y-min(v['y'] for v in p['vertices'])
for id,cuts in [(s['panel'],[h])for s,h in zip(steps,holes)]+[('railway-railway-subgrade',holes),('shinkansen-ground-floor',[transfer]),('hachijo-east-paid-floor',[transfer])]:
 p=by[id];q,y,d=footprint(p);result=q.difference(unary_union(cuts));assert result.is_valid and not result.is_empty
 retired.add(id);floors.append({'id':id,'top':y,'depth':d,'appearance':p['appearance'],'material':p['material'],'role':p['role'],'polygons':[mapping(g)for g in getattr(result,'geoms',[result])]})
retired.add('hachijo-east-paid-north')
# Shift only the existing Porta stair/ramp connection north by 14m, clear of the JR paid passage.
# The two approach corridors remain joined to the unchanged mall at Z-14.
move=[];discard=[]
for p in l['panels']:
 id=p['id'];name=id.removeprefix('porta-connection-')
 if not id.startswith('porta-connection-'):continue
 if name.startswith(('east-aisle','stair-approach','ramp','approach-','upper-','subway-step','stair-ceiling','stair-side','subway-stair','stair-tactile')) or name=='sign-subway' or name.startswith(('light-ramp','light-east','light-approach','light-upper')):
  retired.add(id)
  if name in ('light-east--21','light-approach--21'):discard.append(id)
  else:move.append({'id':id,'clipNorth':name in ('east-aisle','east-aisle-ceiling','ramp-approach','ramp-approach-ceiling') or name.startswith(('east-aisle-side','ramp-approach-side'))})
 if name.startswith(('subway-wall','subway-base','subway-band')):retired.add(id)
for p in l['panels']:
 if p['id'].startswith('subway-passage-wall-joint-147.1-') and -29<float(p['id'].split('147.1-')[1])<-15:retired.add(p['id'])
lights=[r['id']for r in l['authoredLights']if r['id'].startswith('porta-connection-emitter-') and r['position']['z']< -14]
# Columns in new openings need replacement supports outside the wells.
columns=[]
for s,h in zip(steps,holes):
 for p in l['panels']:
  if p['role']!='column' or not p['id'].startswith(('railway-','platform-zero-')):continue
  xs=[v['x']for v in p['vertices']];zs=[v['z']for v in p['vertices']]
  if h.intersects(box(min(xs),min(zs),max(xs),max(zs))):
   retired.add(p['id']);columns.append({'id':p['id'],'stair':s['label'],'x':(min(xs)+max(xs))/2,'offset':(min(zs)+max(zs))/2-s['z']-.018*(min(xs)+max(xs))/2,'top':max(v['y']for v in p['vertices'])})
# No hidden template dependency: every removed object must be present in this parent.
assert retired<=by.keys();out.mkdir(parents=True,exist_ok=True)
r={'parentLayoutSha256':m['layoutSha256'],'retiredIds':sorted(retired),'retiredLights':lights,'floors':floors,'stairs':steps,'transferHole':mapping(transfer),'movePorta':move,'discardPorta':discard,'columns':columns,'low':low,'high':3.675,'portaShift':14}
(out/'spec.json').write_text(json.dumps(r,indent=2)+'\n');print({'retired':len(retired),'floors':len(floors),'movedPorta':len(move),'replacedColumns':columns})
