"""Independent native scope and planar Boolean coverage proof for courtyard walls."""
import json,hashlib,sys,collections,math,struct
import numpy as np
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
before,after,component,specPath,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=load(before/'station-layout.json');b=load(after/'station-layout.json');native=load(component/'native-panels.json');spec=load(specPath);proof=b['architecture']['courtAdjacentWalls']
assert proof['inputLayoutSha256']==sha(before/'station-layout.json');assert proof['componentNativeSha256']==sha(component/'native-panels.json');assert proof['specSha256']==sha(specPath)
sourceIds={q['id'] for q in proof['sourceChanges']};assert sourceIds=={'municipal-station-wing-east-Untitled.203','municipal-station-court-east-Untitled.203'}
lookup={p['id']:p for p in b['panels']};assert len(lookup)==len(b['panels']);newIds={p['id'] for p in native['panels']};assert set(lookup)==set(p['id'] for p in a['panels'])|newIds
retained=0
for p in a['panels']:
 if p['id'] not in sourceIds:assert p==lookup[p['id']],p['id'];retained+=1
for k in a:
 if k not in ['panels','authoredMaterials','architecture']:assert a[k]==b[k],k
assert b['authoredMaterials'][:len(a['authoredMaterials'])]==a['authoredMaterials'];assert len(b['authoredMaterials'])-len(a['authoredMaterials'])==3;assert len(set(m['id'] for m in b['authoredMaterials']))==len(b['authoredMaterials']);arch=dict(b['architecture']);arch.pop('courtAdjacentWalls');assert arch==a['architecture']
def triangles(p):
 vs=[[v['x'],v['y'],-v['z']] for v in p['vertices']]
 return [[vs[i] for i in p['triangles'][j:j+3]] for j in range(0,len(p['triangles']),3)]
def uv(p,v):return [sum((v[k]-p['origin'][k])*p['u'][k] for k in range(3)),v[1]]
def eligible(p,t):return all(abs(sum((v[k]-p['origin'][k])*p['normal'][k] for k in range(3)))<.012 for v in t) and Polygon([uv(p,v) for v in t]).area>1e-8
def key(t):return tuple(sorted(tuple(round(v,6) for v in p) for p in t))
records=[];totals={p['id']:0. for p in spec['patches']}
for id in sorted(sourceIds):
 old=next(p for p in a['panels'] if p['id']==id);new=lookup[id];ot=triangles(old);nt=triangles(new)
 A=collections.Counter(key(t) for t in ot if not any(eligible(p,t) for p in spec['patches']));B=collections.Counter(key(t) for t in nt if not any(eligible(p,t) for p in spec['patches']));assert not A-B,(id,'An unaffected original triangle changed or disappeared')
 # New near-degenerate boundary fragments can fall below the planar-area
 # classifier. Prove each is tiny and lies on an actually clipped source face;
 # never ignore a missing original triangle or an arbitrary new surface.
 boundaryFragments=[]
 for triangle,count in (B-A).items():
  t=np.array(triangle);area=float(np.linalg.norm(np.cross(t[1]-t[0],t[2]-t[0]))/2);assert 0<area<1e-8,(id,'Unexpected added triangle',area)
  supported=False;supportError=None
  for patch in spec['patches']:
   if not all(abs(np.dot(v-np.array(patch['origin']),patch['normal']))<.012 for v in t):continue
   l,y,r,z=patch['bounds'];pts=[uv(patch,v) for v in t]
   if min(max(abs(v[axis]-edge) for v in pts) for axis,edge in [(0,l),(0,r),(1,y),(1,z)])>.002:continue
   for oldtri in ot:
    if not eligible(patch,oldtri):continue
    Q=np.array(oldtri);normal=np.cross(Q[1]-Q[0],Q[2]-Q[0]);normal/=np.linalg.norm(normal);error=float(max(abs((v-Q[0])@normal) for v in t))
    if error>1e-5:continue
    shape=Polygon([uv(patch,v) for v in oldtri]);candidate=Polygon(pts)
    if shape.buffer(1e-5).covers(candidate):supported=True;supportError=error;break
   if supported:break
  assert supported,(id,'Boundary fragment lacks source support',triangle)
  boundaryFragments.append({'vertices':triangle,'count':count,'areaM2':area,'sourcePlaneErrorM':supportError})
 patches=[]
 for p in spec['patches']:
  O=unary_union([Polygon([uv(p,v) for v in t]) for t in ot if eligible(p,t)]);N=unary_union([Polygon([uv(p,v) for v in t]) for t in nt if eligible(p,t)]);clip=box(*p['bounds']);removed=O.intersection(clip).area;expected=O.difference(clip);error=expected.symmetric_difference(N).area;remaining=N.intersection(clip).area
  assert error<.001 and remaining<.001,(id,p['id'],error,remaining)
  totals[p['id']]+=removed;patches.append({'id':p['id'],'removedAreaM2':removed,'outsideCoverageErrorM2':error,'remainingInsideM2':remaining})
 records.append({'id':id,'unchangedNonPatchTriangles':sum(A.values()),'additionalBoundaryFragments':boundaryFragments,'patches':patches})
for p in spec['patches']:assert abs(totals[p['id']]-p['areaM2'])<.001,(p['id'],totals[p['id']],p['areaM2'])
glb=(component/'court-adjacent.glb').read_bytes();size=struct.unpack_from('<I',glb,12)[0];g=json.loads(glb[20:20+size]);materials={m['label']:m['id'] for m in b['authoredMaterials']};positionError=0
for p in native['panels']:
 q=lookup[p['id']];assert all(q[k]==p[k] for k in p if k not in ['browserMaterial','vertices']);assert q['appearance']==materials['Registered courtyard | '+g['materials'][p['browserMaterial']]['name']];assert len(q['vertices'])==len(p['vertices'])
 for x,y in zip(p['vertices'],q['vertices']):positionError=max(positionError,math.dist([x[k] for k in ['x','y','z']],[y[k] for k in ['x','y','z']]))
assert positionError<1e-5
result={'inputLayoutSha256':sha(before/'station-layout.json'),'layoutSha256':sha(after/'station-layout.json'),'componentNativeSha256':sha(component/'native-panels.json'),'retainedNativePanels':retained,'newPanels':len(newIds),'newMaterials':3,'sourceChecks':records,'patchAreasM2':totals,'maximumComponentPositionErrorM':positionError,'allOtherRecordsAndMaterialsUnchanged':True,'pass':True,'meaning':'Native record preservation, source polygon coverage and component serialization/material identity. Not route, course or visual/performance acceptance.'}
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='sourceChecks'}))
