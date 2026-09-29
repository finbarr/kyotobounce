"""Verify the four rebuilt slab surfaces against the retained floor footprints."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,shape
from shapely.ops import unary_union

manifest,component,out=map(Path,sys.argv[1:])
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
layout=json.loads(raw);s=json.loads((component/'spec.json').read_text())
panels={p['id']:p for p in layout['panels']};o=s['opening']
hole=box(o['minX'],o['minZ'],o['maxX'],o['maxZ']);rows=[]
def surface(p,y):
 faces=[]
 for i in range(0,len(p['triangles']),3):
  vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
  if all(abs(v['y']-y)<1e-6 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
 return unary_union(faces)
for slab in s['slabs']:
 assert slab['id']not in panels
 p=panels['hachijo-lift-'+slab['id']];old=shape(slab['originalShape'])
 expected=old.difference(hole)
 for y in [slab['top'],slab['bottom']]:
  actual=surface(p,y)
  assert actual.symmetric_difference(expected).area<.001,(p['id'],y)
  assert actual.intersection(hole).area<.0001,p['id']
 assert abs(old.area-expected.area-9.44)<.001
 rows.append({'id':p['id'],'removedAreaM2':old.area-expected.area,'retainedAreaM2':expected.area})
lift=next(l for l in layout['lifts']if l['id']=='subway-hachijo-east-lift')
assert lift['origin']=={'x':s['centerX'],'y':s['lower'],'z':s['centerZ']}
assert abs(lift['height']-(s['upper']-s['lower']))<1e-7
for name,y in [('passage',s['lower']),('foyer',s['upper'])]:
 sill=panels['hachijo-lift-'+name+'-sill']
 # Both exports use float32 positions; allow their quantization at this offset.
 assert abs(max(v['y']for v in sill['vertices'])-y)<1e-5
 assert abs(min(v['z']for v in sill['vertices'])-o['minZ'])<1e-5
 assert max(v['z']for v in sill['vertices'])>s['centerZ']-1.2
proof={'pass':True,'layoutSha256':m['layoutSha256'],'geometrySha256':m['geometrySha256'],'slabs':rows,'shaftTravelM':lift['height'],'bothSillsMeetCar':True,'existingSlabOpeningsPreserved':True}
out.write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
