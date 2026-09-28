"""Verify source faces, unchanged mechanisms, and independent metal cut sections."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import LineString,box
from shapely.ops import unary_union,polygonize
invp,rawp,cutp,parentdir,componentdir,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inv,raw,cut,parent,component=load(invp),load(rawp),load(cutp),load(parentdir/'native-panels.json'),load(componentdir/'native-panels.json')
assert component['escalators']==parent['escalators'] and component['combSupports']==parent['combSupports']
old={p['id']:p for p in parent['panels']};new={p['id']:p for p in component['panels']};removed=set(old)-set(new)
coarse=[i for i in removed if '-glass-'in i or '-continuous-handrail-'in i or '-skirt-'in i];replacedInfills=[i for i in removed if '-plate-infill-'in i];assert len(coarse)==56 and len(coarse)+len(replacedInfills)==len(removed) and len(replacedInfills)in [0,4]
assert all(old[i]==new[i]for i in set(old)&set(new))
source={(t['object'],t['primitive'],t['face']):t for t in inv['triangles']};originals=0;maxerr=0
for m in raw['meshes']:
 p=new[m['id']];vertices=np.array([[v['x'],v['y'],-v['z']]for v in p['vertices']]);ids=np.array(p['triangles']).reshape((-1,3))[:,::-1]
 for i,f in enumerate(m['sourceFaces']):
  expected=np.array(source[(f['object'],f['primitive'],f['face'])]['vertices']);expected[:,1]+=raw['datumShiftY'];actual=vertices[ids[i]];error=float(np.max(np.abs(actual-expected)));maxerr=max(maxerr,error);assert error<1e-12;originals+=1

lanes=load(Path(raw['laneSpec']['path']));cores={m['id']:m for m in raw['metalCores']}
def section(vertices,indices,y):
 lines=[];segments=[]
 for t in indices:
  p=vertices[t];d=p[:,1]-y;hits=[]
  for i,j in [(0,1),(1,2),(2,0)]:
   if d[i]*d[j]<0:
    q=p[i]+(p[j]-p[i])*(-d[i]/(d[j]-d[i]));hits.append((round(float(q[0]),7),round(float(q[2]),7)))
  if len(hits)==2 and hits[0]!=hits[1]:
   normal=np.cross(p[1]-p[0],p[2]-p[0]);direction=np.cross(normal,np.array([0.,1.,0.]));delta=np.array([hits[1][0]-hits[0][0],0.,hits[1][1]-hits[0][1]])
   if delta@direction<0:hits.reverse()
   lines.append(LineString(hits));segments.append(hits)
 polys=list(polygonize(unary_union(lines)));selected=[]
 for p in polys:
  q=p.representative_point();count=0
  for (ax,ay),(bx,by)in segments:
   if (ay>q.y)!=(by>q.y) and ax+(q.y-ay)*(bx-ax)/(by-ay)>q.x:count+=1 if by>ay else -1
  if count!=0:selected.append(p)
 return unary_union(selected)
rows=[]
for coreId,core in cores.items():
 parts=[m for m in cut['meshes']if m.get('sourceMetalCoreId',m['id'])==coreId];assert parts
 m=parts[0];bank=next(b for b in lanes['banks']if b['name']in coreId);U=np.array(bank['uphillRenderer']);R=np.array([-U[2],0,U[0]]);O=np.array(bank['lowerCenterRenderer']);O[1]=0
 def transform(vertices):
  v=np.array(vertices);return np.column_stack(((v-O)@U,v[:,1],(v-O)@R))
 a=transform(core['vertices']);ai=np.array(core['indices']).reshape((-1,3));points=[];indices=[]
 for part in parts:
  p=new[part['id']];offset=len(points);points.extend([[v['x'],v['y'],-v['z']]for v in p['vertices']]);indices.extend([i+offset for i in p['triangles']])
 b=transform(points);bi=np.array(indices).reshape((-1,3))[:,::-1]
 for y in [-4.93,-4.7,-4.3,-3.7,-3.1,-2.5,-1.9,-1.3,-.7,-.1,.17,.43,.71,.87]:
  before=section(a,ai,y);after=section(b,bi,y);masks=[box(*[c['along'][0],c['lateral'][0],c['along'][1],c['lateral'][1]])for c in m['booleanCuts']if c['y'][0]<y<c['y'][1]];expected=before.difference(unary_union(masks));delta=expected.symmetric_difference(after).area;boundary=expected.hausdorff_distance(after)if not expected.is_empty and not after.is_empty else 0 if expected.is_empty==after.is_empty else float('inf')
  rows.append(dict(id=m['id'],y=y,beforeAreaM2=before.area,expectedAreaM2=expected.area,actualAreaM2=after.area,symmetricDifferenceM2=delta,boundaryDifferenceM=boundary,pass_=delta<1e-4 and boundary<1e-5))
report=dict(componentNativeSha256=sha(componentdir/'native-panels.json'),unchangedMechanisms=True,unchangedParentPanels=len(set(old)&set(new)),removedCoarsePanels=len(coarse),replacedLandingInfills=len(replacedInfills),exactSourceFaces=originals,maximumSourceFaceErrorM=maxerr,metalSections=rows,sectionFill='Nonzero oriented winding; source metal overlaps must not become parity holes.',sectionTolerance=dict(areaM2=1e-4,boundaryM=1e-5),pass_=all(r['pass_']for r in rows))
report['pass']=report.pop('pass_');out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k!='metalSections'},indent=2));print('sections',len(rows),'max area',max(r['symmetricDifferenceM2']for r in rows),'max boundary',max(r['boundaryDifferenceM']for r in rows));assert report['pass'],[r for r in rows if not r['pass_']]
