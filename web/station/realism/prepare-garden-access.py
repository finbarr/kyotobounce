"""Fit a westward garden flight to the corrected Grand Stairway arrival."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString,box,mapping
from shapely.ops import unary_union

manifest,out=map(Path,sys.argv[1:])
assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
l=json.loads(raw);panels={p['id']:p for p in l['panels']}

def top_shape(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)

F=max(v['y']for v in panels['north-circulation-landing-14']['vertices'])
G=max(v['y']for v in panels['k008-garden-deck-arrival']['vertices'])
X,Z=-148.8,-23.8;count=28;run=.31;end=X-count*run
rise=(G-F)/count;assert .14<rise<.20
well=box(end,Z-1.45,X+.1,Z+1.45)
decks=[p for p in l['panels']if p['id'].startswith('k008-garden-deck-')]
before=unary_union([top_shape(p)for p in decks]);old_hole=box(-157.3000030517578,-31,-154.6999969482422,-22.31999969482422)
whole=unary_union([before,old_hole]);after=whole.difference(well)
assert whole.is_valid and after.is_valid and after.geom_type=='Polygon'
lower=unary_union([top_shape(p)for p in l['panels']if p['role']in ('floor','building-floor','landing')and abs(max(v['y']for v in p['vertices'])-F)<1e-5])
apron=box(X,Z-1.35,-146.5,Z+1.35);infill=apron.difference(lower)
assert infill.is_valid and infill.geom_type=='Polygon'
landing=top_shape(panels['north-circulation-landing-14'])
edges=[]
for z in [Z-1.35,Z+1.35]:
 q=landing.intersection(LineString([(-170,z),(-140,z)]))
 x=min(v[0]for g in (q.geoms if hasattr(q,'geoms')else [q])for v in g.coords)
 edges.append([[X,z],[x,z]])
retired=[p['id']for p in l['panels']if p['id'].startswith(('k008-garden-access-','k008-garden-stair-well-','k008-stair-side-infill-','k008-apron-','k008-garden-deck-'))or p['id']=='k008-landing14-width-extension']
assert len(retired)==42
cuts={id:[[[end,X+.1],[G-.6,G+.01],[Z-1.45,Z+1.45]]]for id in ['west-south-floor-10','west-south-slab-edge-10-5-0']}
spec=dict(componentPrefix='garden-access-',parentLayoutSha256=m['layoutSha256'],floor=F,gardenFloor=G,startX=X,endX=end,centerZ=Z,steps=count,tread=run,rise=rise,well=mapping(well),oldWell=mapping(old_hole),gardenBefore=mapping(before),gardenWhole=mapping(whole),gardenAfter=mapping(after),apron=mapping(apron),infill=mapping(infill),infillArea=infill.area,lowerGuardEdges=edges,retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],retiredRouteIds=[],retiredLabelIds=[],retiredLights=[],modifiedFlightIds=[],cuts=cuts,preservedOverlapArea={p['id']:0 for p in decks},materials=[r for r in l['authoredMaterials']if r['id']in ('station-additions-garden-paving','garden-garden-steel','garden-garden-guard-glazing')])
out.mkdir(parents=True,exist_ok=True)
(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print(dict(retired=len(retired),cuts=list(cuts),floor=F,garden=G,rise=rise,infill=infill.area))
