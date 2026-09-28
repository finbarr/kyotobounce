"""Extend the hall floor and derive three basement guards from municipal geometry."""
import json,sys,hashlib,math
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
from shapely import set_precision
parentpath,inventorypath,out=map(Path,sys.argv[1:]);assert out.resolve().is_relative_to(Path('.local').resolve());out.mkdir()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
s=json.loads(parentpath.read_text());audit=json.loads(inventorypath.read_text());assert audit['sourceSha256']==s['source']['sha256']==sha(Path(s['source']['file']))
f=s['frame']; ts=audit['triangles'];sourceY=.036583
world=lambda x,d:(x,f['frontZ']+f['slope']*x+d)
local=lambda x,z:[x,z-f['frontZ']-f['slope']*x]
def parts(g):
 return [g] if g.geom_type=='Polygon' else list(g.geoms) if g.geom_type=='MultiPolygon' else []
def union(faces):
 return set_precision(unary_union([set_precision(Polygon([(v[0],v[2])for v in t['vertices']]),1e-5)for t in faces]),0)
def exactunion(faces):
 return unary_union([Polygon([(v[0],v[2])for v in t['vertices']])for t in faces])
def rings(p,convert=lambda x,z:[x,z]):
 return dict(outer=[convert(*v)for v in list(p.exterior.coords)[:-1]],holes=[[convert(*v)for v in list(h.coords)[:-1]]for h in p.interiors])
floorFaces=[t for t in ts if t['object']=='Untitled.200' and t['normal'][1]>.99 and all(abs(v[1]-sourceY)<.001 for v in t['vertices'])]
sourceFloor=union(floorFaces)
approach=Polygon([world(x,d)for x,d in [(s['context']['westX'],-s['context']['floorApproachM']),(s['context']['eastX'],-s['context']['floorApproachM']),(s['context']['eastX'],0),(s['context']['westX'],0)]])
review=box(-16,-10,18,3).union(approach)
sourcePart=sourceFloor.intersection(review)
passage=Polygon([world(x,d)for x,d in [(s['gate']['westX'],0),(s['gate']['eastX'],0),(s['gate']['eastX'],s['bay']['depthM']),(s['gate']['westX'],s['bay']['depthM'])]])
foot=sourcePart.union(passage);assert foot.geom_type=='Polygon' and foot.is_valid and len(foot.interiors)==3
localfoot=Polygon([local(*v)for v in foot.exterior.coords],[[local(*v)for v in r.coords]for r in foot.interiors])
# Coalesce only near-collinear numerical detail below the source's 10um grid.
# The 0.236mm gate join otherwise makes an ill-conditioned eight-metre triangle.
originalFoot=localfoot;localfoot=localfoot.simplify(1e-6,preserve_topology=True)
simplification=dict(maximumBoundaryShiftM=originalFoot.hausdorff_distance(localfoot),symmetricDifferenceM2=originalFoot.symmetric_difference(localfoot).area,removedOuterVertices=len(originalFoot.exterior.coords)-len(localfoot.exterior.coords))
assert simplification['maximumBoundaryShiftM']<1e-6 and simplification['symmetricDifferenceM2']<1e-6 and len(localfoot.interiors)==3
lo=localfoot.bounds;tiles=[]
for i in range(math.ceil((lo[2]-lo[0])/1.2)):
 for j in range(math.ceil((lo[3]-lo[1])/1.2)):
  cell=box(lo[0]+i*1.2+.005,lo[1]+j*1.2+.005,min(lo[0]+(i+1)*1.2,lo[2])-.005,min(lo[1]+(j+1)*1.2,lo[3])-.005)
  for p in parts(localfoot.intersection(cell)):
   if p.area>1e-8:tiles.append(dict(id=f'{i}-{j}-{len(tiles)}',areaM2=p.area,**rings(p)))
s['parentSpec']=dict(path=str(parentpath),sha256=sha(parentpath))
s['floor'].update(footprint=rings(localfoot),tiles=tiles,totalAreaM2=localfoot.area,numericalBoundarySimplification=simplification,sourceApproachAreaM2=sourcePart.area,excludedApproachAreaM2=review.area-sourcePart.area,sourceFloorFaces=[dict(primitive=t['primitive'],face=t['face'])for t in floorFaces],sourceInventory=dict(path=str(inventorypath),sha256=sha(inventorypath)),extensionDecision='Expand only source-derived floor to renderer X[-16,18],Z[-10,3], union prior approach and inferred gate passage. Three complete holes retained. No wider floor or basement level inferred.')
solids=[]
def slab(id,p,top,depth,mat,role,sourceObjects):
 assert p.is_valid and p.area>1e-8 and depth>0
 solids.append(dict(id=id,topY=top-sourceY,depthM=depth,materialIndex=mat,role=role,sourceObjects=sourceObjects,areaM2=p.area,**rings(p)))
