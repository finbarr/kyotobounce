"""Fit the lower banks and cut only their footprints from the existing B1 floor."""
from pathlib import Path
import sys,json,hashlib,math
from shapely.geometry import Polygon,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];l=json.loads(raw)
p=next(p for p in l['panels'] if p['id']=='hall-basement-lower-floor');y=max(v['y'] for v in p['vertices']);tops=[]
for i in range(0,len(p['triangles']),3):
 vs=[p['vertices'][j] for j in p['triangles'][i:i+3]]
 if all(abs(v['y']-y)<1e-6 for v in vs):
  q=Polygon([(v['x'],v['z']) for v in vs]);assert q.area>0;tops.append(q)
floor=unary_union(tops);assert floor.geom_type=='Polygon' and floor.is_valid
height=3.8;run=height/math.tan(math.pi/6);banks=[];cuts=[]
for side in ['west','east']:
 lanes=[e for e in l['escalators'] if e['id'].startswith('hall-basement-'+side+'-escalator-')];assert len(lanes)==2
 e=lanes[0];u=(e['uphill']['x'],e['uphill']['z']);r=(-u[1],u[0]);points=[]
 for e in lanes:
  x,z=e['lowerCenter']['x'],e['lowerCenter']['z']
  # Keep the original lower-pit holes; extend each bank opening toward its new upper comb.
  for a in [-e['flatLength']-.15,run+e['flatLength']-.03]:
   for w in [-e['width']/2-.17,e['width']/2+.17]:points.append((x+a*u[0]+w*r[0],z+a*u[1]+w*r[1]))
 cut=Polygon(points).convex_hull;assert floor.envelope.contains(cut);cuts.append(cut)
 banks.append({'side':side,'templates':[e['id'] for e in lanes],'hole':mapping(cut),'height':height,'run':run})
remaining=floor.difference(unary_union(cuts));assert remaining.is_valid and remaining.geom_type=='Polygon'
oldholes=[Polygon(r) for r in floor.interiors]
newids=['hall-basement-lower-floor','subway-passage-corridor-wall-147','subway-passage-corridor-base-147.1','subway-passage-corridor-band-147.1']
newids += [p['id'] for p in l['panels'] if p['id'].startswith('subway-passage-wall-joint-147.1-') and -43<float(p['id'].split('147.1-')[1])<-29]
def footprint(p):
 triangles=[]
 for i in range(0,len(p['triangles']),3):
  q=Polygon([(p['vertices'][j]['x'],p['vertices'][j]['z'])for j in p['triangles'][i:i+3]])
  if q.area>1e-12:triangles.append(q)
 return unary_union(triangles)
# The retained raised tactile bars cross the eastern escalator well and hold
# the capsule at ground level. Keep only bars backed by the actual hall deck.
ground=footprint(next(p for p in l['panels'] if p['id']=='hall-bay-floor-surface'))
tactile=next(p for p in l['panels'] if p['id']=='tactile-concourse-branch-raised')
bars=footprint(tactile);kept=bars.intersection(ground)
newids.append(tactile['id'])
backing=next(p for p in l['panels'] if p['id']=='tactile-concourse-branch-base')
kept_backing=footprint(backing).intersection(ground)
newids.append(backing['id'])
assert all(any(p['id']==k for p in l['panels']) for k in newids)
r={'parentLayoutSha256':m['layoutSha256'],'b1':y,'b2':y-height,'subway':-6.2,'banks':banks,'originalFloor':mapping(floor),'b1Floor':mapping(remaining),'b2PitHoles':[mapping(p) for p in oldholes],'retiredIds':newids,'removedFloorArea':floor.area-remaining.area,'assumptions':['B2 fitted 3.8 m below the source-derived B1 floor; no surveyed lower datum is claimed.','Lower banks use a fitted 30 degree slope beneath the retained upper banks.','B2 retail/circulation footprint and the subway stair/ramp transition are schematic fits to operator diagrams.']}
r['retainedTactile']=[mapping(q)for q in kept.geoms]
r['retainedTactileBacking']=[mapping(q)for q in getattr(kept_backing,'geoms',[kept_backing])]
r['tactileMaterial']=next(m for m in l['authoredMaterials']if m['id']==tactile['appearance'])
r['tactileY']=max(v['y']for v in tactile['vertices']);r['tactileDepth']=r['tactileY']-min(v['y']for v in tactile['vertices'])
r['removedUnsupportedTactileArea']=bars.area-kept.area
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(r,indent=2)+'\n');print({k:r[k] for k in ['b1','b2','removedFloorArea','removedUnsupportedTactileArea','retiredIds']})
