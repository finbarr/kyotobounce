"""Fill only the missing parts of horizontal slabs at the retired shafts."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,Point,box,mapping
from shapely.ops import unary_union
out=Path(sys.argv[1]);plan=json.loads((out/'plan.json').read_text());patches=[]
for shaft in plan['shafts']:
 b=shaft['bounds'];area=box(*[b['x'][0],b['z'][0],b['x'][1],b['z'][1]])
 groups={}
 for slab in plan['slabs']:
  if shaft['id'] not in slab['shafts']:continue
  key=tuple(round(y,5) for y in slab['bounds']['y'])
  groups.setdefault(key,[]).append(slab)
 # Merge slabs sharing a face so the new cap has no duplicate coplanar skin.
 merged=[]
 for key,rows in sorted(groups.items()):
  match=next((g for g in merged if key[0]<=g[1]+.00002 and key[1]>=g[0]-.00002),None)
  if match:match[0]=min(match[0],key[0]);match[1]=max(match[1],key[1]);match[2].extend(rows)
  else:merged.append([*key,rows])
 for bottom,top,rows in merged:
  polygons=[Polygon(t) for r in rows for t in r['triangles'] if Polygon(t).area>1e-8]
  if not polygons:continue
  existing=unary_union(polygons)
  # A slab must reach the opening. Never create isolated platforms in air.
  if existing.distance(area)>.002:continue
  missing=area.difference(existing)
  if missing.area<1e-5:continue
  pieces=[missing] if missing.geom_type=='Polygon' else list(missing.geoms)
  for i,p in enumerate(pieces):
   if p.area<1e-5:continue
   p=p.simplify(.000001,preserve_topology=True)
   assert p.is_valid
   material=max(rows,key=lambda r:sum(Polygon(t).area for t in r['triangles']))
   patches.append(dict(id=shaft['id']+'-infill-'+str(len(patches)),boundsY=[bottom,top],appearance=material['appearance'],material=material['material'],role=material['role'],shape=mapping(p),area=p.area,sourceSlabs=[r['id']for r in rows]))
# Street openings lie in sloping municipal paving. Reuse its nearby planes
# instead of adding a horizontal tile above or below the surrounding surface.
for shaft in plan['shafts']:
 if shaft['id'] not in ['porta-west-public-lift','subway-refit-exit-five-lift']:continue
 b=shaft['bounds'];area=box(b['x'][0],b['z'][0],b['x'][1],b['z'][1]);height=shaft['lift']['origin']['y']+shaft['lift']['height'];triangles=[]
 for slab in plan['paving']:
  for t in slab['triangles']:
   poly=Polygon([(v['x'],v['z'])for v in t])
   if poly.area<1e-6 or poly.distance(area)>1 or max(abs(v['y']-height)for v in t)>.5:continue
   triangles.append((poly,t,slab))
 assert triangles,shaft['id']
 missing=area.difference(unary_union([p for p,t,s in triangles]))
 pieces=[missing]if missing.geom_type=='Polygon'else list(missing.geoms)
 for p in pieces:
  if p.area<1e-5:continue
  rings=[]
  for ring in [p.exterior,*p.interiors]:
   coords=[]
   for x,z in list(ring.coords)[:-1]:
    poly,t,slab=min(triangles,key=lambda q:q[0].distance(Point(x,z)))
    a,b,c=t;den=(b['z']-c['z'])*(a['x']-c['x'])+(c['x']-b['x'])*(a['z']-c['z']);u=((b['z']-c['z'])*(x-c['x'])+(c['x']-b['x'])*(z-c['z']))/den;v=((c['z']-a['z'])*(x-c['x'])+(a['x']-c['x'])*(z-c['z']))/den
    y=u*a['y']+v*b['y']+(1-u-v)*c['y'];assert abs(y-height)<.1
    coords.append([x,y,z])
   rings.append(coords)
  slab=min(triangles,key=lambda q:q[0].distance(p.representative_point()))[2]
  patches.append(dict(id=shaft['id']+'-paving-infill',slopedRings=rings,boundsY=[height-.18,height],appearance=slab['appearance'],material=slab['material'],role='public-floor',shape=mapping(p),area=p.area,sourceSlabs=[slab['id']]))
(out/'floor-patches.json').write_text(json.dumps(patches,separators=(',',':'))+'\n')
print('Floor and ceiling patches:',len(patches),'area:',sum(p['area']for p in patches))