curbFaces=[t for t in ts if t['object']=='Untitled.200' and t['normal'][1]>.99 and all(abs(v[1]-.136588)<.001 for v in t['vertices'])]
curbs=union(curbFaces).intersection(box(-16,-10,18,3));assert len(parts(curbs))==3
for i,p in enumerate(sorted(parts(curbs),key=lambda p:p.centroid.x)):slab('curb-'+str(i),p,.136588,.100005,2,'basement-curb',['Untitled.200'])
meshes=[]
for side,obj,cap in [('west','BuildingInstallation.1109','BuildingInstallation.1483'),('oval','BuildingInstallation.1125','BuildingInstallation.1186'),('east','BuildingInstallation.1156','BuildingInstallation.1319')]:
 for kind,name,material,normal in [('glass',obj,3,1),('cap',cap,4,-1)]:
  faces=[t for t in ts if t['object']==name];vertices=[];lookup={};indices=[];edges={}
  for t in faces:
   ids=[]
   for v in t['vertices']:
    key=tuple(v)
    if key not in lookup:lookup[key]=len(vertices);vertices.append(v)
    ids.append(lookup[key])
   indices.extend(ids)
   for a,b in zip(ids,ids[1:]+ids[:1]):edges.setdefault(tuple(sorted([a,b])),[]).append([a,b])
  assert all(len(e)<=2 for e in edges.values())
  boundary=[e[0]for e in edges.values()if len(e)==1];neighbors={}
  for a,b in boundary:neighbors.setdefault(a,[]).append(b);neighbors.setdefault(b,[]).append(a)
  assert all(len(v)==2 for v in neighbors.values())
  remaining=set(neighbors);loops=[]
  while remaining:
   start=min(remaining);loop=[start];previous=None;current=start
   while True:
    nxt=next(n for n in neighbors[current]if n!=previous)
    if nxt==start:break
    assert nxt not in loop
    loop.append(nxt);previous,current=current,nxt
   remaining.difference_update(loop);loops.append(loop)
  loops.sort(key=lambda r:abs(Polygon([(vertices[i][0],vertices[i][2])for i in r]).area),reverse=True)
  assert len(loops)==(2 if side=='oval' else 1)
  meshes.append(dict(id=kind+'-'+side,vertices=[[x,y-sourceY,z]for x,y,z in vertices],indices=indices,boundaryLoops=loops,capNormalY=normal,materialIndex=material,role='basement-'+kind,sourceObject=name,sourceFaces=[t['face']for t in faces]))
s['basement']=dict(sourceInventory=dict(path=str(inventorypath),sha256=sha(inventorypath)),sourceDatumY=sourceY,constructionDatumY=0,datumDecision='Shift the complete guard assembly vertically by -0.036583m to share retained concourse Y=0; X/Z unchanged. This is the existing explicit local datum assumption, not survey correction.',solids=solids,meshes=meshes,limits=['Source guard thicknesses and cutouts retained; source mesh is not an as-built survey.','Central oval function unresolved; preserve its source opening and guard.','Descent casings, moving escalators, lower floor/lining and route continuation are not yet constructed.','No full-station installation before course, route and overlap reconciliation.'])
s['assumptions'][4]='This component has the complete source well openings, curbs and glass guards; moving descents, lower route, canopy bearing, gate equipment, adjacent bays and forecourt remain unfinished. Do not install before connected route/course proof.'
s['status']='Uninstalled complete-opening floor and source-derived basement guards, with prior hall gate/bay. Descents and surrounding station integration remain open.'
s['toolSha256']=sha(Path(__file__))
(out/'spec.json').write_text(json.dumps(s,indent=2)+'\n')
print(json.dumps(dict(floorArea=foot.area,holes=len(foot.interiors),tiles=len(tiles),solids=len(solids),meshes=len(meshes),guardObjects=[r['sourceObject']for r in meshes])))
