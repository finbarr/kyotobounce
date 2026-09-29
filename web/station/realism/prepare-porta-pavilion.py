"""Open the retained municipal Porta pavilion and fit its descent to the mall."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,Point,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
opening=dict(minX=37.5,maxX=49,minZ=40,maxZ=51.3);hole=box(opening['minX'],opening['minZ'],opening['maxX'],opening['maxZ'])
def triangles(p):return [[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)]
def top(p):
 y=max(v['y']for v in p['vertices']);return unary_union([Polygon([(v['x'],v['z'])for v in t])for t in triangles(p)if all(abs(v['y']-y)<1e-6 for v in t)])
plaza=panels['municipal-plaza-642152272'];ground=unary_union([Polygon([(v['x'],v['z'])for v in t])for t in triangles(plaza)]);assert hole.difference(ground).area<1e-5

def height(x,z):
 for t in triangles(plaza):
  q=Polygon([(v['x'],v['z'])for v in t])
  if q.area<1e-9 or not q.buffer(1e-8).covers(Point(x,z)):continue
  a,b,c=t;den=(b['z']-c['z'])*(a['x']-c['x'])+(c['x']-b['x'])*(a['z']-c['z']);u=((b['z']-c['z'])*(x-c['x'])+(c['x']-b['x'])*(z-c['z']))/den;v=((c['z']-a['z'])*(x-c['x'])+(a['x']-c['x'])*(z-c['z']))/den
  return u*a['y']+v*b['y']+(1-u-v)*c['y']
 raise AssertionError(('No paving at',x,z))
retired=[p['id']for p in layout['panels']if p['id'].startswith(tuple('porta-plaza-island-'+s+'-'+str(x)+'-'for s in ('south','north')for x in (24,42)))];assert len(retired)==68,len(retired)
retired += ['add-stonemuseum-street-bollard-21','add-stonemuseum-street-bollard-22']
assert all(id in panels for id in retired)
slabs=[]
id='porta-west-lift-rebuilt-porta-plaza-ceiling';p=panels[id];old=top(p);q=old.difference(hole);assert abs(old.area-q.area-hole.area)<1e-4;assert q.geom_type=='Polygon'and q.is_valid
slabs.append(dict(id=id,shape=mapping(q),originalShape=mapping(old),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']));retired.append(id)
# Remove only the synthetic ceiling fittings that cross the new opening.
for p in layout['panels']:
 if not p['id'].startswith(('porta-plaza-ceiling-','porta-plaza-grille-','porta-plaza-fixture-')):continue
 vs=p['vertices'];q=box(min(v['x']for v in vs),min(v['z']for v in vs),max(v['x']for v in vs),max(v['z']for v in vs))
 if q.intersection(hole).area>1e-8:retired.append(p['id'])
retired_lights=[p['id']for p in layout['authoredLights']if p['id'].startswith('porta-plaza-light-')and hole.covers(Point(p['position']['x'],p['position']['z']))]
apron=next(p for p in layout['boxes']if p['id']=='add-stonemuseum-paved-apron');assert apron['center']['y']+apron['size']['y']/2==0 and apron['center']['z']+apron['size']['z']/2==opening['minZ']
spec=dict(parentLayoutSha256=m['layoutSha256'],opening=opening,retiredIds=retired,retiredLights=retired_lights,modifiedPaving=plaza['id'],slabs=slabs,materials=[p for p in layout['authoredMaterials']if p['id']in {s['appearance']for s in slabs}],componentPrefix='porta-pavilion-',lower=-6.2,upper=0,frontZ=39.4,frontEdge=[0,0],approachSurfaceId='add-stonemuseum-paved-apron',forecourtRoute=[dict(x=x,y=0,z=z)for x,z in [(40.5,38),(40.5,38.7),(40.5,39.4)]])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');print({k:spec[k]for k in ['retiredIds','retiredLights','upper','frontEdge']})
