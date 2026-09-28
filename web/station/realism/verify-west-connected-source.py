"""Compare saved western authoring geometry with its native candidate records."""
import bpy,json,hashlib,math,sys
from pathlib import Path
from collections import Counter
source,layout_path,report_path=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
raw=layout_path.read_bytes();layout=json.loads(raw)
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
changed=layout['architecture']['westPlazaRegistration']['changed'];selected={kind:set(ids)for kind,ids in changed.items()};selected['panels'].add('muromachi-square')
bindings=Counter(o['kyoto_seed']for o in scene.objects if o.type=='MESH'and o.get('kyoto_seed')and not o.get('kyoto_dynamic'))
assert all(n==1 for n in bindings.values()),('Repeated native binding',[(k,v)for k,v in bindings.items()if v>1][:10])
checked=Counter();maximum=0
for obj in scene.objects:
 tag=obj.get('kyoto_seed');surface=obj.get('kyoto_surface')
 if not tag:continue
 kind,index=tag.split('/')
 if kind not in ('panels','boxes')or surface not in selected[kind]:continue
 record=layout[kind][int(index)];assert record['id']==surface
 actual=[tuple(obj.matrix_world@v.co)for v in obj.data.vertices]
 if kind=='panels':
  expected=[(v['x'],v['z'],v['y'])for v in record['vertices']]
  assert len(actual)==len(expected)
  maximum=max(maximum,max(math.dist(a,b)for a,b in zip(actual,expected)))
  assert [i for face in obj.data.polygons for i in reversed(face.vertices)]==record['triangles']
 else:
  angle=math.radians(record.get('yaw',0));c,s=math.cos(angle),math.sin(angle);p=record['center'];size=record['size'];expected=[]
  for x in (-size['x']/2,size['x']/2):
   for y in (-size['y']/2,size['y']/2):
    for z in (-size['z']/2,size['z']/2):expected.append((p['x']+c*x+s*z,p['z']-s*x+c*z,p['y']+y))
  assert len(actual)==len(expected)==8
  maximum=max(maximum,max(min(math.dist(a,b)for b in expected)for a in actual))
 checked[kind]+=1
assert checked['panels']==len(selected['panels'])
assert checked['boxes']==len(selected['boxes'])
assert maximum<.00005,maximum
report={'layoutSha256':hashlib.sha256(raw).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'checked':dict(checked),'maximumPositionErrorM':maximum,'panelTrianglesMatch':True,'uniqueNativeBindings':len(bindings),'scope':'Relocated panels and boxes; native route tests separately check stair traversal. This does not prove all external interfaces.'}
report_path.write_text(json.dumps(report,indent=2)+'\n');print('WEST_SOURCE_GEOMETRY_VERIFIED',report)
