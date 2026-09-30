"""Refit the 6F doorway and connect store halls with stacked escalators."""
import hashlib,json,sys,math
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw);assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
panels={p['id']:p for p in layout['panels']};F=max(v['y']for v in panels['west-south-floor-04']['vertices']);G=max(v['y']for v in panels['isetan-fifth-west-south-floor-03']['vertices']);C=29.0
edge_z=lambda x:-5.754773252013921+(x+92.62661896124354)*(-7.427726668168112+5.754773252013921)/(-94.91792144185162+92.62661896124354)
room=[[-118.6,-28],[-91.9,-28],[-91.9,-11],[-92.9,-11],[-92.9,edge_z(-92.9)-.18],[-94.8,edge_z(-94.8)-.18],[-94.8,-11],[-111,-11],[-111,21],[-92,21],[-92,34],[-118.6,34]]
volumes=[[[-118.8,-91.65],[F-.04,C],[-28.2,-11]],[[-118.8,-111],[F-.04,C],[-11,21]],[[-118.8,-91.8],[F-.04,C],[21,34.2]],[[-94.9,-92.8],[F-.04,C],[-11,-6.0]],[[-94.55,-93.10],[F-.04,C],[-6.0,-4.5]]]
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
landing_id='north-escalator-upper-landing';landing_shape=top_shape(panels[landing_id]);slabs=[];retired=[id for id in panels if id.startswith('west-south-6f-landing-door-')]+[id for id in panels if id.startswith(('isetan-fifth-up-well-west-','isetan-fifth-down-well-west-'))]
# Retained slabs also overlap the headroom of adjacent public stairs.
public_openings=[]
slab_bottom=min(v['y']for id in ['west-north-floor-04','west-south-floor-04']for v in panels[id]['vertices'])
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
for id,holes in [('west-south-floor-04',upper+[public_cut.intersection(top_shape(panels['west-south-floor-04']))]),('west-north-floor-04',[public_cut.intersection(top_shape(panels['west-north-floor-04']))]),('isetan-fifth-ceiling',ceiling)]:
 p=panels[id];shape=top_shape(p);cut=unary_union(holes);kept=shape.difference(cut);assert kept.is_valid and kept.geom_type=='Polygon' and cut.difference(shape).area<1e-8
 slabs.append(dict(id=id,shape=mapping(kept),original=mapping(shape),cut=mapping(cut),top=max(v['y']for v in p['vertices']),bottom=min(v['y']for v in p['vertices']),appearance=p['appearance'],material=p['material'],role=p['role'],collision=p['collision']));retired.append(id)
# Keep the public landing; refit the former doorway clear of the stair flight.
preserved=[landing_id]
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
approach=[[-94.4,edge_z(-94.4)-.3],[-93.25,edge_z(-93.25)-.3],[-93.25,edge_z(-93.25)+.15],[-94.4,edge_z(-94.4)+.15]]
footprint=unary_union([Polygon(room),Polygon(approach)]);floor_ids=['west-north-floor-04','west-south-floor-04'];retained_floor=unary_union([top_shape(panels[id])for id in floor_ids]+[landing_shape]);infill=footprint.difference(retained_floor);parts=list(infill.geoms)if infill.geom_type=='MultiPolygon'else[infill]
# The hall stays inside the retained western facade and clear of the
# remaining implicit stair foundations. Already explicit foundations are cut
# only within the declared room volumes.
for f in layout['flights']:
 if not f.get('foundationDepth'):continue
 a,b=f['contours'][0]['points'],f['contours'][-1]['points'];fp=unary_union([Polygon([(p['x'],p['y'])for p in t])for i in range(len(a)-1)for t in [[a[i],a[i+1],b[i+1]],[a[i],b[i+1],b[i]]]])
 assert f['baseElevation']-.31<=F or fp.intersection(footprint).area<1e-8,('Unresolved generated foundation',f['id'])
used={p['appearance']for p in slabs+chassis}
spec=dict(componentPrefix='isetan-sixth-',parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],modifiedFlightIds=[],retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,cutVolumes=volumes,floor=F,lowerFloor=G,ceiling=C,room=room,approach=approach,landingPanelId=landing_id,preservedIds=preserved,retainedFloorIds=floor_ids,infill=[dict(outer=list(p.exterior.coords)[:-1],holes=[list(h.coords)[:-1]for h in p.interiors])for p in parts if p.area>1e-8],infillArea=infill.area,slabs=slabs,banks=banks,template=template,chassis=chassis,materials=[r for r in layout['authoredMaterials']if r['id']in used],pitHalfWidth=half,pitBack=back,retainedEscalatorIds=['isetan-fifth-up','isetan-fifth-down'])
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n');print(dict(retired=len(retired),cuts=len(cuts),infillArea=infill.area,floor=F,rise=F-G))
