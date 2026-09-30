"""Install the eastern underpass and transfer connection in the existing editable station."""
import bpy,json,sys,hashlib,math
from pathlib import Path
import numpy as np
from mathutils import Vector
base_path,candidate_path,component,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
assert not (out/'KyotoAtrium.blend').exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
base=json.loads(base_path.read_text());candidate=json.loads(candidate_path.read_text());report=json.loads((component/'report.json').read_text())
old_raw=Path(base['layout']).read_bytes();new_raw=Path(candidate['layout']).read_bytes();old=json.loads(old_raw);new=json.loads(new_raw)
assert sha(old_raw)==base['layoutSha256'] and sha(new_raw)==candidate['layoutSha256']
modified_paving=report['geometry'].get('modifiedPaving');assert not modified_paving or modified_paving=='municipal-plaza-642152272'
modified_ids=report['geometry'].get('modifiedPanelIds',[])
allowed_modified={'central-lift-':['concourse'],'western-platforms-':['municipal-station-wing-west-Untitled.199','municipal-station-wing-west-Untitled.201','municipal-station-wing-west-Untitled.203','west-south-west-return-0']}
assert not modified_ids or modified_ids==allowed_modified.get(report.get('componentPrefix'))
replaced=[p for p in new['panels']if p['id']==modified_paving or p['id']in modified_ids];replaced_by_id={p['id']:p for p in replaced}
retained=[replaced_by_id.get(p['id'],p) for p in old['panels'] if p['id'] not in report['geometry']['retiredIds']];assert new['panels'][:len(retained)]==retained
retired_boxes=report['geometry'].get('retiredBoxIds',[]);assert not retired_boxes or report.get('componentPrefix')=='porta-west-'
assert new['boxes']==[p for p in old['boxes']if p['id']not in retired_boxes]
for key in ('beams','flights','escalators'):assert old[key]==new[key]
retired_lift_ids=report['geometry'].get('retiredLiftIds',[])
assert not retired_lift_ids or report.get('componentPrefix')=='hachijo-crossing-' and retired_lift_ids==['subway-hachijo-east-lift']
old_lifts=[l for l in old.get('lifts',[])if l['id']not in retired_lift_ids];lifts=new.get('lifts',[]);assert lifts[:len(old_lifts)]==old_lifts
added_lifts=lifts[len(old_lifts):]
assert not added_lifts or report.get('componentPrefix')in ('subway-lift-','exit-five-','hachijo-lift-','hachijo-crossing-','subway-south-lift-','porta-west-lift-','central-lift-','hachijo-terrace-')
retained_lights=[r for r in old['authoredLights']if r['id'] not in report['geometry']['retiredLights']]
assert new['authoredLights'][:len(retained_lights)]==retained_lights
prefix=report.get('componentPrefix','east-transfer-')
added=new['panels'][len(retained):];assert len(added)==report['geometry']['panels'] and all(p['id'].startswith(prefix)for p in added)
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==old_raw.decode()
by_id={p['id']:i for i,p in enumerate(new['panels'])}
box_ids={p['id']:i for i,p in enumerate(new['boxes'])}
assert not (set(by_id) & {r['id'] for r in new['authoredLights'] if r['id'].startswith(prefix)})
removed=[];retired_lift_parts=[]
for o in list(bpy.data.objects):
 if o.get('kyoto_lift')in retired_lift_ids:retired_lift_parts.append(o['kyoto_lift_part']);bpy.data.objects.remove(o,do_unlink=True);continue
 if o.name in report['geometry']['retiredLights']:bpy.data.objects.remove(o,do_unlink=True);continue
 if o.get('kyoto_surface',o.name) in report['geometry']['retiredIds']:removed.append(o.get('kyoto_surface',o.name));bpy.data.objects.remove(o,do_unlink=True);continue
 key=o.get('kyoto_seed','')
 if key.startswith('boxes/'):
  id=old['boxes'][int(key.split('/')[1])]['id'];assert id in box_ids;o['kyoto_seed']='boxes/'+str(box_ids[id])
 if key.startswith('panels/'):
  id=old['panels'][int(key.split('/')[1])]['id'];assert id in by_id;o['kyoto_seed']='panels/'+str(by_id[id])
