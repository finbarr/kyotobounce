"""Split long, thin closure triangles without changing their geometry."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from closed_mesh_clip import closed
src,out=map(Path,sys.argv[1:]);out.mkdir();s=json.loads(src.read_text());v=[np.array(p)for p in s['vertices']];faces=np.array(s['indices']).reshape(-1,3).tolist();before=len(faces);splits=0
while True:
 vv=np.asarray(v);ff=np.asarray(faces);pts=vv[ff]
 oncap=np.logical_or.reduce([np.max(abs(pts[:,:,1]-y),axis=1)<1e-8 for y in s['clipWorldY']])
 lengths=np.linalg.norm(np.roll(pts,-1,axis=1)-pts,axis=2);longest=np.max(lengths,axis=1)
 areas=np.linalg.norm(np.cross(pts[:,1]-pts[:,0],pts[:,2]-pts[:,0]),axis=1)
 bad=np.flatnonzero(oncap & (longest>1.0) & (areas/longest**2<1e-4))
 if not len(bad):break
 i=int(bad[0]);tri=faces[i];_,a,b=max((lengths[i,k],tri[k],tri[(k+1)%3])for k in range(3));choice=(a,b)
 a,b=choice;m=len(v);v.append((v[a]+v[b])/2);nextfaces=[];incident=0
 for tri in faces:
  if a in tri and b in tri:
   incident+=1
   for i in range(3):
    A,B,C=tri[i],tri[(i+1)%3],tri[(i+2)%3]
    if {A,B}=={a,b}:nextfaces.extend([[A,m,C],[m,B,C]]);break
  else:nextfaces.append(tri)
 assert incident==2;faces=nextfaces;splits+=1;assert splits<10000
 if splits%500==0:print(json.dumps(dict(splits=splits,triangles=len(faces),remainingThinCaps=len(bad))),flush=True)
v=np.array(v);f=np.array(faces);volume=closed(v,f);assert abs(volume-s['volumeM3'])<1e-8
s['vertices']=v.tolist();s['indices']=f.flatten().tolist();s['capRefinement']=dict(input=str(src),sha256=hashlib.sha256(src.read_bytes()).hexdigest(),edgeBisections=splits,originalTriangles=before,finalTriangles=len(f),maximumLongThinCapEdgeM=1.0,skinnyCriterionDoubleAreaOverLongestEdgeSquared=1e-4,decision='Exact midpoint subdivision, including both edge neighbours. No vertex moves, surface removals or tolerance changes.')
(out/'spec.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s['capRefinement']))
