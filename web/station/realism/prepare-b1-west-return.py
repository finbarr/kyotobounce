"""Open the B1 western end and join existing aisle boundaries with a return floor."""
from pathlib import Path
import json,sys,hashlib
import numpy as np
from shapely.geometry import Polygon
from closed_mesh_clip import clip,closed
source,out=map(Path,sys.argv[1:]);out.mkdir(exist_ok=False);s=json.loads(source.read_bytes());s['corridorParent']={'path':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
p=next(p for p in s['parts']if p['id']=='lower-source-pier-0');v=np.array(p['vertices']);f=np.array(p['indices']).reshape(-1,3)
a,b=-7.15,-2.05
north,nf=clip(v,f,2,a,False);south,sf=clip(v,f,2,b,True);removed,rf=clip(v,f,2,a,True);removed,rf=clip(removed,rf,2,b,False)
vol=closed(v,f);kept=closed(north,nf)+closed(south,sf);gone=closed(removed,rf);assert abs(vol-kept-gone)<1e-7
s['parts']=[x for x in s['parts']if x['id']!=p['id']]+[dict(id='west-north-jamb',vertices=north.tolist(),indices=nf.flatten().tolist(),material=1),dict(id='west-south-jamb',vertices=south.tolist(),indices=sf.flatten().tolist(),material=1)]
N=min(s['frontEdges']['north']);S=min(s['frontEdges']['south']);W=s['corridorWidthM'];outerX=min(N[0],S[0])-3.0
# Exact aisle end segments and the retained lower floor's oblique west edge.
ring=[[N[0],N[1]-W],N,S,[S[0],S[1]+W],[outerX,S[1]+W],[outerX,N[1]-W]]
poly=Polygon(ring);assert poly.is_valid and poly.area>0
s['westReturn']=dict(floorRing=ring,depthM=3.,openingZ=[a,b],floorAreaM2=poly.area,removedSourceId=p['id'],volume=dict(original=vol,kept=kept,removed=gone,partitionError=abs(vol-kept-gone)),limits=['Source lower western wall intentionally opened using operator B1 adjacency and route photos; 5.1m clear opening and3m return depth are provisional.','Western Isetan interior and southern service corridor are not reconstructed.','No survey or accepted photo registration implied.'])
s['limits']+=s['westReturn']['limits'];(out/'spec.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s['westReturn']))
