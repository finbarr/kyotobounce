"""Independent coverage checks for the new public floors and wall openings."""
import json,sys
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
manifest,component,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());layout=json.loads(Path(m['layout']).read_text());r=json.loads((component/'report.json').read_text());panels={p['id']:p for p in layout['panels']}
assert all(id not in panels for id in r['geometry']['retiredIds'])
def top(id):
 p=panels[id];y=max(v['y']for v in p['vertices']);faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-6 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
prefix='porta-east-';parts=[top(prefix+n)for n in ['public-extension-floor','north-link-floor','east-floor']]
reuse=top(r['geometry']['reusedDeck']).intersection(box(162,49.2,192,54.8));assert abs(reuse.area-168)<.0001
expected=unary_union([box(147,32,155.5,49.2),box(137,49.2,192,54.8),box(192,25.2,237,65)])
coverage=unary_union(parts+[reuse]);assert coverage.symmetric_difference(expected).area<.001
assert sum(p.area for p in parts+[reuse])-coverage.area<.0001,'Duplicate floor slabs'
for a,b in [(0,1),(0,2),(1,2)]:assert parts[a].intersection(parts[b]).area<.0001
# Keep the old walls everywhere except the two deliberate public apertures.
west=unary_union([top(prefix+'west-return-'+str(n))for n in [32,54.8]])
assert west.symmetric_difference(box(136.92,32,137.08,61).difference(box(136.8,49.2,137.2,54.8))).area<.0002
hall=unary_union([top(prefix+'public-north-return-'+str(n))for n in [144,155.5]])
assert hall.symmetric_difference(box(144,32,158,32.15).difference(box(147,31.9,155.5,32.3))).area<.0002
# The old street staircase stays west of the new passage; its rails and slabs
# are separated from the new corridor by more than 2.9 m.
stair=[p for id,p in panels.items()if id.startswith('subway-passage-north-')and any(s in id for s in ['step-','middle','cheek-','flight-'])]
assert stair and max(v['x']for p in stair for v in p['vertices'])<144.1
assert min(v['x']for v in panels[prefix+'public-extension-wall-147']['vertices'])>146.9
assert 'subway-north-paid-end-40' in panels
proof={'pass':True,'layoutSha256':m['layoutSha256'],'publicFloorAreaM2':coverage.area,'reusedFloorAreaM2':reuse.area,'duplicateFloorAreaM2':sum(p.area for p in parts+[reuse])-coverage.area,'headroomM':r['geometry']['ceiling']-r['geometry']['floor'],'retainedStreetStairClear':True,'paidBoundaryRetained':True,'wallOpeningsM':[5.6,8.5]}
out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
