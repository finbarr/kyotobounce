"""Open the shared landing slabs to the actual straight escalator tread paths.

The original pit holes have a narrow transverse rim over the arriving incline.
Subtract closed prisms and retain closed slabs, with matching art and physics.
"""
import bpy,json,sys,math,hashlib
from pathlib import Path
from mathutils import Vector

path=Path(sys.argv[sys.argv.index('--')+1])
assert Path('.local').resolve() in path.resolve().parents
raw=path.read_bytes();layout=json.loads(raw)
assert 'westBankTransferCuts' not in layout['architecture']
bpy.ops.wm.read_factory_settings(use_empty=True)
floor_ids=['north-escalator-upper-landing','north-circulation-landing-08','north-circulation-landing-12','north-circulation-landing-14']
changes=[]
for floor_id in floor_ids:
 p=next(p for p in layout['panels'] if p['id']==floor_id)
 assert not p.get('finishes'),'Preserve grouped floor materials explicitly'
 top=max(v['y']for v in p['vertices']);bottom=min(v['y']for v in p['vertices'])
 lanes=[e for e in layout['escalators'] if e['id'].startswith('north-') and abs(e['lowerCenter']['y']+e['height']-top)<.01]
 assert len(lanes)==2,(floor_id,len(lanes))
 mesh=bpy.data.meshes.new(floor_id)
 mesh.from_pydata([(v['x'],v['z'],v['y'])for v in p['vertices']],[],[p['triangles'][i:i+3][::-1]for i in range(0,len(p['triangles']),3)])
 mesh.update();obj=bpy.data.objects.new(floor_id,mesh);bpy.context.collection.objects.link(obj)
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 # The original panels repeat vertices per face. Weld before exact booleans.
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 for e in lanes:
  start=e['run']-3;end=e['run']+e['flatLength']-.04
  mid=(start+end)/2;u=e['uphill'];origin=e['lowerCenter']
  bpy.ops.mesh.primitive_cube_add(size=1,location=(origin['x']+u['x']*mid,origin['z']+u['z']*mid,(top+bottom)/2))
  cutter=bpy.context.object;cutter.name=e['id']+' transfer opening'
  cutter.rotation_euler.z=math.atan2(u['z'],u['x']);cutter.scale=(end-start,e['width']+.1,top-bottom+1)
  bpy.context.view_layer.objects.active=obj
  modifier=obj.modifiers.new('Tread opening','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
  bpy.ops.object.modifier_apply(modifier=modifier.name);bpy.data.objects.remove(cutter,do_unlink=True)
 obj.data.calc_loop_triangles()
 vertices=[{'x':v.co.x,'y':v.co.z,'z':v.co.y}for v in obj.data.vertices]
 triangles=[i for tri in obj.data.loop_triangles for i in reversed(tri.vertices)]
 # Closed, oppositely paired edges; reject a repair that merely removes faces.
 from collections import Counter
 edges=Counter()
 volume=0
 for i in range(0,len(triangles),3):
  ids=triangles[i:i+3];a,b,c=[Vector(tuple(vertices[j][k]for k in ('x','y','z')))for j in ids];volume+=a.dot(b.cross(c))/6
  for a,b in zip(ids,ids[1:]+ids[:1]):edges[(a,b)]+=1
 assert all(n==edges[(b,a)]for (a,b),n in edges.items()),('Open transfer slab',floor_id)
 assert volume>.1,('Empty or inverted transfer slab',floor_id)
 changes.append({'id':floor_id,'lanes':[e['id']for e in lanes],'oldTriangles':len(p['triangles'])//3,'triangles':len(triangles)//3,'closedVolumeM3':abs(volume)})
 p['vertices']=vertices;p['triangles']=triangles
 for key in ('normals','uv'):p.pop(key,None)
 bpy.data.objects.remove(obj,do_unlink=True)
layout['architecture']['westBankTransferCuts']={'inputLayoutSha256':hashlib.sha256(raw).hexdigest(),'changes':changes,'scope':'Open arriving bank pits through the transverse slab rim; width follows the existing tread plus 0.10 m total clearance. Slab shape elsewhere is retained.'}
path.write_text(json.dumps(layout,separators=(',',':'))+'\n')
print('WEST_BANK_TRANSFERS_READY',json.dumps(changes),flush=True)
