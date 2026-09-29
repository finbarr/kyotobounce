"""Cut the South-gate platform lift without closing existing stair or lift openings."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve()in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
origin=dict(x=177,y=-11.2,z=-129);hole=box(175.4,-130.6,178.6,-127.65)
def top(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][j]for j in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
def row(p,q,suffix=''):
 return dict(id=p['id']+suffix,shape=mapping(q),originalShape=mapping(top(p)),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision'])
retired=[];slabs=[];joints=[]
for id in ['subway-lift-subway-escalators-subway-north-paid-deck','subway-lift-subway-escalators-subway-north-platform-ceiling','subway-lift-subway-escalators-subway-north-platform']:
 p=panels[id];q=top(p);kept=q.difference(hole);assert kept.is_valid and kept.geom_type=='Polygon' and abs(q.area-kept.area-hole.area)<1e-4
 slabs.append(row(p,kept));retired.append(id)
for p in layout['panels']:
 if p['role']!='floor-joint':continue
 vs=p['vertices']
 if min(v['x']for v in vs)>=178.6 or max(v['x']for v in vs)<=175.4 or min(v['z']for v in vs)>=-127.65 or max(v['z']for v in vs)<=-130.6:continue
 q=top(p)
 if q.intersection(hole).area<1e-10:continue
 kept=q.difference(hole);retired.append(p['id'])
 for i,part in enumerate(getattr(kept,'geoms',[kept])):
  if not part.is_empty:joints.append(row(p,part,'-'+str(i)))
materials=[p for p in layout['authoredMaterials']if p['id']in {r['appearance']for r in slabs+joints}]
spec=dict(parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredLights=[],origin=origin,lower=-11.2,upper=-6.2,ceiling=-2.8,hole=mapping(hole),slabs=slabs,joints=joints,materials=materials)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print(dict(retired=len(retired),slabs=len(slabs),joints=len(joints),openingM2=hole.area))
