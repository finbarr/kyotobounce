"""Provisional B1 frontage openings: preserve the source upper well, cut lower portals."""
from pathlib import Path
import json,sys,hashlib
import numpy as np
from closed_mesh_clip import clip,closed
source,floorPath,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=False)
floorBytes=floorPath.read_bytes();floor=json.loads(floorBytes)['lowerFloor']['coordinates'][0]
b=source.read_bytes();s=json.loads(b);v=np.array(s['vertices']);f=np.array(s['indices']).reshape(-1,3)
# Source soffit at -1.5 and deck at -4.913583 constrain vertical construction.
# Shop widths below are provisional, chosen around the existing bank endpoints.
head=-1.55;intervals=[[-11.5,-2.7],[-1.7,4.2],[5.2,14.0]]
up,uf=clip(v,f,1,head,True);low,lf=clip(v,f,1,head,False)
parts=[dict(id='upper-source-well',vertices=up.tolist(),indices=uf.flatten().tolist(),material=0)]
originalVolume=closed(v,f);upperVolume=closed(up,uf);lowerVolume=closed(low,lf)
kept=[];removed=[]
for i,(a,b)in enumerate([[-20,-11.5],[-2.7,-1.7],[4.2,5.2],[14,20]]):
 q,t=clip(low,lf,0,a,True);q,t=clip(q,t,0,b,False)
 volume=closed(q,t);kept.append(volume);parts.append(dict(id=f'lower-source-pier-{i}',vertices=q.tolist(),indices=t.flatten().tolist(),material=1))
for a,b in intervals:
 q,t=clip(low,lf,0,a,True);q,t=clip(q,t,0,b,False);removed.append(closed(q,t))
assert abs(originalVolume-upperVolume-lowerVolume)<1e-7
assert abs(lowerVolume-sum(kept)-sum(removed))<1e-7
cleanup=[]
for part in parts:
 old=np.array(part['vertices']);faces=np.array(part['indices']).reshape(-1,3);lookup={};vs=[];mapping=[]
 for point in old:
  key=tuple(round(float(x),6)for x in point)
  if key not in lookup:lookup[key]=len(vs);vs.append(point)
  mapping.append(lookup[key])
 vs=np.array(vs);mapped=np.array(mapping)[faces];keep=np.array([len(set(t))==3 for t in mapped]);fs=mapped[keep]
 volume=closed(vs,fs);shift=float(max(np.linalg.norm(old-vs[mapping],axis=1)))
 assert shift<1e-6
 cleanup.append(dict(id=part['id'],maximumCoalesceM=shift,removedDegenerateFaces=int(sum(~keep)),volumeM3=volume))
 part['vertices']=vs.tolist();part['indices']=fs.flatten().tolist()
result=dict(headerOffset=dict(sourceSoffitY=-1.5,portalHeadY=head,offsetM=.05,reason="Retain a 50mm stone header below the existing soffit; provisional finish dimension."),vertexCleanup=cleanup,floorParent=dict(path=str(floorPath),sha256=hashlib.sha256(floorBytes).hexdigest()),frontEdges=dict(north=[floor[1],floor[2]],south=[floor[3],floor[0]]),parent=dict(path=str(source),sha256=hashlib.sha256(source.read_bytes()).hexdigest()),floorY=-4.913583,headY=head,openings=intervals,frame=dict(slope=-.016443,northZ=-7.97025,southZ=-1.6175),recessDepthM=2.4,parts=parts,volumes=dict(original=originalVolume,upper=upperVolume,lower=lowerVolume,keptLower=sum(kept),removed=sum(removed),partitionError=abs(lowerVolume-sum(kept)-sum(removed))),evidence=['porta-b2-route-03','porta-b2-route-04','porta-b2-route-05','porta-shopguide-2026','porta-renovation-2025'],limits=['Source surfaces retained except reported sub-micrometre duplicate-vertex coalescing; intentional lower portal cuts supersede closed walls.','Three opening widths per side and 2.4m recess depths are provisional construction assumptions, not surveyed shops.','Porta photographs establish open portals and public circulation; current frontage finishes require post-2025 photographs.','B2F descent, adjoining B1F routes and full-station installation remain incomplete.'])
(out/'spec.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['volumes']))
