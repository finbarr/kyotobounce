"""Verify equivalent visible floor regions when export triangulation differs."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
source,out=map(Path,sys.argv[1:]);raw=source.read_bytes();data=json.loads(raw)
def poly(points):
 assert all(abs(p[1])<1e-6 for p in points)
 return Polygon([(p[0],p[2])for p in points])
missing=[poly(t['vs'])for _,t in data['missing']]
crumbs=sum(p.area for p in missing if p.area<1e-6);assert crumbs<1e-6
expected=unary_union([p for p in missing if p.area>=1e-6]);selected=[]
for row in data['unmatched']:
 if any(abs(p[1])>1e-6 for p in row['ps']):continue
 p=poly(row['ps'])
 if p.area>1e-6 and p.difference(expected).area<1e-6:selected.append(row)
actual=unary_union([poly(r['ps'])for r in selected]);difference=expected.symmetric_difference(actual)
assert difference.area<1e-5 and difference.buffer(-2e-6).is_empty
assert expected.hausdorff_distance(actual)<2e-6
report=dict(inputSha256=hashlib.sha256(raw).hexdigest(),sourceAreaM2=expected.area,replacedAreaM2=actual.area,differenceAreaM2=difference.area,floatCrumbAreaM2=crumbs,selected=selected)
out.write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items()if k!='selected'})
