"""Check the constructed floor against the saved source-face footprint."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
from shapely import set_precision
sp,component,out=map(Path,sys.argv[1:]);assert out.resolve().is_relative_to(Path('.local').resolve())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
s=json.loads(sp.read_text());r=json.loads((component/'report.json').read_text());assert r['specSha256']==sha(sp)
np=component/'native-panels.json';assert sha(np)==r['outputs']['nativePanelsSha256'];n=json.loads(np.read_text());f=s['frame']
a=Path(s['floor']['sourceAudit']['path']);assert sha(a)==s['floor']['sourceAudit']['sha256'];audit=json.loads(a.read_text());assert sha(Path(audit['source']['path']))==audit['source']['sha256']
faces=[t for t in audit['triangles']if t['triangle']in s['floor']['sourceTriangles']];assert len(faces)==len(s['floor']['sourceTriangles'])
source=unary_union([set_precision(Polygon([(v[0],v[2]-f['frontZ']-f['slope']*v[0])for v in t['vertices']]),.00001)for t in faces]);approach=box(s['context']['westX'],-s['context']['floorApproachM'],s['context']['eastX'],0);expected=source.intersection(approach).union(box(s['gate']['westX'],0,s['gate']['eastX'],s['bay']['depthM']))
back=[];tiles=[];maxHeightError=0
for p in n['panels']:
 if not p['id'].startswith('hall-bay-floor-'):continue
 top=None
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][p['triangles'][i+k]]for k in [2,1,0]]
  if all(abs(v['y']+.002)<1e-9 for v in vs):top=-.002
  elif all(abs(v['y'])<1e-9 for v in vs):top=0
  else:continue
  q=Polygon([(v['x'],-v['z']-f['frontZ']-f['slope']*v['x'])for v in vs]);assert q.is_valid
  (back if top==-.002 else tiles).append(q)
  maxHeightError=max(maxHeightError,max(abs(v['y']-top)for v in vs))
b=unary_union(back);t=unary_union(tiles);error=b.symmetric_difference(expected).area;outside=t.difference(expected).area
passed=error<1e-6 and outside<1e-6
missing=approach.difference(source);p=missing.representative_point();assert missing.area>20 and not b.contains(p)
report={'pass':passed,'specSha256':sha(sp),'nativeSha256':sha(np),'sourceAuditSha256':sha(a),'backingTopY':-.002,'slabTopY':0,'backingFootprintSymmetricDifferenceM2':error,'tileAreaOutsideFootprintM2':outside,'sourceExcludedApproachAreaM2':missing.area,'actualBackingAreaM2':b.area,'actualTileTopAreaM2':t.area,'maxHeightErrorM':maxHeightError,'openCutoutProbeLocal':[p.x,p.y],'limit':'Footprint and datum proof only; does not establish integrated floor clipping, basement guards/stairs, route or gameplay acceptance.'}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));assert passed,'Floor footprint check failed'
