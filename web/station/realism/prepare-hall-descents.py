"""Measure paired source lanes and landing boundaries for the hall descent."""
import json,hashlib,sys,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
inventory,topology,out=map(Path,sys.argv[1:]);assert out.resolve().is_relative_to(Path('.local').resolve());out.mkdir()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=json.loads(inventory.read_text());t=json.loads(topology.read_text());assert a['sourceSha256']==t['sourceSha256'];tri=a['triangles'];banks=[]
def polys(faces):
 u=unary_union([Polygon([(v[0],v[2])for v in q['vertices']])for q in faces]);return [u]if u.geom_type=='Polygon'else list(u.geoms)
for name,steps,housing in [('west','BuildingInstallation.1541','BuildingInstallation.1601'),('east','BuildingInstallation.2070','BuildingInstallation.1471')]:
 groups={}
 for q in tri:
  if q['object']==steps and q['normal'][1]>.99:
   y=round(sum(v[1]for v in q['vertices'])/3,4);groups.setdefault(y,[]).append(q)
 samples=[]
 for y,qs in sorted(groups.items()):
  ps=sorted(polys(qs),key=lambda p:p.centroid.y)
  assert len(ps)==2
  if -4.5<y<-.3:samples.append(dict(y=y,centers=[[p.centroid.x,p.centroid.y]for p in ps],polygons=[list(p.exterior.coords)[:-1]for p in ps]))
 Y=np.array([r['y']for r in samples]);fits=[]
 for lane in range(2):
  X=np.array([r['centers'][lane][0]for r in samples]);Z=np.array([r['centers'][lane][1]for r in samples]);ax,bx=np.polyfit(Y,X,1);az,bz=np.polyfit(Y,Z,1);error=np.sqrt((X-ax*Y-bx)**2+(Z-az*Y-bz)**2)
  fits.append(dict(xPerY=float(ax),xIntercept=float(bx),zPerY=float(az),zIntercept=float(bz),maxResidualM=float(max(error))))
 U=np.mean([[f['xPerY'],f['zPerY']]for f in fits],axis=0);perY=float(np.linalg.norm(U));U=U/perY;R=np.array([-U[1],U[0]])
 lateral=[float(np.mean([np.dot(r['centers'][i],R)for r in samples]))for i in range(2)];mid=sum(lateral)/2
 platefaces=[q for q in tri if q['object']==housing and q['normal'][1]>.99];levels={}
 for q in platefaces:
  y=round(sum(v[1]for v in q['vertices'])/3,4);levels.setdefault(y,[]).append(q)
 topY=max(levels);lowY=min(levels);upper=unary_union(polys(levels[topY]));lower=unary_union(polys(levels[lowY]));assert upper.area>2 and lower.area>2
 upperAlong=max(np.dot(v,U)for v in upper.exterior.coords);lowerAlong=min(np.dot(v,U)for v in lower.exterior.coords)
 lowerFloor=-4.877-.036583;height=-lowerFloor;run=height*perY;pitBeyondFlat=.66;flat=(upperAlong-lowerAlong-run)/2-pitBeyondFlat;assert .9<flat<1.5
 origin=U*(lowerAlong+flat+pitBeyondFlat)+R*mid
 lanes=[]
 for i in sorted(range(2),key=lambda i:lateral[i]):
  widths=[]
  for r in samples:
   projected=[float(np.dot(v,R))for v in r['polygons'][i]];widths.append(max(projected)-min(projected))
  center=origin+R*(lateral[i]-mid)
  lanes.append(dict(sourceLaneNorthIndex=i,lowerRenderer=[float(center[0]),lowerFloor,float(center[1])],widthM=float(np.median(widths)),lateralOffsetM=lateral[i]-mid))
 banks.append(dict(name=name,sourceSteps=steps,sourceHousing=housing,sourcePlateTopY=topY,sourcePlateLowerY=lowY,sourceInclineFit=fits,sourceTreadSamples=samples,uphillRenderer=[float(U[0]),0,float(U[1])],lowerCenterRenderer=[float(origin[0]),lowerFloor,float(origin[1])],heightM=height,runM=run,inclineDegrees=math.degrees(math.atan(1/perY)),flatLengthM=float(flat),lanes=lanes,upperPlateOutline=[list(v)for v in upper.exterior.coords][:-1],lowerPlateOutline=[list(v)for v in lower.exterior.coords][:-1],plateEndSpanM=float(upperAlong-lowerAlong)))
spec=dict(sourceInventory=dict(path=str(inventory),sha256=sha(inventory)),sourceTopology=dict(path=str(topology),sha256=sha(topology)),sourceSha256=a['sourceSha256'],upperY=0,lowerY=-4.913583,banks=banks,lowerFloor=t['levels']['lower_deck']['geometry'],limits=['First lower deck follows municipal source geometry; its B1F/B2F identity remains unresolved. No deeper route is inferred.','Escalator deck heights are aligned with adjacent floor. Source landing plates are about18mm below those floor faces.','Lane axes, spacing, widths, incline and cover-to-cover lengths are measured from the coarse source; no survey accuracy claimed.','Working game casing cross-sections, pit depth, operating speed/direction and path easing are explicit construction settings.','Current hall component remains isolated until course and wider station integration checks pass.'])
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');print(json.dumps([dict(name=b['name'],incline=b['inclineDegrees'],run=b['runM'],flat=b['flatLengthM'],lanes=b['lanes'],fitResidual=max(f['maxResidualM']for f in b['sourceInclineFit']))for b in banks],indent=2))
