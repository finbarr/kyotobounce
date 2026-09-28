"""Construct landing infills within source plate outlines and the hall floor edge."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,MultiPoint,mapping
from shapely.ops import unary_union
from shapely.affinity import translate
specpath,descentpath,hallpath,out=map(Path,sys.argv[1:]);spec=json.loads(specpath.read_text());desc=json.loads(descentpath.read_text());hall=json.loads(hallpath.read_text());rows=[]
def tops(panel,y):
 vs=panel['vertices'];ps=[]
 for i in range(0,len(panel['triangles']),3):
  q=[vs[k]for k in panel['triangles'][i:i+3]]
  if max(abs(p['y']-y)for p in q)<1e-5:
   p=Polygon([(p['x'],-p['z'])for p in q])
   if p.area>1e-12:ps.append(p)
 return unary_union(ps)
upperfloor=unary_union([tops(p,0)for p in hall['panels']if p['id']=='hall-bay-floor-surface'])
lowerfloor=tops(next(p for p in desc['panels']if p['id']=='hall-basement-lower-floor'),spec['lowerY'])
assert upperfloor.area>400 and lowerfloor.area>100
for b in spec['banks']:
 for end,y,floor in [('upper',0,upperfloor),('lower',spec['lowerY'],lowerfloor)]:
  source=Polygon(b[end+'PlateOutline']);foot=source
  if end=='upper':
   # The source plates stop short of the separately modeled hall floor by ~3 cm.
   # Extend only toward the hall, then clip at the actual floor footprint.
   u=b['uphillRenderer'];foot=unary_union([source,translate(source,xoff=u[0]*.06,yoff=u[2]*.06)]).convex_hull
  covers=[]
  for p in desc['panels']:
   if p['id'].startswith('hall-basement-'+b['name']+'-') and (p['id'].endswith(end+'-pit-cover')or p['id'].endswith(end+'-comb-transfer')):
    covers.append(MultiPoint([(v['x'],-v['z'])for v in p['vertices']]).convex_hull)
  solids=foot.difference(unary_union(covers+[floor])).simplify(1e-6,preserve_topology=True)
  ps=[solids]if solids.geom_type=='Polygon'else list(solids.geoms)
  for i,p in enumerate(ps):
   if p.area<1e-8:continue
   assert p.is_valid
   rows.append(dict(id=f'hall-basement-{b["name"]}-{end}-plate-infill-{i}',y=y,geometry=mapping(p),areaM2=p.area))
  print(b['name'],end,'source',source.area,'infill',sum(p.area for p in ps),'joinsFloor',foot.intersection(floor).area)
result=dict(inputs={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in [specpath,descentpath,hallpath]},solids=rows,limits=['Upper plates extended at most 6 cm toward the measured hall edge and clipped against its floor; no floor overlap added.','Lower plate outlines remain source-derived. Thickness 6 cm is a game construction setting.'])
out.write_text(json.dumps(result,indent=2)+'\n')
