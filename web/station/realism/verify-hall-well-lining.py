"""Check retained source faces and classify every added enclosure face."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely import set_precision
inventory,specpath,component,out,*floorargs=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
s=load(specpath);a=load(inventory);n=load(component/'native-panels.json');r=load(component/'report.json');assert sha(inventory)==s['sourceInventory']['sha256'] and r['specSha256']==sha(specpath)
p=n['panels'][0];v=np.array([[q['x'],q['y'],-q['z']]for q in p['vertices']]);faces=v[np.array(p['triangles']).reshape(-1,3)[:,::-1]];lo,hi=s['clipWorldY']
sources=[t for t in a['triangles']if t['object']==s['sourceObject']and t['face']in s['sourceFaces']]
def clip(poly,y,above):
 result=[]
 for A,B in zip(poly,poly[1:]+poly[:1]):
  da=(A[1]-y)*(1 if above else -1);db=(B[1]-y)*(1 if above else -1)
  if da>=0:result.append(A)
  if (da<0<db)or(db<0<da):result.append(A+(B-A)*(da/(da-db)))
 return result
floorCoverage=None;floorEvidence=None
if 'lowerDeckAlignment'in s:
 assert len(floorargs)==1,'Aligned lower deck requires the separate floor component as a coverage witness'
 floorDir=floorargs[0];floorNative=load(floorDir/'native-panels.json');floorReport=load(floorDir/'report.json');assert sha(floorDir/'native-panels.json')==floorReport['outputs']['nativePanelsSha256']
 topology=inventory.parent/'floor-topology.json';assert sha(topology)=='7c3f20b6ff67b312e3c7a618d54619f78511a061d0c098eb10f71f4efb49537e'
 floorGrid=load(topology)['precisionMetres'];assert floorGrid==1e-5
 floorPolygons=[]
 for panel in floorNative['panels']:
  if panel['id']!='hall-basement-lower-floor'and '-source-trim-'not in panel['id']:continue
  fv=np.array([[q['x'],q['y'],-q['z']]for q in panel['vertices']]);ft=fv[np.array(panel['triangles']).reshape(-1,3)[:,::-1]]
  floorPolygons.extend(Polygon(t[:,[0,2]])for t in ft if max(abs(t[:,1]-lo))<1e-4 and np.cross(t[1]-t[0],t[2]-t[0])[1]>1e-10)
 floorCoverage=unary_union(floorPolygons);floorEvidence=dict(nativeSha256=sha(floorDir/'native-panels.json'),sourceTopologySha256=sha(topology),existingGridM=floorGrid)
covered=np.zeros(len(faces),dtype=bool);checks=[]
for t in sources:
 tri=np.array(t['vertices']);
 if 'lowerDeckAlignment'in s:
  align=s['lowerDeckAlignment'];mask=abs(tri[:,1]-align['sourceY'])<align['thresholdM'];tri[mask,1]=align['sourceY']
 tri[:,1]+=s['datumShiftM'];poly=clip(clip(list(tri),lo,True),hi,False)
 if len(poly)<3:continue
 normal=np.cross(tri[1]-tri[0],tri[2]-tri[0]);normal/=np.linalg.norm(normal);axes=[i for i in range(3)if i!=np.argmax(abs(normal))]
 expected=Polygon([q[axes]for q in poly]);
 if expected.area<1e-12:continue
 if floorCoverage is not None and max(abs(tri[:,1]-lo))<1e-8:
  assert axes==[0,2]
  # Check these faces against their actual owning floor and landing components.
  # The coordinate grid is read from the pre-existing, hash-verified floor topology.
  floorExpected=set_precision(expected,floorGrid);missing=floorExpected.difference(floorCoverage).area
  assert missing<1e-7,(t['face'],missing,'Separate floor coverage failure')
  checks.append(dict(sourceFace=t['face'],owner='separate-lower-floor-and-landing-plates',projectedAreaM2=expected.area,missingAreaM2=missing,rawSourceMissingAreaM2=expected.difference(floorCoverage).area,existingFloorGridM=floorGrid));continue
 same=np.max(abs((faces-tri[0])@normal),axis=1)<1e-8
 actual=unary_union([Polygon(q[:,axes])for q in faces[same]]);missing=expected.difference(actual).area
 # Each source fragment must remain; added overlapping coplanar faces are classified separately below.
 assert missing<1e-7,(t['face'],missing)
 for i in np.flatnonzero(same):
  q=Polygon(faces[i][:,axes]);
  if q.difference(expected).area<1e-8:covered[i]=True
 checks.append(dict(sourceFace=t['face'],projectedAreaM2=expected.area,missingAreaM2=missing))
# Remaining geometry may only be a horizontal cut cap or the declared hidden backing extension.
outer=[[-12.997270584106445,-7.7565412521362305],[15.402796745300293,-8.223506927490234],[15.507966041564941,-1.8715845346450806],[-12.890141487121582,-1.4046136140823364]]
added=[]
for i in np.flatnonzero(~covered):
 tri=faces[i];kind=None
 if max(abs(tri[:,1]-lo))<1e-8 or max(abs(tri[:,1]-hi))<1e-8:kind='horizontal-cut-cap'
 else:
  for A,B in zip(outer,outer[1:]+outer[:1]):
   A=np.array(A);B=np.array(B);u=B-A;dist=abs((tri[:,0]-A[0])*u[1]-(tri[:,2]-A[1])*u[0])/np.linalg.norm(u)
   along=(tri[:,[0,2]]-A)@u/(u@u)
   if max(dist)<1e-8 and min(along)>-1e-8 and max(along)<1+1e-8 and min(tri[:,1])>=s['hiddenBackingSourceY']+s['datumShiftM']-1e-8:kind='declared-hidden-backing';break
 assert kind,(i,tri.tolist());added.append(dict(face=int(i),kind=kind))
report=dict(sourceInventorySha256=sha(inventory),specSha256=sha(specpath),nativeSha256=sha(component/'native-panels.json'),sourceFragmentsChecked=len(checks),separateFloorEvidence=floorEvidence,lowerDeckAlignment=s.get('lowerDeckAlignment'),maximumMissingProjectedAreaM2=max(c['missingAreaM2']for c in checks),classifiedAddedFaces=len(added),checks=checks,added=added,pass_=True,limits='Source surface preservation and explicit construction closures; not optical fidelity or complete station integration.')
report['pass']=report.pop('pass_');out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k not in ['checks','added']}))