assert set(removed)==set(report['geometry']['retiredIds'])
assert set(retired_lift_parts)=={p['id']for l in old.get('lifts',[])if l['id']in retired_lift_ids for p in l['parts']}
materials={m['id']:m for m in new['authoredMaterials']};created={}
def material(key):
 if key in created:return created[key]
 if key not in materials:
  existing=bpy.data.materials.get(key);assert existing,key;created[key]=existing;return existing
 r=materials[key]
 existing=bpy.data.materials.get(r['label'])
 if existing:created[key]=existing;return existing
 m=bpy.data.materials.new(r['label']);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=tuple(r['linearColor'][k]for k in 'rgba');bs.inputs['Metallic'].default_value=r['metallic'];bs.inputs['Roughness'].default_value=r['roughness'];bs.inputs['Alpha'].default_value=r['linearColor']['a']
 if r['linearColor']['a']<1:m.surface_render_method='DITHERED'
 if r.get('emissionColor'):
  bs.inputs['Emission Color'].default_value=tuple(r['emissionColor'][k]for k in 'rgb')+(1,);bs.inputs['Emission Strength'].default_value=r.get('emission',1)
 if r.get('albedo'):
  image=bpy.data.images.load(str((component/report['texture']['file']).resolve()),check_existing=True);image.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='EXTEND';m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 created[key]=m;return m
