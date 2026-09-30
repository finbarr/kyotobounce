"""Fit the roof entrance stair and 11F public aisle to the retained station."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union

manifest,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert Path('.local').resolve() in out.resolve().parents
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw)
panels={p['id']:p for p in layout['panels']}
def top_shape(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-10:faces.append(q)
 return unary_union(faces)
F=max(v['y']for v in panels['north-circulation-landing-14']['vertices'])
G=max(v['y']for v in panels['garden-promenade-public-floor']['vertices'])
X,Z=-237,-5.8;steps=28;tread=.32;end=X-steps*tread
well=box(end,-7.9,X+.1,-3.7)
roof=box(-251,-8.4,-244,5.4).difference(well)
hall=unary_union([box(-244,-18,-153,-10),box(-240,-10,-233,-3.2),box(-158,-22.15,-146.5,-18)])
existing=unary_union([top_shape(p)for p in layout['panels']if p['role']in ('floor','building-floor','landing')and abs(max(v['y']for v in p['vertices'])-F)<1e-5])
infill=hall.difference(existing)
assert roof.is_valid and infill.is_valid
retired=[id for id in panels if id.startswith('garden-promenade-edge-8-')];assert len(retired)==7
# Disjoint room volumes: the roof landing, covered straight flight, and the
# lower receiving aisle. Keep the building outside this public connection.
volumes=[
 [[-251,-244],[F-.6,G+4.5],[-8.4,5.4]],
 [[-244,-233],[F-.6,G+4.5],[-8.4,-1.7]],
 [[-240,-233],[F-.6,F+3.8],[-10,-8.4]],
 [[-244,-147],[F-.6,F+3.8],[-18,-10]],
]
cuts={'municipal-station-wing-west-Untitled.'+n:volumes for n in ('199','201','203')}
spec=dict(componentPrefix='garden-store-entry-',parentLayoutSha256=m['layoutSha256'],floor=F,gardenFloor=G,startX=X,endX=end,centerZ=Z,steps=steps,tread=tread,rise=(G-F)/steps,well=mapping(well),roofFloor=mapping(roof),hall=mapping(hall),infill=mapping(infill),infillArea=infill.area,retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],retiredRouteIds=[],retiredLabelIds=[],retiredLights=[],modifiedFlightIds=[],cuts=cuts,preservedOverlapArea={id:0 for id in retired})
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print(dict(floor=F,garden=G,rise=spec['rise'],infillArea=infill.area,retired=len(retired)))
