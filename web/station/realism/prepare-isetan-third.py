"""Fit a third-floor connection around the retained western floor plates."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union

manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw)
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
panels={p['id']:p for p in layout['panels']}
floor_ids=['west-north-floor-01','west-south-floor-01','west-3f-landing']
floor=max(v['y']for v in panels['west-3f-landing']['vertices'])
def footprint(p):
 top=max(v['y']for v in p['vertices']);faces=[]
 assert abs(top-floor)<1e-5
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-top)<1e-5 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
retained=unary_union([footprint(panels[id])for id in floor_ids])
well=[[-86.3,-77.8],[8.2,14.2]];hole=box(well[0][0],well[1][0],well[0][1],well[1][1]);hall=box(-123,-28,-69,16)
assert retained.intersection(hole).area<1e-8
infill=hall.difference(retained).difference(hole)
pieces=list(infill.geoms) if infill.geom_type=='MultiPolygon' else [infill]
assert abs(unary_union([infill,retained.intersection(hall)]).area-(hall.area-hole.area))<1e-7
volume=[[-123.2,-68.99],[11.14,14.46],[-28.2,16.2]]
retired=['isetan-second-ceiling','isetan-stair-lower-opening-guard'];cuts={}
for p in layout['panels']:
 if p['id']in floor_ids:continue
 if not (p['id'].startswith(('west-north-','west-south-')) or p['id'].startswith('isetan-ground-') and p.get('role')=='foundation'):continue
 b=[[min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices'])]for k in ('x','y','z')]
 if not all(a<hi and z>lo for (a,z),(lo,hi)in zip(b,volume)):continue
 if all(all(lo<=v[k]<=hi for k,(lo,hi)in zip(('x','y','z'),volume))for v in p['vertices']):retired.append(p['id'])
 else:cuts[p['id']]=volume
assert len(cuts)>15 and len(retired)>2
spec=dict(componentPrefix='isetan-third-',parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],modifiedFlightIds=[],retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,well=well,ground=7.35,second=floor,ceiling=14.46,stepsPerFlight=12,going=.3,retainedFloorIds=floor_ids,infill=[dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in pieces],infillArea=infill.area)
out.mkdir(parents=True,exist_ok=True)
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print(dict(retired=len(retired),cuts=len(cuts),infillArea=infill.area,floor=floor,stairRise=(floor-7.35)/24))