collection=bpy.data.collections.new(report.get('sourceCollection','East underground railway passage and transfer'));bpy.context.scene.collection.children.link(collection)
def signature(o):
 vertices=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',vertices);loops=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',loops)
 return sha(vertices.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
for p in replaced:
 o=next(o for o in bpy.data.objects if o.get('kyoto_surface',o.name)==p['id']);bpy.data.objects.remove(o,do_unlink=True)
for p in replaced+added:
 index=by_id[p['id']]
 mesh=bpy.data.meshes.new(p['id']);mesh.from_pydata([(v['x'],v['z'],v['y'])for v in p['vertices']],[],[p['triangles'][i:i+3][::-1]for i in range(0,len(p['triangles']),3)]);mesh.update();o=bpy.data.objects.new(p['id'],mesh);collection.objects.link(o);mesh.materials.append(material(p['appearance']))
 if p.get('uv'):
  uv=mesh.uv_layers.new(name='UVMap')
  for loop in mesh.loops:uv.data[loop.index].uv=tuple(p['uv'][loop.vertex_index][k]for k in ('x','y'))
 if p.get('normals'):
  normals=[tuple(p['normals'][l.vertex_index][k]for k in ('x','z','y'))for l in mesh.loops]
  for polygon in mesh.polygons:polygon.use_smooth=True
  mesh.normals_split_custom_set(normals);exact=mesh.attributes.new('kyoto_authored_normal','FLOAT_VECTOR','CORNER')
  for i,n in enumerate(normals):exact.data[i].vector=n
 o['kyoto_surface']=p['id'];o['kyoto_seed']='panels/'+str(index);o['kyoto_physical']=p['material'];o['kyoto_role']=p['role'];o['kyoto_collision']=p.get('collision',True);o['kyoto_geometry_signature']=signature(o)
# Lift cars are editable boxes, excluded from static exports. The embedded
# native seed holds their movement definition; source geometry shows floor 0.
lift_objects=[]
for lift in added_lifts:
 for part in lift['parts']:
  center=part['center'];origin=lift['origin'];size=part['size'];stops=lift.get('stops');floor=(len(stops)-1 if stops else 1)if part['motion']=='upper'else part.get('floor',0)if part['motion']=='landing'else 0
  height=(stops[floor]['height']if stops else floor*lift['height'])if part['motion']!='car'else 0
  a=math.radians(lift.get('yaw',0));x=center['x']+part['doorSide']*lift['doorTravel']*(1 if floor==0 else 0);z=center['z']
  position=(origin['x']+math.cos(a)*x+math.sin(a)*z,origin['z']-math.sin(a)*x+math.cos(a)*z,origin['y']+center['y']+height)
  bpy.ops.mesh.primitive_cube_add(size=1,location=position);o=bpy.context.object;o.name=part['id'];o.dimensions=(size['x'],size['z'],size['y']);o.rotation_euler.z=-a
  bpy.context.view_layer.update()
  for c in list(o.users_collection):c.objects.unlink(o)
  collection.objects.link(o);o.data.materials.append(material(part['appearance']));o['kyoto_dynamic']=True;o['kyoto_lift']=lift['id'];o['kyoto_lift_part']=part['id'];o['kyoto_physical']=part['material'];o['kyoto_geometry_signature']=signature(o)
  lift_objects.append((part,position,tuple(o.dimensions)))
lights=new['authoredLights'][len(retained_lights):]
assert len(lights)==len(json.loads((component/'native-panels.json').read_text())['authoredLights'])
for r in lights:
 lamp=bpy.data.lights.new(r['id'],'SPOT');lamp.color=tuple(r['linearColor'][k]for k in 'rgb');lamp.energy=r['intensity'];lamp.spot_size=math.radians(r['spotAngle']);lamp.spot_blend=1-r['innerSpotAngle']/r['spotAngle'];o=bpy.data.objects.new(r['id'],lamp);collection.objects.link(o);p=r['position'];o.location=(p['x'],p['z'],p['y']);o['kyoto_fixture']=True;o['kyoto_unity_intensity']=r['intensity'];o['kyoto_range_m']=r['range']
out.mkdir(parents=True,exist_ok=True);(out/'station-layout.json').write_bytes(new_raw)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
textures=(out/'textures');texture_source=(Path(base['sourceScene']).parent/'textures').resolve()
if textures.is_symlink():assert textures.resolve()==texture_source
else:textures.symlink_to(texture_source,target_is_directory=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==new_raw.decode();objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects}
assert not any(id in objects for id in report['geometry']['retiredIds'])
for o in bpy.data.objects:
 key=o.get('kyoto_seed','')
 if key.startswith('boxes/'):
  assert new['boxes'][int(key.split('/')[1])]['id']==o.get('kyoto_surface',o.name)
for p in replaced+added:
 o=objects[p['id']];mesh=o.data;assert o['kyoto_seed']=='panels/'+str(by_id[p['id']]);assert signature(o)==o['kyoto_geometry_signature'];assert mesh.materials[0].name==materials.get(p['appearance'],{'label':p['appearance']})['label'];assert [i for f in mesh.polygons for i in reversed(f.vertices)]==p['triangles'];assert max((v.co-Vector((q['x'],q['z'],q['y']))).length for v,q in zip(mesh.vertices,p['vertices']))<2e-5
 for l in mesh.loops:
  if p.get('uv'):assert max(abs(mesh.uv_layers.active.data[l.index].uv[i]-p['uv'][l.vertex_index][k])for i,k in enumerate(('x','y')))<1e-5
  if p.get('normals'):assert max(abs(mesh.corner_normals[l.index].vector[i]-p['normals'][l.vertex_index][k])for i,k in enumerate(('x','z','y')))<.001
for p in retained:
 o=objects.get(p['id']);assert o and o['kyoto_seed']=='panels/'+str(by_id[p['id']])
for part,position,size in lift_objects:
 o=bpy.data.objects[part['id']];assert o['kyoto_dynamic'] and o['kyoto_lift_part']==part['id'];assert (o.location-Vector(position)).length<2e-5;assert (o.dimensions-Vector(size)).length<2e-5;assert o.data.materials[0].name==materials[part['appearance']]['label'];assert signature(o)==o['kyoto_geometry_signature']
for r in lights:
 o=bpy.data.objects[r['id']];assert abs(o.data.energy-r['intensity'])<1e-6;assert o['kyoto_range_m']==r['range']
proof={'pass':True,'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(new_raw),'addedPanels':len(added),'retiredObjects':removed,'savedGeometryUVsNormalsMatch':True,'retainedBindingsMatch':True}
proof['modifiedPanels']=modified_ids;proof['modifiedPaving']=modified_paving;proof['addedLifts']=len(added_lifts);proof['liftParts']=len(lift_objects);proof['retiredLiftParts']=retired_lift_parts
(out/'installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('EAST_TRANSFER_SOURCE_READY',json.dumps(proof),flush=True)
