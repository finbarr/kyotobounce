"""Retain source basement wall/soffit geometry between existing floor levels."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from closed_mesh_clip import clip,closed
source,out=map(Path,sys.argv[1:]);out.mkdir();s=json.loads(source.read_text())
assert s['sourceSha256']=='0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1'
ts=[t for t in s['triangles']if t['object']=='Untitled.200' and min(v[1]for v in t['vertices'])<-.15 and max(v[2]for v in t['vertices'])>-10]
sourceFloorY=-4.913583+.036583
aligned=[]
vertices=[];faces=[];lookup={}
for t in ts:
 ids=[]
 for original in t['vertices']:
  v=original.copy()
  if abs(v[1]-sourceFloorY)<1e-4:
   if v[1]!=sourceFloorY:aligned.append(dict(original=original,alignedY=sourceFloorY))
   v[1]=sourceFloorY
  key=tuple(v)
  if key not in lookup:lookup[key]=len(vertices);vertices.append(v)
  ids.append(lookup[key])
 faces.append(ids)
# The source exterior basement backing stops at Y=-2.3887 while its inner
# well faces continue upward. Extend only that hidden four-edge back boundary
# to the floor underside so the retained visible faces form a closed solid.
edges={}
for tri in faces:
 for a,b in zip(tri,tri[1:]+tri[:1]):edges.setdefault(tuple(sorted([a,b])),[]).append((a,b))
boundary=[e[0]for e in edges.values()if len(e)==1]
back=[(a,b)for a,b in boundary if abs(vertices[a][1]+2.3887317180633545)<1e-8 and abs(vertices[b][1]+2.3887317180633545)<1e-8]
assert len(back)==4
raised={}
for a,b in back:
 for k in [a,b]:
  if k not in raised:raised[k]=len(vertices);vertices.append([vertices[k][0],-.2+.036583,vertices[k][2]])
 faces.extend([[b,a,raised[a]],[b,raised[a],raised[b]]])
v=np.array(vertices);f=np.array(faces,dtype=int)
assert min(v[:,2])>-10 and max(v[:,2])<3 and min(v[:,0])>-16 and max(v[:,0])<18
# Clip source faces at the actual construction floor underside and lower deck.
# This removes the source lower slab and upper floor rather than duplicating them.
v,f=clip(v,f,1,-.2+.036583,False)
# Coplanar top faces belong to the removed lower slab. Cap the retained walls
# after removing them, rather than retaining a zero-thickness sheet.
f=np.array([tri for tri in f if max(abs(v[tri,1]-sourceFloorY))>1e-8])
v,f=clip(v,f,1,sourceFloorY,True)
volume=closed(v,f);v[:,1]-=.036583
report=dict(sourceInventory=dict(path=str(source),sha256=hashlib.sha256(source.read_bytes()).hexdigest()),sourceSha256=s['sourceSha256'],sourceObject='Untitled.200',sourceFaces=[t['face']for t in ts],datumShiftM=-.036583,clipWorldY=[-4.913583,-.2],vertices=v.tolist(),indices=f.flatten().tolist(),volumeM3=volume,lowerDeckAlignment=dict(sourceY=sourceFloorY,thresholdM=1e-4,maximumAdjustmentM=max(abs(p['original'][1]-p['alignedY'])for p in aligned),vertexOccurrences=len(aligned),decision='Coalesce near-horizontal source lower-deck vertices to the existing common floor datum before clipping; other coordinates remain exact.'),hiddenBackingExtensionTriangles=8,hiddenBackingSourceY=-2.3887317180633545,limits=['Four hidden exterior backing edges extend upward to the floor underside; this closure is inferred, not a surveyed surface.','Source lower-deck vertices within0.1mm of the common floor datum are aligned to it to avoid spurious sliver faces.','Source enclosure geometry only; source has no deeper route below the first lower deck.','Wall material and current shopfronts/lighting require independent reference matching.','This component must pass native clearance/walk checks before integration.'])
(out/'spec.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(sourceFaces=len(ts),vertices=len(v),triangles=len(f),volumeM3=volume)))
