"""Independently verify emitted floor/plate coverage and preservation of other geometry."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
oldhall,olddescent,newhall,newdescent,out=map(Path,sys.argv[1:]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads((p/'native-panels.json').read_text())
H,D,h,d=map(load,[oldhall,olddescent,newhall,newdescent])
def panel(data,id):return next(p for p in data['panels']if p['id']==id)
def top(p,y,rounded=False):
 v=np.array([[q['x'],q['y'],-q['z']]for q in p['vertices']]);v=v.astype(np.float32).astype(float)if rounded else v
 ts=v[np.array(p['triangles']).reshape(-1,3)[:,::-1]]
 return unary_union([Polygon(t[:,[0,2]])for t in ts if max(abs(t[:,1]-y))<1e-4 and np.cross(t[1]-t[0],t[2]-t[0])[1]>1e-10])
unchanged=0
for before,after,changed in [(H,h,'hall-bay-floor-surface'),(D,d,'hall-basement-lower-floor')]:
 a={p['id']:p for p in before['panels']};b={p['id']:p for p in after['panels']};assert a.keys()==b.keys()
 for id,p in a.items():
  if id==changed:continue
  assert p==b[id],id;unchanged+=1
 for key in set(before)|set(after):
  if key!='panels':assert before.get(key)==after.get(key),key
rows=[]
for before,after,id,y,backY,holes in [(H,h,'hall-bay-floor-surface',0,-.002,3),(D,d,'hall-basement-lower-floor',-4.913583,-4.913583,2)]:
 old=top(panel(before,id),backY);new=top(panel(after,id),backY);tiles=top(panel(after,id),y)
 plates=unary_union([top(p,y)for p in d['panels']if '-source-trim-'in p['id']]);expected=old.difference(plates)
 row=dict(id=id,oldAreaM2=old.area,newAreaM2=new.area,removedAreaM2=old.difference(new).area,holes=len(new.interiors)if new.geom_type=='Polygon'else None,valid=new.is_valid,floorErrorM2=new.symmetric_difference(expected).area,remainingOverlapM2=new.intersection(plates).area,coverageErrorM2=new.union(plates).symmetric_difference(old.union(plates)).area,tileAreaOutsideNewFloorM2=tiles.difference(new).area)
 assert row['valid'] and row['holes']==holes
 assert all(row[k]<1e-6 for k in ['floorErrorM2','remainingOverlapM2','coverageErrorM2','tileAreaOutsideNewFloorM2']),row
 # Serialization independently proves emitted Float32 corners; inspect their floor boundary too.
 rounded=top(panel(after,id),backY,True)
 row['float32BoundaryErrorM']=new.boundary.hausdorff_distance(rounded.boundary)
 assert row['float32BoundaryErrorM']<1e-5,row
 rows.append(row)
report=dict(inputs={str(p):sha(p/'native-panels.json')for p in [oldhall,olddescent,newhall,newdescent]},unchangedPanels=unchanged,mechanismsExactlyUnchanged=True,interfaces=rows,pass_=True,limits='Fixed landing/floor coverage only; isolated native route and integrated course checks remain separate.')
report['pass']=report.pop('pass_');out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
