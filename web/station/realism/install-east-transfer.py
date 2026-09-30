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
allowed_modified={'central-lift-':['concourse'],'granvia-entrance-':['concourse','east-passage-north-wall','east-passage-south-wall'],'western-platforms-':['municipal-station-wing-west-Untitled.199','municipal-station-wing-west-Untitled.201','municipal-station-wing-west-Untitled.203','west-south-west-return-0']}
if report.get('componentPrefix')in ('isetan-ground-','isetan-second-','isetan-third-','isetan-fourth-','isetan-fifth-','isetan-stair-','isetan-lift-'):
 spec=json.loads((component/'spec.json').read_text());assert modified_ids==list(spec['cuts'])
 assert all(id=='concourse' or id.startswith(('west-north-','west-south-')) or report['componentPrefix'] in ('isetan-second-','isetan-third-','isetan-fourth-','isetan-fifth-','isetan-stair-','isetan-lift-') and id.startswith('isetan-ground-') and next(p for p in old['panels']if p['id']==id)['role']=='foundation' or report['componentPrefix']in ('isetan-fourth-','isetan-fifth-') and id.startswith('north-side-') and next(p for p in old['panels']if p['id']==id)['role']=='parapet' for id in modified_ids)
elif report.get('componentPrefix')=='granvia-parking-':
 spec=json.loads((component/'spec.json').read_text());assert modified_ids==list(spec['cuts'])
 assert modified_ids[0]=='concourse' and all(id.startswith('east-frontage-') for id in modified_ids[1:])
else:assert not modified_ids or modified_ids==allowed_modified.get(report.get('componentPrefix'))
replaced=[p for p in new['panels']if p['id']==modified_paving or p['id']in modified_ids];replaced_by_id={p['id']:p for p in replaced}
retained=[replaced_by_id.get(p['id'],p) for p in old['panels'] if p['id'] not in report['geometry']['retiredIds']];assert new['panels'][:len(retained)]==retained
retired_boxes=report['geometry'].get('retiredBoxIds',[]);assert not retired_boxes or report.get('componentPrefix')in ('porta-west-','isetan-ground-','isetan-second-','granvia-entrance-')
assert new['boxes']==[p for p in old['boxes']if p['id']not in retired_boxes]
modified_flights=report['geometry'].get('modifiedFlightIds',[])
assert not modified_flights or report.get('componentPrefix')in ('isetan-ground-','isetan-fourth-')
assert new['flights']==[dict(f,foundationDepth=0)if f['id']in modified_flights else f for f in old['flights']]
assert old['beams']==new['beams']
lanes=json.loads((component/'motion.json').read_text())['escalators'] if report.get('componentPrefix')in ('granvia-entrance-','isetan-fifth-') else []
assert new['escalators']==old['escalators']+lanes
assert not lanes or len(lanes)==2
retired_lift_ids=report['geometry'].get('retiredLiftIds',[])
assert not retired_lift_ids or report.get('componentPrefix')=='hachijo-crossing-' and retired_lift_ids==['subway-hachijo-east-lift']
old_lifts=[l for l in old.get('lifts',[])if l['id']not in retired_lift_ids];lifts=new.get('lifts',[]);assert lifts[:len(old_lifts)]==old_lifts
added_lifts=lifts[len(old_lifts):]
assert not {p['id']for l in added_lifts for p in l['parts']} & {p['id']for p in new['panels']},'Static and moving source object names must be distinct'
assert not added_lifts or report.get('componentPrefix')in ('subway-lift-','exit-five-','hachijo-lift-','hachijo-crossing-','subway-south-lift-','porta-west-lift-','central-lift-','hachijo-terrace-','granvia-entrance-','isetan-lift-','granvia-parking-')
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
max_preview_normal_angle=0
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
motion_manifest=[]
if lanes:
 sys.path.insert(0,str(Path.cwd()/'tools'));from blender_escalators import build as build_escalators
 cube=[(x,y,z)for z in (-.5,.5)for y in (-.5,.5)for x in (-.5,.5)]
 cube_faces=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
 physical={}
 for key,name in [('escalator','north-escalator-lower-1 step 0'),('steel','north-escalator-lower-1 nosing 0'),('escalator-casing','north-escalator-lower-1 casing 0')]:
  physical[key]=bpy.data.objects[name].data.materials[0]
 physical['escalator-edge']=physical['steel']
 prior=set(bpy.data.objects);motion_manifest=build_escalators(lanes,{'Player-only walking surfaces':collection},physical,cube,cube_faces)
 for o in set(bpy.data.objects)-prior:
  o['kyoto_dynamic']=True
  if o.get('step_count'):o['kyoto_lane']=o.get('surface_id')
  if o.get('role')in ('walking-proxy','escalator-casing'):
   o.hide_render=True;o['kyoto_motion_aux']=o.get('surface_id')
 # Public casings are already included in the matching static component.
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
  if p.get('normals'):
   expected=Vector(tuple(p['normals'][l.vertex_index][k]for k in ('x','z','y')))
   # The exporter restores these full-precision vectors. Blender's encoded
   # viewport normals can quantize a thin cut face by a small angle.
   exact=mesh.attributes['kyoto_authored_normal'].data[l.index].vector
   assert max(abs(a-b)for a,b in zip(exact,expected))<1e-6,('Saved export normal differs',p['id'],l.index)
   preview=mesh.corner_normals[l.index].vector
   angle=math.degrees(math.atan2(preview.cross(expected).length,preview.dot(expected)))
   max_preview_normal_angle=max(max_preview_normal_angle,angle)
   if report['componentPrefix']in ('isetan-fourth-','isetan-fifth-'):assert angle<.1,('Saved preview normal differs',p['id'],l.index,angle)
   else:assert max(abs(a-b)for a,b in zip(preview,expected))<.001,('Saved corner normal differs',p['id'],l.index)
