"""Record remaining source-plate / floor overlaps without accepting the interface."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,mapping
from shapely.ops import unary_union
componentdir,halldir,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());component=load(componentdir/'native-panels.json');hall=load(halldir/'native-panels.json');rows=[]
def top(panel,y):
 v=np.array([[q['x'],q['y'],-q['z']]for q in panel['vertices']]);f=np.array(panel['triangles']).reshape((-1,3))[:,::-1]
 return unary_union([Polygon(p[:,[0,2]])for p in v[f]if max(abs(p[:,1]-y))<.0001 and np.cross(p[1]-p[0],p[2]-p[0])[1]>1e-10])
for y,panels,id in [(0,hall['panels'],'hall-bay-floor-surface'),(-4.913583,component['panels'],'hall-basement-lower-floor')]:
 floor=top(next(p for p in panels if p['id']==id),y);plates=unary_union([top(p,y)for p in component['panels']if '-source-trim-'in p['id']]);overlap=floor.intersection(plates)
 rows.append(dict(floorId=id,y=y,overlapAreaM2=overlap.area,overlapGeometry=mapping(overlap)))
report=dict(componentNativeSha256=hashlib.sha256((componentdir/'native-panels.json').read_bytes()).hexdigest(),interfaces=rows,pass_=False,status='Remaining interface reconciliation; do not install the hall floor yet.',nextAction='Reconcile source landing plate footprints with both visual and native floor outlines before full-station integration. Preserve the three upper and two lower openings.')
report['pass']=report.pop('pass_')
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps([dict(floor=r['floorId'],overlapM2=r['overlapAreaM2'])for r in rows]))
