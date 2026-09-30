"""Refit the 7F doorway and connect store halls with stacked escalators."""
import hashlib,json,sys,math
from pathlib import Path
from shapely import set_precision
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw);assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
panels={p['id']:p for p in layout['panels']};F=max(v['y']for v in panels['west-south-floor-05']['vertices']);G=max(v['y']for v in panels['isetan-sixth-west-south-floor-04']['vertices']);C=33.8
edge_z=lambda x:-9.619962536184342+(x+102.35614859800103)*(-11.658603566327734+9.619962536184342)/(-104.43011336511941+102.35614859800103)
# Upper public flights move west at this floor. Jog the west aisle under
# higher flights, then return inside the retained northern building envelope.
room=[[-123.5,-28],[-91.9,-28],[-91.9,-15],[-102.5,-15],[-102.5,edge_z(-102.5)-.18],[-104.2,edge_z(-104.2)-.18],[-104.2,-15],[-120,-15],[-120,14.5],[-112,14.5],[-112,21],[-92,21],[-92,34],[-118.6,34],[-118.6,17],[-123.5,17]]
volumes=[[[-123.6,-91.8],[F-.04,C],[-28.1,-15]],[[-123.6,-120],[F-.04,C],[-15,14.5]],[[-123.6,-112],[F-.04,C],[14.5,17]],[[-118.6,-112],[F-.04,C],[17,21]],[[-118.7,-91.9],[F-.04,C],[21,34.1]],[[-104.3,-102.4],[F-.04,C],[-15,-6.4]]]
for i,a in enumerate(volumes):
 for b in volumes[i+1:]:assert any(a[k][1]<=b[k][0]or b[k][1]<=a[k][0]for k in range(3))
