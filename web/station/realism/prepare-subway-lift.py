"""Cut the lift shaft and open a vestibule from Central 1 into its landing."""
import json, sys, hashlib
from pathlib import Path
from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw)
panels={p['id']:p for p in layout['panels']}
def top(p):
 y=max(v['y'] for v in p['vertices']);triangles=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][j] for j in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z']) for v in vs])
   if q.area>1e-12:triangles.append(q)
 return unary_union(triangles)
hole=box(175.4,4.95,178.6,7.65);retired=[];slabs=[];joints=[]
def row(p,q,suffix=''):
 return dict(id=p['id']+suffix,shape=mapping(q),top=max(v['y'] for v in p['vertices']),bottom=min(v['y'] for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision'])
for id in ['subway-escalators-subway-north-paid-deck','subway-escalators-subway-north-platform-ceiling','subway-escalators-subway-north-platform']:
 p=panels[id];q=top(p);kept=q.difference(hole);assert kept.is_valid and kept.geom_type=='Polygon' and abs(q.area-kept.area-hole.area)<1e-4
 slabs.append(row(p,kept));retired.append(id)
for p in layout['panels']:
 if p['role']!='floor-joint':continue
 if not (min(v['x'] for v in p['vertices'])<178.6 and max(v['x'] for v in p['vertices'])>175.4 and min(v['z'] for v in p['vertices'])<7.65 and max(v['z'] for v in p['vertices'])>4.95):continue
 q=top(p)
 if q.intersection(hole).area<1e-10:continue
 kept=q.difference(hole);retired.append(p['id'])
 for i,part in enumerate(getattr(kept,'geoms',[kept])):
  if not part.is_empty:joints.append(row(p,part,'-'+str(i)))
walls=[panels[id] for id in ['subway-platforms-paid-north-wall-2','subway-north-paid-end-4']]
retired += [p['id'] for p in walls]
materials=[p for p in layout['authoredMaterials'] if p['id'] in {r['appearance'] for r in slabs+joints}]
spec=dict(parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredLights=[],hole=mapping(hole),slabs=slabs,joints=joints,walls=walls,materials=materials)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print(dict(retired=len(retired),slabs=len(slabs),joints=len(joints)))
