"""Remove retained source plate coverage from the existing flat landing infills."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,shape,mapping
from shapely.ops import unary_union
from shapely import set_precision
joinp,profilep,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();joins,profiles=load(joinp),load(profilep);solids=[];rows=[]
for old in joins['solids']:
 bank='west'if 'west'in old['id']else'east';ps=[]
 for m in profiles['meshes']:
  if 'sourceMetalCoreId'not in m or bank not in m['id']:continue
  vertices=np.array(m['vertices']);faces=np.array(m['indices']).reshape((-1,3))
  for f in faces:
   v=vertices[f]
   if max(abs(v[:,1]-old['y']))<.0001 and np.cross(v[1]-v[0],v[2]-v[0])[1]>1e-12:ps.append(Polygon(v[:,[0,2]]))
 coverage=unary_union(ps);original=shape(old['geometry']);remaining=set_precision(set_precision(original.difference(coverage),1e-9),0);parts=[remaining]if remaining.geom_type=='Polygon'else list(remaining.geoms);kept=[]
 for i,p in enumerate(parts):
  if p.area<1e-8:continue
  p=p.simplify(1e-7,preserve_topology=True);assert p.is_valid
  solids.append(dict(id=old['id']+'-remaining-'+str(i),y=old['y'],geometry=mapping(p),areaM2=p.area));kept.append(p)
 kept=unary_union(kept);diff=original.symmetric_difference(kept.union(original.intersection(coverage))).area;overlap=kept.intersection(coverage).area
 assert diff<1e-6 and overlap<1e-6
 rows.append(dict(id=old['id'],originalAreaM2=original.area,retainedSourcePlateAreaM2=coverage.area,remainingInfillAreaM2=kept.area,coverageDifferenceM2=diff,overlapM2=overlap))
result=dict(inputs={**joins['inputs'],str(joinp):sha(joinp),str(profilep):sha(profilep)},solids=solids,coverageProof=rows,limits=joins['limits']+['Retained source metal plate footprints are subtracted from flat infills; no overlapping top faces are added. The source lower plate is 0.062 mm above the aligned game floor.'])
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(rows,indent=2))
