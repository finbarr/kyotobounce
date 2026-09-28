"""Preserve source rail/glass faces, closing only their material interfaces."""
import json,sys,hashlib,collections
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment
inventoryp,lanep,out=map(Path,sys.argv[1:]);out.mkdir();load=lambda p:json.loads(p.read_text());inv=load(inventoryp);lanes=load(lanep);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();ts=inv['triangles'];meshes=[];measurements=[];metalCores=[]

def mesh(faces):
 vs=[];ids=[];lookup={}
 for f in faces:
  row=[]
  for p in f['vertices']:
   key=tuple(p)
   if key not in lookup:lookup[key]=len(vs);vs.append(p)
   row.append(lookup[key])
  ids.extend(row)
 return vs,ids

def boundaries(vs,ids):
 edges={}
 for i in range(0,len(ids),3):
  t=ids[i:i+3]
  for a,b in zip(t,t[1:]+t[:1]):edges.setdefault(tuple(sorted([a,b])),[]).append((a,b))
 assert all(len(v)<=2 for v in edges.values())
 remaining={a:b for e in edges.values()if len(e)==1 for a,b in e};assert len(remaining)==sum(len(e)==1 for e in edges.values())
 loops=[]
 while remaining:
  a=min(remaining);loop=[];cur=a
  while True:
   loop.append(cur);cur=remaining.pop(cur)
   if cur==a:break
  loops.append(loop)
 return loops

def validate(vs,ids):
 edges={};volume=0
 for i in range(0,len(ids),3):
  t=ids[i:i+3];a,b,c=[np.array(vs[k])for k in t];volume+=float(a@np.cross(b,c))/6
  for a,b in zip(t,t[1:]+t[:1]):edges.setdefault(tuple(sorted([a,b])),[]).append((a,b))
 assert all(len(es)==2 and es[0]==es[1][::-1]for es in edges.values())
 assert volume>1e-8,volume
 return volume

