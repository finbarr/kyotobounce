"""Check whole-station floor/ceiling coverage and clearance along the public connections."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,LineString,box
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());l=json.loads(Path(m['layout']).read_text());r=json.loads((component/'report.json').read_text());Y=r['geometry']['floor'];C=r['geometry']['ceiling']
routes=[q for q in r['geometry']['routes']if q['label']in ['Plaza to Porta East','Eastern bypass and south crossing']]
assert len(routes)==2
corridor=unary_union([LineString([(p['x'],p['z'])for p in q['points']]).buffer(.25)for q in routes])
footprint=box(146,-53,199,54)
floors=[];ceilings=[];new=[];old=[];obstructions=[]
for p in l['panels']:
 if p.get('collision',True)==False:continue
 vs=p['vertices'];a=min(v['x']for v in vs);b=max(v['x']for v in vs);d=min(v['z']for v in vs);e=max(v['z']for v in vs);lo=min(v['y']for v in vs);hi=max(v['y']for v in vs)
 if b<146 or a>199 or e<-53 or d>54:continue
 if lo<Y+2.1 and hi>Y+.08 and a<b and d<e and box(a,d,b,e).intersection(corridor).area>1e-5:
  # These route volumes are straight public aisles; bounds provide a conservative
  # obstruction test even for a tilted beam or multipart collision panel.
  obstructions.append(p['id'])
 for target,dest in [(Y,floors),(C,ceilings)]:
  if lo>target+1e-5 or hi<target-1e-5:continue
  faces=[]
  for i in range(0,len(p['triangles']),3):
   tri=[vs[k]for k in p['triangles'][i:i+3]]
   if all(abs(v['y']-target)<1e-5 for v in tri):
    a,b,c=tri;ny=(b['z']-a['z'])*(c['x']-a['x'])-(b['x']-a['x'])*(c['z']-a['z'])
    # Floor support faces upward; ceiling coverage faces downward. Wall bases
    # touch the same plane but must not count as duplicate floor slabs.
    if (target==Y and ny<=0)or(target==C and ny>=0):continue
    face=Polygon([(v['x'],v['z'])for v in tri])
    if face.area>1e-8:faces.append(face)
  if faces:
   poly=unary_union(faces).intersection(footprint);dest.append(poly)
   if target==Y:(new if p['id'].startswith('kotochika-east-link-')else old).append(poly)
assert not obstructions,obstructions
floor=unary_union(floors);ceiling=unary_union(ceilings)
missing_floor=corridor.difference(floor).area;missing_ceiling=corridor.difference(ceiling).area
assert missing_floor<.001,missing_floor;assert missing_ceiling<.001,missing_ceiling
new_floor=unary_union(new);duplicate=new_floor.intersection(unary_union(old)).area
assert duplicate<.001,duplicate
proof={'pass':True,'layoutSha256':m['layoutSha256'],'routeNames':[q['label']for q in routes],'checkedRouteAreaM2':corridor.area,'newFloorAreaM2':new_floor.area,'missingFloorAreaM2':missing_floor,'missingCeilingAreaM2':missing_ceiling,'duplicateFloorAreaM2':duplicate,'clearanceHeightM':2.1,'clearanceRadiusM':.25,'obstructions':obstructions}
out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
