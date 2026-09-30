"""Pin the sealed entrance props and the two receiving walls being replaced."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
m=json.loads(manifest.read_text());raw=Path(m['layout']).read_bytes();layout=json.loads(raw)
assert hashlib.sha256(raw).hexdigest()==m['layoutSha256']
boxes=['add-east1f-hotel-vestibule-back','add-east1f-hotel-vestibule-glass',
       *['add-east1f-hotel-frame-'+x for x in ['55.7','58','60.3']],
       'add-east1f-lift-portal','add-east1f-lift-doors','add-east1f-lift-sign']
panels=['gate-east-access-lobby-east-wall','gate-east-access-lower-north-wall']
boxes=[p['id']for p in layout['boxes']if p['id']in boxes]
panels=[p['id']for p in layout['panels']if p['id']in panels]
assert len(boxes)==8 and len(panels)==2
ids=boxes+panels
assert set(boxes)=={p['id']for p in layout['boxes']if p['id']in ids}
assert set(panels)=={p['id']for p in layout['panels']if p['id']in ids}
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
rows=[]
for o in bpy.context.scene.objects:
 id=o.get('kyoto_surface',o.name)
 if o.type!='MESH' or id not in ids:continue
 vs=[o.matrix_world@v.co for v in o.data.vertices]
 rows.append(dict(name=id,vertices=[[v.x,v.z,-v.y]for v in vs],materials=[m.name for m in o.data.materials],faces=[dict(vertices=list(p.vertices),material=p.material_index)for p in o.data.polygons]))
assert {r['name']for r in rows}==set(ids)
spec=dict(componentPrefix='granvia-entrance-',parentLayoutSha256=m['layoutSha256'],retiredIds=ids,retiredBoxIds=boxes,retiredSourceOnlyIds=[],retiredLights=[],retiredRouteIds=[],retiredLabelIds=[],wallCuts={
 'east-passage-north-wall':[[56.5,60.2],[-.05,2.7],[.89,1.19]],
 'east-passage-south-wall':[[56.5,60.2],[-.05,2.7],[-2.17,-1.87]]})
out.mkdir(parents=True,exist_ok=True)
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n')
(out/'retired-source.json').write_text(json.dumps(rows)+'\n')
(out/'parent-assets.json').write_text(json.dumps(m,indent=2)+'\n')
print('GRANVIA_ENTRANCE_SCOPE',len(ids),'retired objects; two wall openings',flush=True)
