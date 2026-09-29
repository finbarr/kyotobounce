"""Fit the central lift core and western receiving routes to retained floor datums."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
# Coordinates are a model fit to the operator's plan and existing floor heights,
# not surveyed dimensions. The east-facing shaft opens into the recessed lobby.
X,Z=-39,-3;B1=-4.913582801818848;B2=-8.713582992553711;B3=B2-3.6;U=7.349999904632568
hole=box(X-1.35,Z-1.6,X+1.6,Z+1.6);lobby=box(X-1.75,-6.5,-33.1,-1.25)
def top(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  t=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in t):
   q=Polygon([(v['x'],v['z'])for v in t])
   if q.area>1e-10:faces.append(q)
 return unary_union(faces)

slabs=[];retired=[]
for id,cut in [('west-v2-intermediate-0',hole.union(lobby))]:
 p=panels[id];q=top(p);kept=q.difference(cut);assert kept.is_valid and kept.geom_type=='Polygon';assert q.intersection(hole).area>9
 assert abs(q.area-kept.area-q.intersection(cut).area)<1e-5
 slabs.append(dict(id=id,shape=mapping(kept),originalShape=mapping(q),cut=mapping(cut),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']));retired.append(id)
for id in ['porta-connection-west-wall','gate-west-access-entry-north-wall']:assert id in panels;retired.append(id)
materials=[p for p in layout['authoredMaterials']if p['id']in {s['appearance']for s in slabs}]
spec=dict(modifiedPanelIds=['concourse'],shaftBounds=dict(minX=X-1.35,maxX=X+1.6,minZ=Z-1.6,maxZ=Z+1.6),parentLayoutSha256=m['layoutSha256'],componentPrefix='central-lift-',origin=dict(x=X,y=B3,z=Z),yaw=-90,lower=B3,upper=U,levels=[B3,B2,B1,0,U],opening=mapping(hole),upperLobby=mapping(lobby),slabs=slabs,retiredIds=retired,retiredLights=[],materials=materials,b1JoinX=-15.8954496383667,b1NorthZ=10.6552095413208)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print(dict(retired=retired,levels=spec['levels'],shaftArea=hole.area))
