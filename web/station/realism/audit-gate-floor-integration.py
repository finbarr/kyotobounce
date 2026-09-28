"""Compare the complete proposed gate floor against actual current floor triangles."""
import json,hashlib,sys
from pathlib import Path
from shapely.geometry import Polygon,mapping
from shapely.ops import unary_union
base,component,out=map(Path,sys.argv[1:]);assert not out.exists();out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
bb=base.read_bytes();layout=json.loads(bb);cb=(component/'native-panels.json').read_bytes();new=json.loads(cb)
def tops(p,y=0):
 v=p['vertices'];polys=[]
 for i in range(0,len(p['triangles']),3):
  a,b,c=[v[j] for j in p['triangles'][i:i+3]]
  if max(abs(x['y']-y) for x in [a,b,c])>1e-8:continue
  ny=(b['z']-a['z'])*(c['x']-a['x'])-(b['x']-a['x'])*(c['z']-a['z'])
  if ny<=1e-12:continue
  q=Polygon([(x['x'],-x['z'])for x in [a,b,c]])
  if q.area>1e-12:polys.append(q)
 return unary_union(polys)
proposal=tops(next(p for p in new['panels']if p['id']=='gate-passage-floor'));assert proposal.area>400
pieces=[];zero_pieces=[];rows=[]
for p in layout['panels']:
 if p['id'] not in ['concourse','hall-bay-floor-surface']:continue
 zero=tops(p);zero_pieces.append(zero.intersection(proposal));back=tops(p,-.002) if p['id']=='hall-bay-floor-surface' else Polygon();g=unary_union([zero,back]);part=g.intersection(proposal);pieces.append(part);rows.append({'id':p['id'],'material':p['material'],'supportY':[0,-.002] if not back.is_empty else [0],'topAreaInProposedFootprintM2':part.area,'geometry':mapping(part)})
existing=unary_union(pieces);missing=proposal.difference(existing)
report={'meaning':'Exact planar top-triangle coverage by current concourseY0 and hall pavingY0/backingY-0.002m. Existing2mm recessed paving joints are retained. Does not establish headroom, wall clearance or courses.','baseLayoutSha256':sha(bb),'componentNativeSha256':sha(cb),'proposedFloorAreaM2':proposal.area,'missingAreaM2':missing.area,'missingAreaAtZeroM2':proposal.difference(unary_union(zero_pieces)).area,'candidateFloorPanels':rows,'proposedFootprint':mapping(proposal),'missing':mapping(missing),'canOmitDuplicateComponentFloor':missing.area<1e-8,'nextAction':'Retain current concourse/hall floor if coverage passes. Omit component floor during full-station installation; do not create coincident competing floor surface IDs.'}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k not in ['candidateFloorPanels','proposedFootprint','missing']}));assert report['canOmitDuplicateComponentFloor']
