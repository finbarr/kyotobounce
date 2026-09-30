"""Pin the sealed 2F frontage and the surfaces crossing its receiving hall."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw)
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
boxes=['add-passage2f-wall--1-0'];panels=[];cuts={}
# The operator plan establishes circulation, not measured construction dimensions.
# Preserve the existing ground ceiling and all structure above the 2F ceiling.
volume=[[-123.2,-68.99],[7.11,11.15],[-28.2,16.2]]
for p in layout['panels']:
 if not (p['id'].startswith(('west-north-','west-south-')) or p['id'].startswith('isetan-ground-') and p.get('role')=='foundation'):continue
 bounds=[[min(v[k]for v in p['vertices']),max(v[k]for v in p['vertices'])]for k in ('x','y','z')]
 if not all(a<hi and b>lo for (a,b),(lo,hi)in zip(bounds,volume)):continue
 if all(all(lo<=v[k]<=hi for k,(lo,hi)in zip(('x','y','z'),volume))for v in p['vertices']):panels.append(p['id'])
 else:cuts[p['id']]=volume
assert len(cuts)>15
ids=boxes+panels
assert {p['id']for p in layout['boxes']if p['id']in ids}==set(boxes)
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
rows=[]
for o in bpy.context.scene.objects:
 id=o.get('kyoto_surface',o.name)
 if o.type!='MESH' or id not in ids:continue
 vs=[o.matrix_world@v.co for v in o.data.vertices]
 rows.append(dict(name=id,dynamic=bool(o.get('kyoto_dynamic')),vertices=[[v.x,v.z,-v.y]for v in vs],materials=[m.name for m in o.data.materials],faces=[dict(vertices=list(p.vertices),material=p.material_index)for p in o.data.polygons]))
assert {r['name']for r in rows}==set(ids)
out.mkdir(parents=True,exist_ok=True)
spec=dict(componentPrefix='isetan-second-',parentLayoutSha256=m['layoutSha256'],retiredIds=ids,retiredBoxIds=boxes,retiredSourceOnlyIds=[],modifiedFlightIds=[],retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],cuts=cuts,floor=7.35,ceiling=11.15)
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'retired-source.json').write_text(json.dumps(rows)+'\n');(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print('ISETAN_SECOND_SCOPE',len(ids),'retired surfaces;',len(cuts),'bounded cuts',flush=True)
