"""Join the garden arrival to the roof court and its western public passage."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.ops import unary_union
manifest,out=map(Path,sys.argv[1:]);m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];l=json.loads(raw)
assert Path('.local').resolve() in out.resolve().parents
p=next(p for p in l['panels']if p['id']=='garden-access-garden-floor');G=max(v['y']for v in p['vertices'])
faces=[]
for i in range(0,len(p['triangles']),3):
 vs=[p['vertices'][k]for k in p['triangles'][i:i+3]]
 if all(abs(v['y']-G)<1e-5 for v in vs):faces.append(Polygon([(v['x'],v['z'])for v in vs]))
arrival=unary_union(faces)
court=box(-202.3,-25,-168,5.4);passage=box(-244,-1.7,-202.3,5.4);bay=box(-201.9,5.4,-190,8.4)
floor=unary_union([arrival,court,passage,bay]);assert floor.geom_type=='Polygon'and floor.is_valid
retired=[p['id']for p in l['panels']if p['id'].startswith('k008-')or p['id']=='garden-access-garden-floor'];assert len(retired)==22
moved=[id for id in retired if id.startswith('k008-')and not id.startswith('k008-perimeter-')];assert len(moved)==18
inventory=json.loads((out/'source-inventory.json').read_text());assert inventory['parentLayoutSha256']==m['layoutSha256'];source_only=inventory['sourceOnlyIds'];assert len(source_only)==183 and all(id.startswith('add-garden-')for id in source_only)
boxes=[p['id']for p in l['boxes']if p['id'].startswith('add-garden-')];assert len(boxes)==61
retired=boxes+retired+source_only
# The three municipal meshes contain the coarse roof court and planters. Fit
# cuts to the public floor, preserving the perimeter rooms and lower building.
volumes=[[[ -202.3,-169.4],[G-.6,G+5],[-25,5.4]],[[-244,-202.3],[G-.6,G+2.2],[-1.7,5.4]],[[-201.9,-190],[G-.6,G+2.2],[5.4,8.4]],[[-197.5,-193.9],[G+.9,G+2.25],[8.4,9.85]]]
ids=['municipal-station-wing-west-Untitled.'+n for n in ['199','201','203']]
spec=dict(componentPrefix='garden-promenade-',parentLayoutSha256=m['layoutSha256'],floor=G,footprint=mapping(floor),arrival=mapping(arrival),court=mapping(court),passage=mapping(passage),bay=mapping(bay),movedIds=moved,translation=dict(x=-29,y=0,z=12),retiredIds=retired,movedSourceIds=[id for id in boxes if id!='add-garden-arrival']+source_only,retiredBoxIds=boxes,retiredSourceOnlyIds=source_only,retiredRouteIds=['add-garden-edge-walk'],retiredLabelIds=['add-garden-arrival'],retiredLights=[],modifiedFlightIds=[],cuts={id:volumes for id in ids},preservedOverlapArea={'garden-access-garden-floor':0})
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print(dict(retired=len(retired),relocated=len(moved),floorArea=floor.area,cuts=ids))