for p in retained:
 o=objects.get(p['id']);assert o and o['kyoto_seed']=='panels/'+str(by_id[p['id']])
for part,position,size in lift_objects:
 o=bpy.data.objects[part['id']];assert o['kyoto_dynamic'] and o['kyoto_lift_part']==part['id'];assert (o.location-Vector(position)).length<2e-5;assert (o.dimensions-Vector(size)).length<2e-5;assert o.data.materials[0].name==materials[part['appearance']]['label'];assert signature(o)==o['kyoto_geometry_signature']
for r in lights:
 o=bpy.data.objects[r['id']];assert abs(o.data.energy-r['intensity'])<1e-6;assert o['kyoto_range_m']==r['range']
for lane in lanes:
 root=bpy.data.objects[lane['id']+' operating chain'];assert root['step_count']==lane['stepCount'] and root['kyoto_lane']==lane['id']
 for i in range(lane['stepCount']):
  step=bpy.data.objects[lane['id']+' step '+str(i)];strip=step.animation_data.nla_tracks[0].strips[0]
  assert strip.use_reverse==(lane['speed']<0) and abs(strip.scale-bpy.context.scene.render.fps/abs(lane['speed']))<.001
  action=strip.action;bag=action.layers[0].strips[0].channelbag(strip.action_slot)
  assert len(bag.fcurves)==3 and all(len(c.keyframe_points)==len(lane['path'])for c in bag.fcurves)
proof={'pass':True,'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(new_raw),'addedPanels':len(added),'retiredObjects':removed,'savedGeometryUVsNormalsMatch':True,'retainedBindingsMatch':True}
proof['addedEscalators']=len(lanes);proof['animation']=motion_manifest
proof['modifiedPanels']=modified_ids;proof['modifiedPaving']=modified_paving;proof['addedLifts']=len(added_lifts);proof['liftParts']=len(lift_objects);proof['retiredLiftParts']=retired_lift_parts
proof['savedExportNormalsExact']=True;proof['maximumPreviewNormalAngleDegrees']=max_preview_normal_angle
(out/'installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('EAST_TRANSFER_SOURCE_READY',json.dumps(proof),flush=True)
