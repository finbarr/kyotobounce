"""Pin the obsolete western stair room and the wall closing Porta West."""
import bpy,json,sys,hashlib
from pathlib import Path
manifest_path,out=map(Path,sys.argv[sys.argv.index('--')+1:]);m=json.loads(manifest_path.read_text())
assert Path('.local').resolve() in out.resolve().parents
raw=Path(m['layout']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['layoutSha256'];layout=json.loads(raw)
def retired(id):
 return id=='porta-plaza-west-wall' or id.startswith(('add-porta-north-entry-','add-porta-basement-','add-porta-stair-well-')) or id in ('add-porta-lower-landing','add-porta-bottom-sign')
groups={k:[p['id']for p in layout[k]if retired(p['id'])]for k in ('boxes','panels','authoredLights')}
assert groups['boxes'] and 'porta-plaza-west-wall'in groups['panels'];ids=groups['boxes']+groups['panels']
assert not groups['authoredLights'];assert all(p.get('yaw',0)==0 for p in layout['boxes']if p['id']in ids)
spec=dict(parentLayoutSha256=m['layoutSha256'],retiredIds=ids,retiredBoxIds=groups['boxes'],retiredLights=[],retiredRouteIds=[p['id']for p in layout['routes']if p['id']=='add-porta-down'],retiredLabelIds=[p['id']for p in layout['concourseDetails']['labels']if retired(p['id'])],floor=-6.2,ceiling=-2.8,stair=dict(x=-34,width=5.8,start=20,going=7.6/23,steps=35,firstSteps=18,landing=1.8,top=0,bottom=-6.2))
bpy.ops.wm.open_mainfile(filepath=str(Path(m['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
rows=[]
for o in bpy.context.scene.objects:
 id=o.get('kyoto_surface',o.name)
 if o.type!='MESH' or not retired(id):continue
 mesh=o.data;vs=[o.matrix_world@v.co for v in mesh.vertices]
 rows.append(dict(name=id,vertices=[[v.x,v.z,-v.y]for v in vs],materials=[m.name for m in mesh.materials],faces=[dict(vertices=list(p.vertices),material=p.material_index)for p in mesh.polygons]))
source_ids={r['name']for r in rows};assert set(ids)<=source_ids
spec['retiredSourceOnlyIds']=sorted(source_ids-set(ids));spec['retiredIds']+=spec['retiredSourceOnlyIds']
out.mkdir(parents=True,exist_ok=True);(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(out/'retired-source.json').write_text(json.dumps(rows)+'\n')
print('PORTA_WEST_SCOPE',json.dumps({k:len(v)for k,v in groups.items()}),flush=True)
