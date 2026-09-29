"""Restore the provisional indoor lift opening and cut the real frontage shaft."""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);assert Path('.local').resolve()in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw);panels={p['id']:p for p in layout['panels']}
old=json.loads(Path('.local/v2/current/components/hachijo-lift/spec.json').read_text());slabs=[]
for p in old['slabs']:
 id='hachijo-lift-'+p['id'];assert id in panels
 slabs.append(dict(p,id=id,shape=p['originalShape'],operation='restore'))
opening=dict(minX=164.4,maxX=167.6,minZ=-191.4,maxZ=-188.45)
id='hachijo-east-forecourt';p=panels[id];top=max(v['y']for v in p['vertices']);bottom=min(v['y']for v in p['vertices']);faces=[]
for i in range(0,len(p['triangles']),3):
 vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
 if all(abs(v['y']-top)<1e-6 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
original=unary_union(faces);hole=box(opening['minX'],opening['minZ'],opening['maxX'],opening['maxZ']);kept=original.difference(hole);assert kept.geom_type=='Polygon'and abs(original.area-kept.area-9.44)<.001
slabs.append(dict(id=id,shape=mapping(kept),originalShape=mapping(original),operation='cut',top=top,bottom=bottom,appearance=p['appearance'],material=p['material'],role=p['role']))
retired=[id for id in panels if id.startswith('hachijo-lift-')]+[id,'subway-passage-south-return-east']
assert len(retired)==32
spec=dict(parentLayoutSha256=m['layoutSha256'],retiredIds=retired,retiredLights=[],retiredLiftIds=['subway-hachijo-east-lift'],slabs=slabs,materials=[p for p in layout['authoredMaterials']if p['id']in {s['appearance']for s in slabs}],opening=opening,lower=-6.2,upper=0)
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');print(dict(retiredPanels=len(retired),restoredSlabs=4,newForecourtOpeningM2=hole.area))