template=next(e for e in layout['escalators']if e['id']=='hall-basement-west-escalator-1');chassis=[p for p in layout['panels']if p['id'].startswith(template['id']+'-')]
prior=json.loads(Path('.local/v2/current/components/isetan-escalators/spec.json').read_text());half=prior['pitHalfWidth'];back=prior['pitBack'];run=(F-G)/math.tan(math.pi/6)
banks=[dict(name=name,lowerCenter=dict(x=-104,y=G,z=z),uphill=dict(x=1,y=0,z=0),run=run,height=F-G,flatLength=template['flatLength'],speed=speed)for name,z,speed in [('up',-20,.5),('down',-17,-.5)]]
upper=[box(-104+back,z-half,-104+run-back,z+half)for z in [-20,-17]];ceiling=[box(-104+back-.1,z-.72,-104+run-back+.1,z+.72)for z in [-20,-17]]
def top_shape(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
def flight_shape(f):
 faces=[]
 for a,b in zip(f['contours'],f['contours'][1:]):
  for i in range(len(a['points'])-1):
   q=[a['points'][i],a['points'][i+1],b['points'][i+1],b['points'][i]]
   faces.extend(Polygon([(q[n]['x'],q[n]['y'])for n in ids])for ids in [(0,1,2),(0,2,3)])
 return unary_union(faces)
landing_ids=['daikaidan-landing-06','north-side-landing-06']
landing_shape=unary_union([flight_shape(f)for f in layout['flights']if f['id']in landing_ids]);slabs=[]
retired=[id for id in panels if id.startswith('west-south-7f-landing-door-')]+[id for id in panels if id.startswith(('isetan-sixth-up-well-west-','isetan-sixth-down-well-west-'))]
# Retained slabs also overlap the headroom of adjacent public stairs.
public_openings=[]
slab_bottom=min(v['y']for id in ['west-north-floor-05','west-south-floor-05']for v in panels[id]['vertices'])
for f in layout['flights']:
 if not f['id'].startswith(('daikaidan-flight-','north-side-flight-')) or not f['baseElevation']+.35<=F or f['baseElevation']+f['rise']*(len(f['contours'])-1)+2.1<=slab_bottom:continue
 faces=[]
 for row,back_row in zip(f['contours'],f['contours'][1:]):
  for k in range(len(row['points'])-1):
   q=[row['points'][k],row['points'][k+1],back_row['points'][k+1],back_row['points'][k]]
   faces.extend(Polygon([(q[n]['x'],q[n]['y'])for n in ids])for ids in [(0,1,2),(0,2,3)])
 public_openings.append(unary_union(faces))
# Leave 0.05 mm around stair footprints so float32 export cannot recreate
# nearly collinear floor slivers across the public stair clearance.
public_cut=unary_union([landing_shape]+[q.buffer(.00005,join_style=2)for q in public_openings])
# Snap sub-micron overlay spikes before triangulation; independent footprint
# checks bound the exported floor error after float32 conversion.
for id,holes in [('west-south-floor-05',upper+[public_cut.intersection(top_shape(panels['west-south-floor-05']))]),('west-north-floor-05',[public_cut.intersection(top_shape(panels['west-north-floor-05']))]),('isetan-sixth-ceiling',ceiling)]:
 p=panels[id];shape=top_shape(p);cut=unary_union(holes);kept=set_precision(shape.difference(cut),.000001).simplify(.000001,preserve_topology=True);assert kept.is_valid and kept.geom_type=='Polygon' and cut.difference(shape).area<1e-8
 slabs.append(dict(id=id,shape=mapping(kept),original=mapping(shape),cut=mapping(cut),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']));retired.append(id)
# Keep the public landing; refit the former doorway clear of the stair flight.
preserved=[]
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

cuts={}
for p in layout['panels']:
 if p['id']in retired+preserved:continue
 if not(p['id'].startswith(('west-north-','west-south-'))or p['id'].startswith(('isetan-ground-','isetan-fourth-','isetan-north-core-'))and p.get('role')=='foundation'or p['id'].startswith('north-side-')and p.get('role')=='parapet'):continue
 b=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')];possible=[v for v in volumes if all(a<hi and z>lo for(a,z),(lo,hi)in zip(b,v))]
 if not possible:continue
 triangles=[[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)]
 amounts=[sum(clipped_area(t,v)for t in triangles)for v in possible];selected=[v for v,area in zip(possible,amounts)if area>1e-7]
 if not selected:continue
 total=sum(clipped_area(t,[(a-.01,z+.01)for a,z in b])for t in triangles)
 if abs(total-sum(amounts))<1e-6:retired.append(p['id'])
 else:cuts[p['id']]=selected
# The existing public landing reaches the fitted doorway. Subtract
# its footprint from both store slabs to avoid duplicate floor sheets.
approach=[[-104.0,edge_z(-104.0)-.3],[-102.7,edge_z(-102.7)-.3],[-102.7,edge_z(-102.7)+.15],[-104.0,edge_z(-104.0)+.15]]
footprint=unary_union([Polygon(room),Polygon(approach)]);floor_ids=['west-north-floor-05','west-south-floor-05'];retained_floor=unary_union([top_shape(panels[id])for id in floor_ids]+[landing_shape]);infill=footprint.difference(retained_floor);parts=list(infill.geoms)if infill.geom_type=='MultiPolygon'else[infill]
# The hall stays inside the retained western facade and clear of the
# remaining implicit stair foundations. Already explicit foundations are cut
# only within the declared room volumes.
for f in layout['flights']:
 if not f.get('foundationDepth'):continue
 a,b=f['contours'][0]['points'],f['contours'][-1]['points'];fp=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
 assert f['baseElevation']-.31<=F or fp.intersection(footprint).area<1e-8,('Unresolved generated foundation',f['id'])
# The browser's store slab was already trimmed against public treads. Preserve
# those coplanar stair triangles explicitly when retiring the old slab mesh.
preserved_browser=[];preserved_shapes=[]
for f in layout['flights']:
 if not f['id'].startswith(('daikaidan-','north-side-')):continue
 for step,(a,b)in enumerate(zip(f['contours'],f['contours'][1:])):
  y=f['baseElevation']+(step+1)*f['rise']
  if abs(y-F)>1e-5:continue
  for i in range(len(a['points'])-1):
   q=[a['points'][i],a['points'][i+1],b['points'][i+1],b['points'][i]]
   for ids in [(0,1,2),(0,2,3)]:
    tri=[[q[n]['x'],y,-q[n]['y']]for n in ids]
    # Browser Y is up. Match the exported top-face winding.
    normal_y=(tri[1][2]-tri[0][2])*(tri[2][0]-tri[0][0])-(tri[1][0]-tri[0][0])*(tri[2][2]-tri[0][2])
    if normal_y<0:tri.reverse()
    preserved_browser.append(dict(id=f['id'],label='Stair stone',points=tri))
    preserved_shapes.append(Polygon([(v[0],-v[2])for v in tri]))
protected=unary_union(preserved_shapes)
preserved_overlap={id:top_shape(panels[id]).intersection(protected).area for id in floor_ids}
used={p['appearance']for p in slabs+chassis}
spec=dict(preservedBrowserTriangles=preserved_browser,preservedOverlapArea=preserved_overlap,componentPrefix='isetan-seventh-',parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],modifiedFlightIds=[],retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,cutVolumes=volumes,floor=F,lowerFloor=G,ceiling=C,room=room,approach=approach,landingFlightIds=landing_ids,landingShape=mapping(landing_shape),preservedIds=preserved,retainedFloorIds=floor_ids,infill=[dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in parts if p.area>1e-8],infillArea=infill.area,slabs=slabs,banks=banks,template=template,chassis=chassis,materials=[r for r in layout['authoredMaterials']if r['id']in used],pitHalfWidth=half,pitBack=back,retainedEscalatorIds=['isetan-sixth-up','isetan-sixth-down'])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n');print(dict(retired=len(retired),cuts=len(cuts),infillArea=infill.area,floor=F,rise=F-G))
