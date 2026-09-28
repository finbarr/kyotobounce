"""Independent footprint and unchanged-record checks for the hall/concourse cut."""
import json,hashlib,sys
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
sp,comp,assembly,parent,out=map(Path,sys.argv[1:]);s=json.loads(sp.read_bytes());sha=lambda b:hashlib.sha256(b).hexdigest()
for x in s['inputs'].values():assert sha(Path(x['path']).read_bytes())==x['sha256']
old=json.loads(Path(s['inputs']['layout']['path']).read_bytes());old=next(p for p in old['panels']if p['id']=='concourse')
n=json.loads((comp/'native-panels.json').read_bytes());new=n['panels'][0]
def top(p,y):
 result=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-9 for v in vs):
   poly=Polygon([(v['x'],-v['z'])for v in vs])
   if poly.area>1e-12:result.append(poly)
 return unary_union(result)
a=top(old,0);b=top(new,0);outer=Polygon(s['replacementOuter']);holes=unary_union([Polygon(h)for h in s['basementHoles']]);hall=json.loads(Path(s['inputs']['hallNative']['path']).read_bytes());h=top(next(p for p in hall['panels']if p['id']=='hall-bay-floor-surface'),-.002)
assert b.symmetric_difference(a.difference(outer)).area<1e-8
assert b.intersection(h).area<1e-8
coverage=b.union(h);difference=coverage.symmetric_difference(a.difference(holes)).area;assert difference<1e-6
seam=outer.exterior
# GEOS exact-line subtraction splits collinear edges at floating-point roundoff.
# Cover the entire seam with a 10-nanometre boundary band, not just endpoints.
for edge in [b.boundary,h.boundary]:assert seam.difference(edge.buffer(1e-8)).length==0
for k in ['id','material','appearance','role','collision']:assert new[k]==old[k]
assert min(v['y']for v in new['vertices'])==min(v['y']for v in old['vertices'])
n=json.loads((assembly/'native-panels.json').read_bytes());p=json.loads((parent/'native-panels.json').read_bytes());lookup={q['id']:q for q in n['panels']};assert len(lookup)==len(p['panels'])+1
for q in p['panels']:
 expected=dict(q);expected['browserMaterial']+=1;assert lookup[q['id']]==expected
for k in ['escalators','combSupports']:assert n[k]==p[k]
report={'pass':True,'specSha256':sha(sp.read_bytes()),'componentNativeSha256':sha((comp/'native-panels.json').read_bytes()),'assemblyNativeSha256':sha((assembly/'native-panels.json').read_bytes()),'retainedAssemblyRecords':len(p['panels']),'retainedMovingLanes':len(p['escalators']),'removedConcourseAreaM2':outer.area,'basementOpeningAreaM2':holes.area,'floorOverlapM2':b.intersection(h).area,'coverageDifferenceM2':difference,'completeSharedSeamM':seam.length,'seamCoverageToleranceM':1e-8,'oldFloorPropertiesRetained':True,'limits':['Top coverage uses the continuous hall backing at -2mm; the visible tile joint recess is intentional.','Exact floor partition and unchanged assembly records do not establish full-station or course-runtime acceptance.']}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
