"""Cut source landing-plate footprints from both floors and their visual paving."""
import json,sys,hashlib,copy
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,shape,mapping
from shapely.ops import unary_union
hallpath,descentpath,component,out=map(Path,sys.argv[1:]);out.mkdir()
load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
hall=load(hallpath);descent=load(descentpath);native=load(component/'native-panels.json');frame=hall['frame']
def top(panel,y):
 v=np.array([[p['x'],p['y'],-p['z']]for p in panel['vertices']]);ts=v[np.array(panel['triangles']).reshape(-1,3)[:,::-1]]
 return unary_union([Polygon(t[:,[0,2]])for t in ts if max(abs(t[:,1]-y))<1e-4 and np.cross(t[1]-t[0],t[2]-t[0])[1]>1e-10])
def world(ring):return [(x,frame['frontZ']+frame['slope']*x+d)for x,d in ring]
def local(ring):return [[x,z-frame['frontZ']-frame['slope']*x]for x,z in list(ring.coords)[:-1]]
def polygon(row):return Polygon(world(row['outer']),[world(r)for r in row['holes']])
def encode(p):return dict(outer=local(p.exterior),holes=[local(r)for r in p.interiors])
def clean(p):
 q=p.simplify(1e-7,preserve_topology=True)
 assert q.is_valid and p.symmetric_difference(q).area<1e-6 and p.boundary.hausdorff_distance(q.boundary)<1e-6
 return q
rows=[]
for name,y,old,holes in [('upper',0,polygon(hall['floor']['footprint']),3),('lower',descent['lowerY'],shape(descent['lowerFloor']),2)]:
 plates=unary_union([top(p,y)for p in native['panels']if '-source-trim-'in p['id']]);expected=old.difference(plates);new=clean(expected)
 assert new.geom_type=='Polygon' and len(new.interiors)==holes
 rows.append(dict(name=name,y=y,oldAreaM2=old.area,newAreaM2=new.area,removedAreaM2=old.difference(new).area,holes=holes,plateFootprint=mapping(plates),expectedFloor=mapping(expected),simplificationAreaM2=expected.symmetric_difference(new).area))
 if name=='upper':
  hall['floor']['footprint']=encode(new);hall['floor']['totalAreaM2']=new.area
  tiles=[]
  for tile in hall['floor']['tiles']:
   result=polygon(tile).difference(plates)
   if result.is_empty:continue
   parts=[result]if result.geom_type=='Polygon'else list(result.geoms)
   for i,p in enumerate(parts):
    if p.area<1e-10:continue
    q=clean(p);tiles.append(dict(id=tile['id']+(f'-split-{i}'if len(parts)>1 else ''),areaM2=q.area,**encode(q)))
  hall['floor']['tiles']=tiles
 else:descent['lowerFloor']=mapping(new)
inputs={str(p):sha(p)for p in [hallpath,descentpath,component/'native-panels.json']}
metadata=dict(inputs=inputs,decision='Retained source landing plates replace intersecting floor and paving footprint through floor thickness; moving mechanisms and plate geometry unchanged.',interfaces=rows)
hall['floor']['landingPlateReconciliation']=metadata;descent['landingPlateReconciliation']=metadata
for name,data in [('hall-spec.json',hall),('descent-spec.json',descent),('receipt.json',metadata)]: (out/name).write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps([{k:v for k,v in row.items()if k not in ['plateFootprint','expectedFloor']}for row in rows],indent=2))