def emit(id,faces,vs,ids,material,extra):
 volume=validate(vs,ids);sourceIds=[dict(object=f['object'],primitive=f['primitive'],face=f['face'])for f in faces]
 meshes.append(dict(id=id,vertices=[[x,y-.018263,z]for x,y,z in vs],indices=ids,material=material,role='hall-basement-'+material,sourceFaces=sourceIds,originalFaceCount=len(faces),closureFaces=len(ids)//3-len(faces),volumeM3=volume,**extra))

for bank,names in zip(lanes['banks'],[dict(rail='1354',glass='1372',metal='1927',body='1460',plate='1601',steps='1541',missing=.15),dict(rail='1657',glass='1760',metal='1917',body='2066',plate='1471',steps='2070',missing=-.15)]):
 U=np.array(bank['uphillRenderer']);R=np.array([-U[2],0,U[0]]);O=np.array(bank['lowerCenterRenderer']);O[1]=0
 local=lambda p:np.array([(np.array(p)-O)@U,p[1],(np.array(p)-O)@R])
 select=lambda suffix:[t for t in ts if t['object']=='BuildingInstallation.'+suffix]
 railfaces=select(names['rail']);vs,ids=mesh(railfaces);loops=boundaries(vs,ids);assert len(loops)==4
 railPairError=0
 for loop in loops:
  cross=[i for i in range(len(loop))if abs((np.array(vs[loop[(i+1)%len(loop)]])-np.array(vs[loop[i]]))@R)>.03];assert len(cross)==2
  i,j=sorted(cross);p=loop[i+1:j+1];q=(loop[j+1:]+loop[:i+1])[::-1];assert len(p)==len(q)==52
  mismatch=max(np.linalg.norm(local(vs[a])[:2]-local(vs[b])[:2])for a,b in zip(p,q));assert mismatch<.01,mismatch
  railPairError=max(railPairError,mismatch)
  for a,b,aa,bb in zip(p,p[1:],q,q[1:]):ids.extend([b,a,aa,b,aa,bb])
 emit('hall-basement-'+bank['name']+'-source-handrails',railfaces,vs,ids,'rubber',dict(interfaces=4,maximumProfilePairErrorM=railPairError))
 railVs,railCaps=vs,ids[len(railfaces)*3:]
 # One eighth glass side was assigned to the metal object in the source export.
 # Its opposing 62-triangle face has the same boundary profile as the seven glass sides.
 glassfaces=select(names['glass']);missing=[f for f in select(names['metal'])if all(abs(local(p)[2]-names['missing'])<.012 for p in f['vertices']) and abs(np.array(f['normal'])@R)>.95]
 assert len(missing)==62
 glassfaces+=missing;gv,gi=mesh(glassfaces);gl=boundaries(gv,gi);assert len(gl)==8 and all(len(l)==64 for l in gl)
 gl.sort(key=lambda loop:np.mean([local(gv[i])[2]for i in loop]));gis=gi[:];glassRows=[]
 for k in range(0,8,2):
  a,b=gl[k:k+2];best=None
  for shift in range(64):
   q=(b[::-1]+b[::-1])[shift:shift+64];errors=[np.linalg.norm(local(gv[i])[:2]-local(gv[j])[:2])for i,j in zip(a,q)];candidate=(max(errors),sum(errors),q)
   if best is None or candidate[:2]<best[:2]:best=candidate
  err,_,q=best;assert err<.012,err
  for i in range(64):j=(i+1)%64;gi.extend([a[j],a[i],q[i],a[j],q[i],q[j]])
  glassRows.append(dict(lateralCenterM=float(np.mean([local(gv[i])[2]for i in a+q])),meanThicknessM=float(np.mean([abs(local(gv[i])[2]-local(gv[j])[2])for i,j in zip(a,q)])),profilePairErrorM=err,boundaryRenderer=[[gv[i][0],gv[i][1]-.018263,gv[i][2]]for i in a]))
 emit('hall-basement-'+bank['name']+'-source-glass',glassfaces,gv,gi,'glass',dict(interfaces=4,reclassifiedGlassSourceObject='BuildingInstallation.'+names['metal'],reclassifiedFaceCount=62,profiles=glassRows))
 missingIds={f['face']for f in missing}
 coreFaces=[f for f in select(names['metal'])if f['face']not in missingIds]+select(names['plate'])+select(names['steps'])
 cv,ci=mesh(coreFaces);lookup={tuple(v):i for i,v in enumerate(cv)}
 for vertices,capIndices in [(railVs,railCaps),(gv,gi[len(glassfaces)*3:])]:
  for i in range(0,len(capIndices),3):
   for j in capIndices[i:i+3][::-1]:
    v=vertices[j];key=tuple(v)
    if key not in lookup:lookup[key]=len(cv);cv.append(v)
    ci.append(lookup[key])
 volume=validate(cv,ci)
 metalCores.append(dict(id='hall-basement-'+bank['name']+'-source-trim',bank=bank['name'],vertices=[[x,y-.018263,z]for x,y,z in cv],indices=ci,volumeM3=volume,sourceFaces=[dict(object=f['object'],face=f['face'])for f in coreFaces],closedMaterialInterfaces=True))
 fs=select(names['body']);vs,ids=mesh(fs);emit('hall-basement-'+bank['name']+'-source-bank-body',fs,vs,ids,'steel',dict(interfaces=0))
 measurements.append(dict(bank=bank['name'],glass=glassRows))
result=dict(sourceInventory=dict(path=str(inventoryp),sha256=sha(inventoryp)),laneSpec=dict(path=str(lanep),sha256=sha(lanep)),sourceSha256=inv['sourceSha256'],datumShiftY=-.018263,metalCores=metalCores,meshes=meshes,measurements=measurements,limits=['Original source rail/glass/body vertices and faces are retained after the declared landing-aligned height shift; source accuracy is not survey accuracy.','Open rail undersides and glass perimeter interfaces are closed by pairing their original boundary vertices.','One glass side per bank is reclassified from its source metal object based on its exact opposing pane profile and bilateral bank correspondence.','Operating settings and native casing remain the previous game construction.'])
(out/'spec.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps([dict(id=m['id'],sourceFaces=m['originalFaceCount'],closureFaces=m['closureFaces'],volumeM3=m['volumeM3'])for m in meshes],indent=2))
