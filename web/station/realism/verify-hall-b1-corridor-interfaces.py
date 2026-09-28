"""Check parent preservation and continuous B1 aisle/shop floor seams."""
from pathlib import Path
import json,sys,hashlib
from shapely.geometry import Polygon,MultiPoint,LineString
from shapely.ops import unary_union
sp,parent,new,out=map(Path,sys.argv[1:]);s=json.loads(sp.read_bytes());a=json.loads((parent/'native-panels.json').read_bytes());b=json.loads((new/'native-panels.json').read_bytes());by={p['id']:p for p in b['panels']};preserved=[]
for p in a['panels']:
 if p['id'].startswith('hall-b1-'):continue
 q=dict(by[p['id']]);q['browserMaterial']-=int(p['browserMaterial']>=20)
 assert q==p,p['id'];preserved.append(p['id'])
assert a['escalators']==b['escalators'] and a['combSupports']==b['combSupports']
old=json.loads(Path(s['floorParent']['path']).read_bytes())['lowerFloor']['coordinates'];floor=Polygon(old[0],old[1:]);shapes={}
for p in b['panels']:
 if p['role']=='hall-b1-floor':shapes[p['id']]=MultiPoint([(v['x'],-v['z'])for v in p['vertices']if abs(v['y']-s['floorY'])<1e-10]).convex_hull
assert len(shapes)==8
checks=[]
for side in ['north','south']:
 sign=-1 if side=='north'else 1
 (ax,az),(bx,bz)=s['frontEdges'][side];z=lambda x:az+(x-ax)*(bz-az)/(bx-ax);L0,R0=sorted([ax,bx]);W=s['corridorWidthM'];aisle=shapes[f'hall-b1-{side}-aisle-floor'];seam=LineString([(L0,z(L0)),(R0,z(R0))])
 assert seam.difference(aisle.boundary.buffer(1e-9)).length<1e-8
 assert seam.difference(floor.boundary.buffer(1e-9)).length<1e-8
 assert abs(aisle.area-(R0-L0)*W)<1e-8
 for i,(L,R)in enumerate(s['openings']):
  shop=shapes[f'hall-b1-{side}-bay-{i}-floor'];line=LineString([(L,z(L)+sign*W),(R,z(R)+sign*W)])
  assert line.difference(shop.boundary.buffer(1e-9)).length<1e-8
  assert line.difference(aisle.boundary.buffer(1e-9)).length<1e-8
  assert abs(shop.area-(R-L)*s['recessDepthM'])<1e-8
  checks.append(dict(side=side,bay=i,seamLengthM=line.length))
allshapes=[floor,*shapes.values()];maxOverlap=max(x.intersection(y).area for i,x in enumerate(allshapes) for y in allshapes[i+1:]);assert maxOverlap<1e-8
assert abs(sum(x.area for x in allshapes)-unary_union(allshapes).area)<1e-8
report={'pass':True,'specSha256':hashlib.sha256(sp.read_bytes()).hexdigest(),'nativeSha256':hashlib.sha256((new/'native-panels.json').read_bytes()).hexdigest(),'preservedNonFrontageRecords':len(preserved),'unchangedMechanisms':len(b['escalators']),'floorRecords':len(shapes),'addedFloorAreaM2':sum(x.area for x in shapes.values()),'maximumPairOverlapM2':maxOverlap,'shopSeams':checks,'limits':['Dimensions provisional; not a survey or final photo match.','Seam checks use analytical native coordinates, with independent GLB Float32 verification reported separately.']};out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
