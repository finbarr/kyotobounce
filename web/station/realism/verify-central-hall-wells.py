"""Check complete floor topology and preserved guard source faces/sections."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box,MultiLineString
from shapely.ops import unary_union
from shapely import set_precision,build_area
sp,component,out=map(Path,sys.argv[1:]);assert out.resolve().is_relative_to(Path('.local').resolve())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
s=json.loads(sp.read_text());report=json.loads((component/'report.json').read_text());np=component/'native-panels.json';n=json.loads(np.read_text());assert report['specSha256']==sha(sp) and report['outputs']['nativePanelsSha256']==sha(np)
file=Path(s['basement']['sourceInventory']['path']);assert sha(file)==s['basement']['sourceInventory']['sha256'];a=json.loads(file.read_text());assert sha(Path(s['source']['file']))==a['sourceSha256'];ts=a['triangles'];f=s['frame'];dy=s['basement']['sourceDatumY']
source=unary_union([set_precision(Polygon([(v[0],v[2])for v in t['vertices']]),1e-5)for t in ts if t['object']=='Untitled.200' and t['normal'][1]>.99 and all(abs(v[1]-.036583)<.001 for v in t['vertices'])])
# Input triangles use the declared 10-micrometre grid. Subsequent clipping
# must preserve the analytic gate edges rather than resnap them.
source=set_precision(source,0)
def worldrect(x0,d0,x1,d1):return Polygon([(x,f['frontZ']+f['slope']*x+d)for x,d in [(x0,d0),(x1,d0),(x1,d1),(x0,d1)]])
approach=worldrect(s['context']['westX'],-s['context']['floorApproachM'],s['context']['eastX'],0)
expected=source.intersection(box(-16,-10,18,3).union(approach)).union(worldrect(s['gate']['westX'],0,s['gate']['eastX'],s['bay']['depthM']))
back=[];tiles=[]
def triangles(p):return [[[p['vertices'][k]['x'],p['vertices'][k]['y'],-p['vertices'][k]['z']]for k in p['triangles'][i:i+3][::-1]]for i in range(0,len(p['triangles']),3)]
for p in n['panels']:
 if not p['id'].startswith('hall-bay-floor-'):continue
 for vs in triangles(p):
  if all(abs(v[1]+.002)<1e-9 for v in vs):target=back
  elif all(abs(v[1])<1e-9 for v in vs):target=tiles
  else:continue
  target.append(Polygon([(v[0],v[2])for v in vs]))
b=unary_union(back);tile=unary_union(tiles);error=b.symmetric_difference(expected).area;outside=tile.difference(expected).area
assert b.is_valid and b.geom_type=='Polygon' and len(b.interiors)==3
holes=[Polygon(r)for r in expected.interiors];probes=[[p.representative_point().x,p.representative_point().y]for p in holes]
assert all(not b.contains(p.representative_point())for p in holes)
def section(tris,y):
 lines=[]
 for vs in tris:
  hits=[]
  for u,v in zip(vs,vs[1:]+vs[:1]):
   if min(u[1],v[1])<y<max(u[1],v[1]):
    t=(y-u[1])/(v[1]-u[1]);hits.append([u[0]+t*(v[0]-u[0]),u[2]+t*(v[2]-u[2])])
  if len(hits)==2:lines.append(hits)
 return build_area(set_precision(MultiLineString(lines),1e-5))
rows=[];sourceTriangleCount=0;maxVertexError=0
for part in s['basement']['meshes']:
 src=[t for t in ts if t['object']==part['sourceObject']];native=next(p for p in n['panels']if p['id']=='hall-bay-well-'+part['id']);nt=triangles(native)
 assert len(nt)>len(src)
 for t,actual in zip(src,nt):
  for v,w in zip(t['vertices'],actual):maxVertexError=max(maxVertexError,max(abs(v[k]-(w[k]+dy if k==1 else w[k]))for k in range(3)))
 sourceTriangleCount+=len(src)
 for y in ([.3,.7,1.05,1.15]if part['role']=='basement-glass'else[1.208]):
  A=section([t['vertices']for t in src],y);B=section(nt,y-dy);assert A.area>0 and B.area>0
  rows.append(dict(object=part['sourceObject'],sourceY=y,symmetricDifferenceM2=A.symmetric_difference(B).area,hausdorffM=A.hausdorff_distance(B)))
passed=error<1e-6 and outside<1e-6 and maxVertexError<1e-10 and all(r['symmetricDifferenceM2']<1e-6 and r['hausdorffM']<1e-5 for r in rows)
p=probes[0];receipt=dict(pass_=passed,specSha256=sha(sp),nativeSha256=sha(np),sourceInventorySha256=sha(file),sourceSha256=a['sourceSha256'],backingFootprintSymmetricDifferenceM2=error,tileAreaOutsideFootprintM2=outside,actualBackingAreaM2=b.area,holes=3,openCutoutProbesWorld=probes,openCutoutProbeLocal=[p[0],p[1]-f['frontZ']-f['slope']*p[0]],sourceTriangleCount=sourceTriangleCount,maximumSourceVertexErrorM=maxVertexError,sections=rows,limits='Source shape and complete floor footprint only; no basement descent or integrated station/course proof.')
receipt['pass']=receipt.pop('pass_');out.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt));assert passed
