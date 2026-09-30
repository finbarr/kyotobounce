"""Open one north-bank shaft through the five constructed Isetan floors."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union

manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
X,Z=-91,12;B3=-12.31358299255371;B2=-8.713582992553711;B1=-4.913582801818848;G=.006;U=7.349999904632568
hole=box(X-1.35,Z-1.6,X+1.6,Z+1.6)
def top(p):
 y=max(v['y'] for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k] for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z']) for v in vs])
   if q.area>1e-10:faces.append(q)
 return unary_union(faces)

slabs=[];retired=[]
for id in ['isetan-basement-b1-floor','isetan-basement-b2-ceiling','isetan-ground-floor','isetan-ground-b1-ceiling','isetan-stair-ground-ceiling','isetan-stair-second-floor','isetan-parking-b2-floor']:
 p=panels[id];assert not p.get('uv'),id
 before=top(p);after=before.difference(hole)
 assert before.covers(hole) and after.is_valid and after.geom_type=='Polygon',id
 assert abs(before.area-after.area-hole.area)<1e-5
 slabs.append(dict(id=id,shape=mapping(after),originalShape=mapping(before),top=max(v['y'] for v in p['vertices']),bottom=min(v['y'] for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']))
 retired.append(id)
for floor in ['b1','b2']:
 ids=[id for id in panels if id.startswith('isetan-basement-'+floor+'-north-island-1-')]
 assert len(ids)==7;retired+=ids
retired.append('isetan-parking-garage-west-south')
cuts={id:[[X-1.5,X+1.6],[B3-.6,U+3.45],[Z-1.75,Z+1.75]] for id in ['isetan-ground-daikaidan-flight-03-foundation','isetan-ground-daikaidan-flight-04-foundation']}
assert all(panels[id].get('normals') for id in cuts)
spec=dict(componentPrefix='isetan-lift-',parentLayoutSha256=m['layoutSha256'],origin=dict(x=X,y=B3,z=Z),yaw=-90,lower=B3,upper=U,levels=[B3,B2,B1,G,U],opening=mapping(hole),slabs=slabs,retiredIds=retired,retiredLights=[],modifiedFlightIds=[],modifiedPanelIds=list(cuts),cuts=cuts,materials=[p for p in layout['authoredMaterials'] if p['id'] in {s['appearance'] for s in slabs}])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n')
print(dict(retiredPanels=len(retired),slabs=len(slabs),modifiedPanels=list(cuts),levels=spec['levels']))
