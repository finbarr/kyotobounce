"""Fit western moving lanes and join source floor faces; dimensions are model-derived."""
import json,sys,hashlib,math
from pathlib import Path
import numpy as np
from shapely import set_precision
from shapely.geometry import Polygon,mapping
from shapely.ops import unary_union
out=Path(sys.argv[1]);data=json.loads((out/'source.json').read_text());objects={o['name']:o for o in data['objects']}
sha=lambda b:hashlib.sha256(b).hexdigest()
def union(faces):
    return unary_union([set_precision(Polygon([(v[0],v[2])for v in f['vertices']]),.00001)for f in faces])
def parts(g):return list(g.geoms)if g.geom_type=='MultiPolygon'else[g]
main=objects['Untitled.200']['horizontal'];floors=[]
for name,y,lo,hi,depth in [('intermediate',5.6520280838,5.651,5.653,1.05),('upper',15.6146583557,15.614,15.616,.9)]:
    selected=[f for f in main if lo<f['center'][1]<hi]
    g=union(selected)
    floors.append(dict(id=name,y=y,depth=depth,geometry=mapping(g),area=g.area,sourceFaces=[dict(object='BuildingInstallation.2030'if f in objects['BuildingInstallation.2030']['horizontal']else'Untitled.200',face=f['face'])for f in selected]))
# Source stair treads are separate horizontal strips; retain their plans and elevations.
stair_faces=[f for f in main if .20<f['center'][1]<5.5 and f['area']<3.4 and all(-20<v[0]<-8 and -17.5<v[2]<-14.5 for v in f['vertices'])]
for level in sorted({round(f['center'][1],3)for f in stair_faces}):
    selected=[f for f in stair_faces if abs(f['center'][1]-level)<.0005]
    if len(selected)!=2:continue
    # Treads run beside the lower pair in a compact, aligned stair; exclude other tiny fittings.
    g=union(selected)
    if not .6<g.area<3.5:continue
    floors.append(dict(id='stair-'+str(len(floors)),y=sum(f['center'][1]for f in selected)/len(selected),depth=.45,geometry=mapping(g),area=g.area,sourceFaces=[dict(object='Untitled.200',face=f['face'])for f in selected]))
banks=[]
for name,steps,housing,low,high in [('lower','BuildingInstallation.1082','BuildingInstallation.1206',.0365782864,5.6520280838),('upper','BuildingInstallation.1562','BuildingInstallation.1557',5.6520280838,15.6146583557)]:
    fs=objects[steps]['horizontal'];levels=sorted({round(f['center'][1],3)for f in fs if low+.4<f['center'][1]<high-.4});samples=[]
    for y in levels:
        rows=sorted([f for f in fs if abs(f['center'][1]-y)<.001],key=lambda f:f['center'][2]);assert len(rows)==4
        centers=[];polys=[]
        for lane in range(2):
            pair=rows[lane*2:lane*2+2];area=sum(f['area']for f in pair);centers.append([sum(f['center'][k]*f['area']for f in pair)/area for k in [0,2]]);polys.append([v for f in pair for v in f['vertices']])
        samples.append(dict(y=y,centers=centers,vertices=polys))
    Y=np.array([s['y']for s in samples]);fits=[]
    for i in range(2):
        x=np.array([s['centers'][i][0]for s in samples]);z=np.array([s['centers'][i][1]for s in samples]);ax,bx=np.polyfit(Y,x,1);az,bz=np.polyfit(Y,z,1)
        fits.append(dict(xPerY=float(ax),xIntercept=float(bx),zPerY=float(az),zIntercept=float(bz),maxResidualM=float(max(np.hypot(x-ax*Y-bx,z-az*Y-bz)))))
    U=np.mean([[f['xPerY'],f['zPerY']]for f in fits],axis=0);perY=float(np.linalg.norm(U));U/=perY;R=np.array([-U[1],U[0]])
    lateral=[float(np.mean([np.dot(s['centers'][i],R)for s in samples]))for i in range(2)]
    plates=objects[housing]['horizontal'];lower=union([f for f in plates if f['center'][1]<low+.1]);upper=union([f for f in plates if f['center'][1]>high-.1]);assert lower.area>2 and upper.area>2
    lo=min(np.dot(v,U)for p in parts(lower)for v in p.exterior.coords);hi=max(np.dot(v,U)for p in parts(upper)for v in p.exterior.coords)
    height=high-low;run=height*perY;flat=(hi-lo-run)/2-.66;assert .8<flat<1.7
    lanes=[]
    for i in range(2):
        origin=U*(lo+flat+.66)+R*lateral[i];width=float(np.median([max(np.dot([v[0],v[2]],R)for v in s['vertices'][i])-min(np.dot([v[0],v[2]],R)for v in s['vertices'][i])for s in samples]))
        lanes.append(dict(lowerRenderer=[float(origin[0]),low,float(origin[1])],widthM=width))
    banks.append(dict(name=name,sourceSteps=steps,sourceHousing=housing,fits=fits,uphillRenderer=[float(U[0]),0,float(U[1])],runM=run,heightM=height,flatLengthM=float(flat),lanes=lanes,lowerPlate=mapping(lower),upperPlate=mapping(upper)))
guards=[]
for name,base in [('BuildingInstallation.1261',5.6520280838),('BuildingInstallation.1243',5.6520280838),('BuildingInstallation.1118',15.6146583557)]:
    faces=objects[name]['horizontal'];g=union(faces);glass=g.buffer(-.02,join_style='mitre');assert not glass.is_empty and glass.is_valid
    guards.append(dict(sourceObject=name,baseY=base,topY=base+1.1,cap=mapping(g),glass=mapping(glass),sourceFaces=[f['face']for f in faces]))
result=dict(source=data['source'],sourceSha256=data['sourceSha256'],sourceInventorySha256=sha((out/'source.json').read_bytes()),floors=floors,banks=banks,guards=guards,assumptions=['Horizontal topology snapped to a 10 micrometre grid before union.','Source floor datums retained; combs align to floors about 18 mm above source metal plates.','Slab depth, casing profile, moving chain easing and speed are game construction assumptions.','No old course targets constrain the reconstruction.'])
(out/'spec.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(floors=[dict(id=f['id'],area=f['area'],parts=f['geometry']['type'])for f in floors[:2]],stairTreads=len(floors)-2,banks=[dict(name=b['name'],run=b['runM'],rise=b['heightM'],flat=b['flatLengthM'])for b in banks])))
