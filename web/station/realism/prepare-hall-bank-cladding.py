"""Small decorative panels follow the exact source underside triangles."""
from pathlib import Path
import json,sys,hashlib,math
import numpy as np
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
source,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=False);data=source.read_bytes();s=json.loads(data);parts=[];banks=[]
for m in s['meshes']:
 if not m['id'].endswith('source-bank-body'):continue
 bank='west'if'-west-'in m['id']else'east';vs=np.array(m['vertices']);fs=np.array(m['indices']).reshape(-1,3);chosen=[]
 for i,f in enumerate(fs):
  t=vs[f];n=np.cross(t[1]-t[0],t[2]-t[0]);n/=np.linalg.norm(n)
  if -.99<n[1]<-.4:chosen.append((i,t,n))
 assert len(chosen)==2
 points=np.unique(np.concatenate([t for _,t,_ in chosen]),axis=0);assert len(points)==4
 low=points[np.argsort(points[:,1])[:2]];low=low[np.argsort(low[:,2])];origin=low[0];U=low[1]-low[0];U/=np.linalg.norm(U)
 high=points[np.argsort(points[:,1])[2:]].mean(0);V=high-low.mean(0);V-=U*np.dot(V,U);V/=np.linalg.norm(V)
 project=lambda p:np.array([(p-origin)@U,(p-origin)@V]);xy=np.array([project(p)for p in points]);x0,y0=xy.min(0);x1,y1=xy.max(0);rows=math.ceil((y1-y0)/1.2);gap=.006;regions=[];bankParts=[]
 for face,t,n in chosen:
  q=np.array([project(p)for p in t]);poly=Polygon(q);M=np.column_stack((q[1]-q[0],q[2]-q[0]));
  def lift(uv):
   a,b=np.linalg.solve(M,np.array(uv)-q[0]);return t[0]+a*(t[1]-t[0])+b*(t[2]-t[0])
  for col in range(2):
   for row in range(rows):
    tile=box(x0+(x1-x0)*col/2+gap/2,y0+(y1-y0)*row/rows+gap/2,x0+(x1-x0)*(col+1)/2-gap/2,y0+(y1-y0)*(row+1)/rows-gap/2)
    p=poly.intersection(tile)
    if p.is_empty or p.area<1e-10:continue
    assert p.geom_type=='Polygon';ring=list(p.exterior.coords)[:-1];base=np.array([lift(uv)for uv in ring]);normal=np.cross(base[1]-base[0],base[2]-base[0]);
    if normal@n<0:ring.reverse();base=base[::-1]
    count=len(base);vertices=np.concatenate([base+n*.003,base+n*.001]);indices=[]
    for i in range(1,count-1):indices += [0,i,i+1,count,count+i+1,count+i]
    for i in range(count):j=(i+1)%count;indices += [i,count+i,count+j,i,count+j,j]
    part=dict(id=f'hall-{bank}-underside-{col}-{row}-source-{face}',vertices=vertices.tolist(),indices=indices,uv=ring+ring,bank=bank,sourceFace=face,sourceNormal=n.tolist(),areaM2=float(p.area),collision=False)
    parts.append(part);bankParts.append(part['id']);regions.append(p)
 assert abs(sum(p.area for p in regions)-unary_union(regions).area)<1e-8
 banks.append(dict(bank=bank,sourceBody=m['id'],sourceFaces=[i for i,_,_ in chosen],origin=origin.tolist(),across=U.tolist(),along=V.tolist(),bounds=[x0,y0,x1,y1],columns=2,rows=rows,cladAreaM2=sum(p.area for p in regions),sourceAreaM2=sum(Polygon([project(p)for p in t]).area for _,t,_ in chosen),parts=bankParts))
result=dict(parent=dict(path=str(source),sha256=hashlib.sha256(data).hexdigest()),banks=banks,parts=parts,geometry=dict(panelGapM=.006,surfaceOffsetM=.003,thicknessM=.002),material=dict(tileSizeM=.576,perforationPitchM=.018,holeRadiusM=.0025),reference='porta-b2-route-05',limits=['Photograph supports panel seams and perforated underside cladding; module, gap and hole dimensions are provisional.','No reference image pixels used as textures.','Decorative panels are noncolliding; source casing and all mechanism geometry are unchanged.','Casing thickness remains source-derived; a registered photograph is required before changing it.'])
(out/'spec.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(panels=len(parts),banks=banks)))
