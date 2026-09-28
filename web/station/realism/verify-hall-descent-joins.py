"""Independent planar checks on emitted lower floor and fixed landing infills."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,shape
from shapely.ops import unary_union
specp,joinsp,descdir,parentdir,assemblydir,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());spec=load(specp);joins=load(joinsp);desc=load(descdir/'native-panels.json');parent=load(parentdir/'native-panels.json');assembly=load(assemblydir/'native-panels.json');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def top(panel,y):
 ps=[];vs=panel['vertices']
 for i in range(0,len(panel['triangles']),3):
  q=[vs[k]for k in panel['triangles'][i:i+3]]
  if max(abs(p['y']-y)for p in q)<1e-6:
   p=Polygon([(p['x'],-p['z'])for p in q])
   if p.area>1e-12:ps.append(p)
 return unary_union(ps)
parts={p['id']:p for p in desc['panels']};assembled={p['id']:p for p in assembly['panels']}
for p in parent['panels']:assert p==assembled[p['id']]
expected=shape(spec['lowerFloor']);floor=top(parts['hall-basement-lower-floor'],spec['lowerY']);diff=floor.symmetric_difference(expected).area
assert diff<1e-6 and len(floor.interiors)==2
upper=top(next(p for p in parent['panels']if p['id']=='hall-bay-floor-surface'),0);rows=[]
for solid in joins['solids']:
 p=parts[solid['id']];actual=top(p,solid['y']);e=shape(solid['geometry']);delta=actual.symmetric_difference(e).area;overlap=actual.intersection(upper if solid['y']==0 else floor).area
 assert delta<1e-6 and overlap<1e-6
 assert abs(min(v['y']for v in p['vertices'])-(solid['y']-.06))<1e-8
 rows.append(dict(id=p['id'],areaM2=actual.area,outlineDifferenceM2=delta,floorOverlapM2=overlap))
result=dict(pass_=True,componentNativeSha256=sha(descdir/'native-panels.json'),assemblyNativeSha256=sha(assemblydir/'native-panels.json'),unchangedParentPanels=len(parent['panels']),lowerFloorAreaM2=floor.area,lowerFloorHoles=len(floor.interiors),lowerFloorDifferenceM2=diff,landingInfills=rows,limits=['Planar checks establish source footprint preservation and no duplicate floor top; they do not resolve the real basement level name or fabrication details.'])
result['pass']=result.pop('pass_');out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
