"""Fit the 4F store around the public Grand Stairway and north-side stairs."""
import hashlib,json,sys,math
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw);assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
panels={p['id']:p for p in layout['panels']};F=max(v['y']for v in panels['muromachi-square']['vertices']);C=18.835
floor_ids=['west-north-floor-02','west-south-floor-02','muromachi-square','muromachi-south-connection']
room=[[-118.6,-28],[-75,-28],[-75,-6],[-91,-6],[-91,24.5],[-73,24.5],[-73,34],[-118.6,34]]
forecourt=[[-74,22],[-71.15,22],[-71.15,30],[-74,30]]
footprint=unary_union([Polygon(room),Polygon(forecourt)])
def top(p):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-F)<1e-5 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
retained=unary_union([top(panels[id])for id in floor_ids]);infill=footprint.difference(retained)
parts=list(infill.geoms)if infill.geom_type=='MultiPolygon'else[infill]
volumes=[[[-118.8,-72.8],[F-.04,C],[-28.2,-6]],[[-118.8,-91],[F-.04,C],[-6,24.5]],[[-118.8,-71.8],[F-.04,C],[24.5,34.2]]]
# These room volumes touch only at their boundaries, so removed face areas add.
for i,a in enumerate(volumes):
 for b in volumes[i+1:]:assert any(a[k][1]<=b[k][0]or b[k][1]<=a[k][0]for k in range(3))
def clipped_area(vs,bounds):
 poly=[[v[k]for k in ['x','y','z']]for v in vs]
 for axis,(low,high)in enumerate(bounds):
  for bound,sign in [(low,1),(high,-1)]:
   kept=[]
   for i,a in enumerate(poly):
    b=poly[(i+1)%len(poly)];da=sign*(a[axis]-bound);db=sign*(b[axis]-bound)
    if da>=0:kept.append(a)
    if (da>=0)!=(db>=0):
     u=da/(da-db);kept.append([x+(y-x)*u for x,y in zip(a,b)])
   poly=kept
 area=0
 for i in range(1,len(poly)-1):
  a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)];cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];area+=sum(x*x for x in cross)**.5/2
 return area

retired=[];cuts={}
for p in layout['panels']:
 if p['id']in floor_ids:continue
 if not(p['id'].startswith(('west-north-','west-south-')) or p['id'].startswith('isetan-ground-')and p.get('role')=='foundation' or p['id'].startswith('north-side-')and p.get('role')=='parapet'):continue
 b=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')]
 possible=[v for v in volumes if all(a<hi and z>lo for (a,z),(lo,hi)in zip(b,v))]
 if not possible:continue
 triangles=[[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)]
 amounts=[sum(clipped_area(t,v)for t in triangles)for v in possible]
 selected=[v for v,area in zip(possible,amounts)if area>1e-7]
 if not selected:continue
 total=sum(clipped_area(t,[(a-.01,z+.01)for a,z in b])for t in triangles)
 if abs(total-sum(amounts))<1e-6:retired.append(p['id'])
 else:cuts[p['id']]=selected
assert retired and cuts
def polygons(shape):
 parts=list(shape.geoms)if shape.geom_type=='MultiPolygon'else[shape]
 return [dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in parts if p.area>1e-8]
# Generated foundations use just the first and last contour (StationWorld.cs).
# Replace only the two foundations crossing this room with closed solids that
# retain their exact footprint and height outside the declared opening.
room_cut=unary_union([box(v[0][0],v[2][0],v[0][1],v[2][1])for v in volumes])
foundations=[]
for f in layout['flights']:
 if not f.get('foundationDepth'):continue
 a,b=f['contours'][0]['points'],f['contours'][-1]['points']
 fp=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
 inside=fp.intersection(room_cut);top=f['baseElevation']-.31;bottom=top-f['foundationDepth']
 if inside.area<1e-8 or top<=F-.04 or bottom>=C:continue
 assert f['id'].startswith('north-side-flight-') and top>C
 pieces=[]
 for shape,lo,hi in [(fp.difference(room_cut),bottom,top),(inside,bottom,F-.04),(inside,C,top)]:
  pieces.extend(dict(**p,bottom=lo,top=hi)for p in polygons(shape)if hi>lo)
 foundations.append(dict(flightId=f['id'],sourceId=f['id']+' foundation',footprint=polygons(fp),bottom=bottom,top=top,removedVolume=inside.area*(C-F+.04),pieces=pieces))
assert [f['flightId']for f in foundations]==['north-side-flight-03','north-side-flight-04']
source_only=[f['sourceId']for f in foundations]
spec=dict(componentPrefix='isetan-fourth-',parentLayoutSha256=m['layoutSha256'],retiredIds=retired+source_only,retiredBoxIds=[],retiredSourceOnlyIds=source_only,modifiedFlightIds=[f['flightId']for f in foundations],foundations=foundations,retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,cutVolumes=volumes,floor=F,ceiling=C,room=room,forecourt=forecourt,retainedFloorIds=floor_ids,infill=[dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in parts if p.area>1e-8],infillArea=infill.area)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n');print(dict(retired=len(retired),cuts=len(cuts),infillArea=infill.area,floor=F))
