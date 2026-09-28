"""Independently check retained parents and exact floor footprint seams."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,MultiPoint,LineString
from shapely.ops import unary_union
specPath,assembly,out=map(Path,sys.argv[1:]);s=json.loads(specPath.read_text());n=json.loads((assembly/'native-panels.json').read_text());byId={p['id']:p for p in n['panels']};parents=[]
for name in ['central-hall-bay-12','hall-descents-12']:
 p=assembly.parent/name/'native-panels.json';j=json.loads(p.read_text());offset=0 if name=='central-hall-bay-12'else 8
 for old in j['panels']:
  new=dict(byId[old['id']]);new['browserMaterial']-=offset
  assert new==old,old['id']
 if 'escalators'in j:assert n['escalators']==j['escalators'];assert n['combSupports']==j['combSupports']
 parents.append(dict(path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),records=len(j['panels'])))
old=json.loads(Path(s['floorParent']['path']).read_text())['lowerFloor']['coordinates'];floor=Polygon(old[0],old[1:]);added=[];checks=[]
for p in n['panels']:
 if p['role']!='hall-b1-floor':continue
 points=[(v['x'],-v['z'])for v in p['vertices']if abs(v['y']-s['floorY'])<1e-10];foot=MultiPoint(points).convex_hull
 overlap=foot.intersection(floor).area;shared=foot.boundary.intersection(floor.boundary).length
 # GEOS may not identify collinear doubles as an exact shared LineString.
 seamDistance=min(foot.boundary.distance(floor.boundary),foot.distance(floor))
 L,R=next((a,b)for i,(a,b)in enumerate(s['openings'])if f'bay-{i}-floor'in p['id']);expected=2.4*(R-L)
 side='north'if '-north-'in p['id']else 'south';(ax,az),(bx,bz)=s['frontEdges'][side];z=lambda x:az+(x-ax)*(bz-az)/(bx-ax);seam=LineString([(L,z(L)),(R,z(R))]);assert seam.difference(foot.boundary.buffer(1e-9)).length<1e-8;assert seam.difference(floor.boundary.buffer(1e-9)).length<1e-8
 assert abs(foot.area-expected)<1e-8
 assert overlap<1e-8 and seamDistance<1e-9
 checks.append(dict(id=p['id'],areaM2=foot.area,overlapM2=overlap,boundaryDistanceM=seamDistance,exactSharedLengthM=shared));added.append(foot)
assert len(added)==6
assert abs(sum(p.area for p in added)-unary_union(added).area)<1e-8
result=dict(**{'pass':True},specSha256=hashlib.sha256(specPath.read_bytes()).hexdigest(),nativeSha256=hashlib.sha256((assembly/'native-panels.json').read_bytes()).hexdigest(),unchangedParents=parents,unchangedMechanisms=4,floors=checks,addedAreaM2=sum(p.area for p in added),limits=['Proves no positive floor overlap and zero seam separation; does not establish surveyed shop dimensions.'])
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
