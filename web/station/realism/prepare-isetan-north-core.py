"""Move the north lift clear of the public stairs and serve B3 through 5F."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping,shape
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];l=json.loads(raw);panels={p['id']:p for p in l['panels']}
old_lift=next(e for e in l['lifts']if e['id']=='isetan-north-lift');X,Z=-96,30
levels=[old_lift['origin']['y']+s['height']for s in old_lift['stops']]+[max(v['y']for v in panels['west-north-floor-0'+str(i)]['vertices'])for i in [1,2,3]]
ceiling_ids=['isetan-lift-parking-lobby-ceiling','isetan-lift-rebuilt-isetan-basement-b2-ceiling','isetan-lift-rebuilt-isetan-ground-b1-ceiling','isetan-lift-rebuilt-isetan-stair-ground-ceiling','isetan-escalators-isetan-third-second-ceiling','isetan-escalators-isetan-third-ceiling','isetan-fifth-isetan-fourth-ceiling','isetan-fifth-ceiling']
ceilings=[max(v['y']for v in panels[id]['vertices'])for id in ceiling_ids]
hole=box(X-1.6,Z-1.6,X+1.6,Z+1.35);hall=box(-100,14.4,-86,34);old_hole=box(-92.35,10.4,-89.4,13.6)
def top_shape(p):
 y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-5 for v in vs):
   q=Polygon([(v['x'],v['z'])for v in vs])
   if q.area>1e-12:faces.append(q)
 return unary_union(faces)
def shapes(q):return [mapping(g)for g in (q.geoms if q.geom_type=='MultiPolygon'else[q])if not g.is_empty and g.area>1e-8]
old_floor_ids=['isetan-lift-parking-lobby-floor']+[id for id in panels if id.startswith('isetan-lift-rebuilt-')]
retired=[id for id in panels if id.startswith('isetan-lift-') and not id.startswith(('isetan-lift-rebuilt-','isetan-lift-parking-','isetan-lift-garage-','isetan-lift-stair-wall-','isetan-lift-entrance-label'))]
retired.extend(id for id in panels if id.startswith(('isetan-basement-b1-north-wall-counter-1-','isetan-basement-b2-north-wall-counter-1-')))
retired.extend(id for id in panels if id.startswith(('isetan-second-north-perimeter--95-','isetan-second-north-perimeter--85-')))
retired_lights=['isetan-lift-lamp-'+str(i)for i in range(5)]
# Repair the old shaft holes, including its parking floor, and cut the new
# vertical core only through slabs whose actual top faces overlap its footprint.
slabs=[]
for p in l['panels']:
 if p['role']not in ('floor','building-floor','ceiling'):continue
 top=max(v['y']for v in p['vertices']);bottom=min(v['y']for v in p['vertices'])
 if top<levels[0]-.01 or bottom>levels[-1]+2.8:continue
 before=top_shape(p)
 restore=p['id']in old_floor_ids
 cut=hole if before.intersection(hole).area>1e-7 else Polygon()
 if not restore and cut.is_empty:continue
 assert not p.get('uv'),p['id']
 if restore:
  rings=[Polygon(r)for r in before.interiors];repair=[r for r in rings if r.intersection(old_hole).area>old_hole.area*.99];assert len(repair)==1,p['id']
  restored=Polygon(before.exterior,[r.exterior.coords for r in rings if r not in repair])
 else:restored=before
 after=restored.difference(cut);assert after.is_valid and after.geom_type=='Polygon',p['id']
 slabs.append(dict(id=p['id'],original=mapping(before),shape=mapping(after),restored=restore,top=top,bottom=bottom,appearance=p['appearance'],role=p['role'],material=p['material'],collision=p['collision']))
 retired.append(p['id'])
# Six lower halls extend the existing northern boundary. The two upper rooms
# already wrap into this wing, so they only need the shaft opening and landing.
fills=[]
for i in range(6):
 for kind,y,depth in [('floor',levels[i],.24),('ceiling',ceilings[i],.2)]:
  existing=[]
  for p in l['panels']:
   if p['role']not in ('floor','building-floor','ceiling')or abs(max(v['y']for v in p['vertices'])-y)>.00001:continue
   s=next((s for s in slabs if s['id']==p['id']),None);existing.append(shape(s['shape'])if s else top_shape(p))
  infill=hall.difference(unary_union(existing)).difference(hole)
  fills.append(dict(floor=i,kind=kind,y=y,depth=depth,shapes=shapes(infill),area=infill.area))
# Disjoint cut volumes: occupied hall interiors, plus the gaps between them
# where the new shaft continues. Public stairs are checked independently.
volumes=[[[-100,-86],[levels[i]-.02,ceilings[i]+.02],[14.4,34]]for i in range(6)]
bottom=levels[0]-.5
for i in range(6):
 if bottom<levels[i]-.02:volumes.append([[X-1.6,X+1.6],[bottom,levels[i]-.02],[Z-1.6,Z+1.35]])
 bottom=ceilings[i]+.02
volumes.append([[X-1.6,X+1.6],[bottom,levels[-1]+3.24],[Z-1.6,Z+1.35]])
for i,a in enumerate(volumes):
 for b in volumes[i+1:]:assert any(a[k][1]<=b[k][0]or b[k][1]<=a[k][0]for k in range(3))
def clipped_area(vs,bounds):
 poly=[[v[k]for k in ('x','y','z')]for v in vs]
 for axis,(low,high)in enumerate(bounds):
  for bound,sign in [(low,1),(high,-1)]:
   kept=[]
   for i,a in enumerate(poly):
    b=poly[(i+1)%len(poly)];da=sign*(a[axis]-bound);db=sign*(b[axis]-bound)
    if da>=0:kept.append(a)
    if (da>=0)!=(db>=0):
     t=da/(da-db);kept.append([x+(y-x)*t for x,y in zip(a,b)])
   poly=kept
 area=0
 for i in range(1,len(poly)-1):
  a=[poly[i][k]-poly[0][k]for k in range(3)];b=[poly[i+1][k]-poly[0][k]for k in range(3)];cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];area+=sum(v*v for v in cross)**.5/2
 return area
cuts={}
for p in l['panels']:
 if p['id']in retired or not p['id'].startswith(('isetan-','west-north-'))or p['role']in ('floor','building-floor','ceiling'):continue
 b=[(min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices']))for k in ('x','y','z')];possible=[v for v in volumes if all(a<hi and z>lo for(a,z),(lo,hi)in zip(b,v))]
 if not possible:continue
 # Keep the room's existing floor joints and ceiling fixtures. Only the car
 # shaft itself needs their removal; occupied hall cuts target solid obstacles.
 if p.get('collision')is False and (b[0][1]<=X-1.6 or b[0][0]>=X+1.6 or b[2][1]<=Z-1.6 or b[2][0]>=Z+1.35):continue
 ts=[[p['vertices'][k]for k in p['triangles'][i:i+3]]for i in range(0,len(p['triangles']),3)];areas=[sum(clipped_area(t,v)for t in ts)for v in possible];selected=[v for v,a in zip(possible,areas)if a>1e-7]
 if not selected:continue
 total=sum(clipped_area(t,[(a-.01,z+.01)for a,z in b])for t in ts)
 if abs(total-sum(areas))<1e-6 or p['role']=='sign':retired.append(p['id'])
 else:
  assert not p.get('uv'),p['id']
  cuts[p['id']]=selected
# Every generated stair above the hall must have a separate foundation panel,
# so no implicit solid stair volume is accidentally left through the new room.
for f in l['flights']:
 for i,(row,back)in enumerate(zip(f['contours'],f['contours'][1:])):
  y=f['baseElevation']+i*f['rise']
  if y<levels[0]or y>levels[-1]+3.24:continue
  for k in range(len(row['points'])-1):
   q=[row['points'][k],row['points'][k+1],back['points'][k+1],back['points'][k]];plan=unary_union([Polygon([(q[n]['x'],q[n]['y'])for n in ids])for ids in [(0,1,2),(0,2,3)]])
   assert plan.intersection(hole).area<1e-8,('New shaft hits public stair',f['id'],i)
   if f.get('foundationDepth',0)>0:assert plan.intersection(hall).area<1e-8 or y<levels[0],('Unresolved generated foundation',f['id'])
used={p['appearance']for p in slabs};spec=dict(componentPrefix='isetan-north-core-',parentLayoutSha256=m['layoutSha256'],origin=dict(x=X,y=levels[0],z=Z),yaw=0,levels=levels,ceilings=ceilings,hall=mapping(hall),opening=mapping(hole),oldOpening=mapping(old_hole),slabs=slabs,fills=fills,retiredIds=retired,retiredBoxIds=[],retiredSourceOnlyIds=[],retiredRouteIds=[],retiredLabelIds=[],retiredLights=retired_lights,retiredLiftIds=[old_lift['id']],modifiedFlightIds=[],cuts=cuts,cutVolumes=volumes,materials=[r for r in l['authoredMaterials']if r['id']in used])
assert len(set(retired))==len(retired)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n');print(dict(retired=len(retired),slabs=len(slabs),cuts=len(cuts),floorInfill=sum(f['area']for f in fills if f['kind']=='floor'),levels=levels))
