"""Install the coordinated western candidate into the current editable scene.
Unrelated objects keep their geometry. Selected primitives are rebuilt from the
same records used by native physics; the existing materials are retained.
"""
import bpy,json,sys,math,hashlib,struct,ast
from pathlib import Path
from mathutils import Vector
import numpy as np
root=Path.cwd();args=sys.argv[sys.argv.index('--')+1:];manifest_path,layout_path,out=map(Path,args)
assert Path('.local').resolve() in out.resolve().parents
sha=lambda b:hashlib.sha256(b).hexdigest()
if (out/'KyotoAtrium.blend').exists():
 receipt_path=out/'geometry-check.json'
 assert receipt_path.exists(),'Existing candidate needs a verified source receipt before replacement'
 receipt=json.loads(receipt_path.read_text())
 assert sha((out/'KyotoAtrium.blend').read_bytes())==receipt['sourceSha256'],'Preserve edited candidate source'
 assert sha((out/'station-layout.json').read_bytes())==receipt['layoutSha256'],'Preserve edited candidate layout'
config=json.loads(manifest_path.read_text());parent_bytes=Path(config['layout']).read_bytes();parent=json.loads(parent_bytes);target_bytes=layout_path.read_bytes();target=json.loads(target_bytes)
assert sha(parent_bytes)==target['architecture']['westPlazaRegistration']['parentLayoutSha256']
changed=target['architecture']['westPlazaRegistration']['changed'];selected={s for ids in changed.values()for s in ids}|{'muromachi-square'}
integration=target['architecture'].get('westUpperConnectionIntegration',{})
selected.update(s for ids in integration.get('retiredByKind',{}).values()for s in ids)
retired_prefixes=tuple(integration.get('retiredPrefixes',[]))
bpy.ops.wm.open_mainfile(filepath=str(Path(config['sourceScene']).resolve()));scene=bpy.context.scene
scene.frame_set(1);bpy.context.view_layer.update()
def B(p):return Vector((p['x'],p['z'],p['y']))
def signature(o):
 v=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',v);t=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',t)
 return sha(v.tobytes()+t.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
indexes={k:{}for k in ('panels','boxes','beams','flights')}
for kind in indexes:
 for i,p in enumerate(target[kind]):indexes[kind].setdefault(p['id'],[]).append(i)
represented=set();removed=[]
old_materials={o.name:list(o.data.materials)for o in bpy.data.objects if o.type=='MESH'}
# Retire the selected authoring objects and their auxiliaries/animation, retaining
# all other meshes and original art. Rebind surviving seed indices to the export.
visual_only=[]
for o in list(scene.objects):
 name=o.get('kyoto_surface',o.name);owner=o.get('kyoto_owner','');motion=o.get('kyoto_motion_aux','')
 selected_name=any(o.name.startswith(e+' ')for e in changed['escalators'])
 if name in selected or owner in selected or motion in selected or selected_name or o.name=='k028-shukobu' or name.startswith(retired_prefixes) or o.name.startswith(retired_prefixes):removed.append(o);continue
 if o.type!='MESH' or o.get('kyoto_dynamic')or o.get('kyoto_authoring_helper'):continue
 if owner:
  # Edited stairs were baked to panels, including their walking/foundation
  # auxiliaries. Give those existing meshes their own compact panel binding.
  if name not in indexes['panels']:continue
  del o['kyoto_owner']
 tag=o.get('kyoto_seed','');kind=tag.split('/')[0]if tag else 'panels'
 possible=indexes.get(kind,{}).get(name,[])
 if not possible:kind='panels';possible=indexes[kind].get(name,[])
 if not possible:
  matches=[(k,ii)for k,by_id in indexes.items()for ii in by_id.get(name,[])]
  if len(matches)==1:kind,index=matches[0];possible=[index]
 if not possible and o.get('kyoto_collision') is False:
  # Render-only fixtures intentionally have no compact native record. Keep
  # their authored mesh; an old seed index must never bind to another surface.
  if 'kyoto_seed'in o:del o['kyoto_seed']
  visual_only.append(o.name);continue
 if len(possible)>1:
  assert kind=='beams',(name,possible)
  # Earlier ID-only reindexing could bind every repeated beam ID to its first
  # record. The authored mesh position, not that stale index, identifies it.
  center=o.matrix_world@(sum((Vector(v)for v in o.bound_box),Vector())/8)
  possible=[i for i in possible if (center-(B(target[kind][i]['a'])+B(target[kind][i]['b']))/2).length<.001]
  if len(possible)>1:
   ends=[o.matrix_world@Vector((0,0,z))for z in (min(v[2]for v in o.bound_box),max(v[2]for v in o.bound_box))]
   def fits(i):
    a,b=B(target[kind][i]['a']),B(target[kind][i]['b'])
    return min(max((ends[0]-a).length,(ends[1]-b).length),max((ends[0]-b).length,(ends[1]-a).length))<.001
   possible=[i for i in possible if fits(i)]
 assert len(possible)==1,(o.name,kind,possible)
 index=possible[0];assert (kind,index)not in represented,('Duplicate source binding',o.name,kind,index)
 o['kyoto_seed']=kind+'/'+str(index);o['kyoto_geometry_signature']=signature(o);represented.add((kind,index))
bpy.data.batch_remove(ids=tuple(removed));print('RETIRED',len(removed),flush=True)
collection=bpy.data.collections.new('Western plaza and stair registration');scene.collection.children.link(collection)
records={m['id']:m for m in target['authoredMaterials']}
def material(appearance,physical='stone'):
 r=records.get(appearance);assert r,('Missing material',appearance)
 m=bpy.data.materials.get(r['label'])
 if m:return m
 assert not any(r.get(k)for k in ('albedo','normal','mask')),('Missing textured material',r['label'])
 m=bpy.data.materials.new(r['label']);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');color=r['linearColor'];bs.inputs['Base Color'].default_value=tuple(color[k]for k in 'rgba');bs.inputs['Metallic'].default_value=r.get('metallic',0);bs.inputs['Roughness'].default_value=r.get('roughness',.7);bs.inputs['Alpha'].default_value=r.get('alpha',1)
 emission=r.get('emissionLinearColor')or r.get('emissionColor')
 if emission:bs.inputs['Emission Color'].default_value=tuple(emission.get(k,1 if k=='a'else 0)for k in 'rgba');bs.inputs['Emission Strength'].default_value=r.get('emission',1)
 return m
def mesh_object(name,vertices,faces,unused=None,mat=None):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);collection.objects.link(o)
 if mat:mesh.materials.append(mat)
 return o
# Use the existing stair constructor's geometry and metric UV algorithm without
# running the historical whole-station generator over the authored scene.
tree=ast.parse((root/'tools/build_station_phase2.py').read_text());function=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='stair')
space={'bpy':bpy,'Vector':Vector,'math':math,'convert':lambda p:(p.x,p.z,p.y),'mesh_object':mesh_object,'mats':{}}
exec(compile(ast.Module(body=[function],type_ignores=[]),'tools/build_station_phase2.py:stair','exec'),space)
cube=[(x,y,z)for z in (-.5,.5)for y in (-.5,.5)for x in (-.5,.5)]
cube_faces=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
# Preserve the normals of appended components that were not yet in the Blender
# base scene. All their original vertices and index order are retained.
component_normals={}
for part in config['sourceComponents']:
 d=Path(part['directory']);report=json.loads((d/'report.json').read_text());data=(d/report['outputs']['glbFile']).read_bytes();n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binary=data[28+n:]
 native=json.loads((d/'native-panels.json').read_text());offsets=[0]*len(j['materials'])
 for p in native['panels']:
  mi=p['browserMaterial'];primitive=j['meshes'][mi]['primitives'][0];a=j['accessors'][primitive['attributes']['NORMAL']];v=j['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0)+offsets[mi]*12
  normals=[struct.unpack_from('<fff',binary,start+i*12)for i in range(len(p['vertices']))];offsets[mi]+=len(p['vertices'])
  component_normals[p['id']]=[dict(x=x,y=y,z=-z)for x,y,z in normals]
unaccounted=[{'kind':kind,'index':i,'record':p}for kind in indexes for i,p in enumerate(target[kind])if (kind,i)not in represented and p['id']not in selected and p['id']not in component_normals and not(kind=='flights'and p['role']=='escalator')]
if unaccounted:
 (out.parent/'unaccounted-source.json').write_text(json.dumps(unaccounted,indent=2))
 raise AssertionError(('Unaccounted source records',len(unaccounted),[(r['kind'],r['record']['id'])for r in unaccounted[:10]]))
created=[]
for kind in ('panels','boxes','beams','flights'):
 for index,p in enumerate(target[kind]):
  if (kind,index)in represented:continue
  if kind=='flights'and p['role']=='escalator':
   if p['id']in selected and p.get('foundationDepth',0)>0:
    rows=[r['points']for r in p['contours']]
    previous=old_materials.get(p['id']+' foundation');assert previous,('Missing escalator foundation material',p['id'])
    space['mats']={'stone':previous[0]}
    foundation=space['stair'](p['id']+' foundation',[rows[0],rows[-1]],p['baseElevation']-.31,0,p['foundationDepth'])
    foundation['kyoto_motion_aux']=p['id'];foundation['kyoto_dynamic']=True
    if old_materials.get(foundation.name):
     foundation.data.materials.clear()
     for m in old_materials[foundation.name]:foundation.data.materials.append(m)
   continue
  assert p['id']in selected or p['id']in component_normals,('Unaccounted source record',kind,p['id'])
  name=p['id']+(' '+str(index)if kind=='beams'else'');mat=material(p['appearance'],p.get('material','stone'))
  if kind=='panels':
   o=mesh_object(name,[B(v)for v in p['vertices']],[p['triangles'][i:i+3][::-1]for i in range(0,len(p['triangles']),3)],mat=mat)
   if p.get('finishes'):
    lookup={p['appearance']:0}
    for finish in p['finishes']:
     a=finish['appearance']
     if a not in lookup:lookup[a]=len(o.data.materials);o.data.materials.append(material(a))
     for i in range(0,len(finish['triangles']),3):o.data.polygons[finish['triangles'][i]//3].material_index=lookup[a]
   normals=p.get('normals')or component_normals.get(p['id'])
   if normals:
    corners=[B(normals[li.vertex_index])for li in o.data.loops]
    for face in o.data.polygons:face.use_smooth=True
    o.data.normals_split_custom_set(corners);attribute=o.data.attributes.new(name='kyoto_authored_normal',type='FLOAT_VECTOR',domain='CORNER');attribute.data.foreach_set('vector',[x for n in corners for x in n])
   if p.get('uv'):
    uv=o.data.uv_layers.new(name='Retained surface UV');uv.data.foreach_set('uv',[x for li in o.data.loops for x in (p['uv'][li.vertex_index]['x'],p['uv'][li.vertex_index]['y'])])
  elif kind=='boxes':
   o=mesh_object(name,cube,cube_faces,mat=mat);o.location=B(p['center']);o.scale=(p['size']['x'],p['size']['z'],p['size']['y']);o.rotation_euler.z=-math.radians(p.get('yaw',0))
  elif kind=='beams':
   a,b=B(p['a']),B(p['b']);length=(b-a).length
   if p.get('profile')=='square':vs=cube;faces=cube_faces;scale=(2*p['radius'],2*p['radius'],length)
   else:
    vs=[(math.cos(i*math.tau/16),math.sin(i*math.tau/16),z)for z in (-.5,.5)for i in range(16)];faces=[tuple(reversed(range(16))),tuple(range(16,32))]+[(i,(i+1)%16,(i+1)%16+16,i+16)for i in range(16)];scale=(p['radius'],p['radius'],length)
   o=mesh_object(name,vs,faces,mat=mat);o.location=(a+b)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference((b-a).normalized());o.scale=scale
  else:
   space['mats']={'stone':mat,'stair-stone':mat,'stair-tread':material(p.get('treadAppearance',p['appearance']))};rows=[r['points']for r in p['contours']]
   o=space['stair'](name,rows,p['baseElevation'],p['rise'])
   if p['rise']>0:
    proxy=space['stair'](name+' walking surface',rows,p['baseElevation'],p['rise'],walking=True);proxy.hide_render=True;proxy['kyoto_owner']=name;proxy['kyoto_auxiliary']='walking surface'
   if p.get('foundationDepth',0)>0:
    foundation=space['stair'](name+' foundation',[rows[0],rows[-1]],p['baseElevation']-.31,0,p['foundationDepth']);foundation['kyoto_owner']=name;foundation['kyoto_auxiliary']='foundation'
    if old_materials.get(name+' foundation'):
     foundation.data.materials.clear()
     for m in old_materials[name+' foundation']:foundation.data.materials.append(m)
  o['kyoto_surface']=p['id'];o['kyoto_seed']=kind+'/'+str(index);o['kyoto_physical']=p.get('material','stone');o['kyoto_role']=p.get('role','structure');o['kyoto_collision']=p.get('collision',True);created.append(o)
print('CREATED_STATIC',len(created),flush=True)
# Rebuild only the changed step animations and shared chassis from native paths.
sys.path.insert(0,str(root/'tools'));from blender_escalators import build as build_escalators
physical={}
for key in ('escalator','steel','escalator-casing','escalator-edge'):
 r=next((r for r in target['authoredMaterials']if r.get('physical')==key),None)
 if not r:r=next(r for r in target['authoredMaterials']if r.get('physical')=='steel')
 physical[key]=material(r['id'])
for key,name in [('escalator','north-escalator-lower-1 step 0'),('steel','north-escalator-lower-1 nosing 0'),('escalator-casing','north-escalator-lower-1 casing 0')]:
 if old_materials.get(name):physical[key]=old_materials[name][0]
prior=set(bpy.data.objects);lanes=[p for p in target['escalators']if p['id']in selected];build_escalators(lanes,{'Player-only walking surfaces':collection},physical,cube,cube_faces)
for o in set(bpy.data.objects)-prior:
 o['kyoto_dynamic']=True
 if o.get('step_count'):o['kyoto_lane']=o.get('surface_id')
 if o.name.endswith(' walking surface'):o['kyoto_motion_aux']=o.name.removesuffix(' walking surface');o.hide_render=True
bpy.context.view_layer.update()
created_set=set(created)
for o in bpy.data.objects:
 if o.type=='MESH'and (o in created_set or o.get('kyoto_owner')in selected or o.get('kyoto_motion_aux')in selected):o['kyoto_geometry_signature']=signature(o)
 if o.get('kyoto_lane')in selected:o['kyoto_geometry_signature']=sha(np.array(o.matrix_world,dtype=np.float32).tobytes())
# This source includes the previously appended NIWA and handrail components.
# Save once; do not create a Blender backup for each intermediate operation.
out.mkdir(parents=True,exist_ok=True);(out/'station-layout.json').write_bytes(target_bytes)
# Text.write inserts one character at a time into a very long JSON line.
# Loading the same bytes directly avoids repeated copying of that whole line.
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json'])
seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
textures=(root/'.local/v2/current/source/textures').resolve()
if (out/'textures').exists():assert (out/'textures').resolve()==textures,'Preserve candidate texture edits'
else:(out/'textures').symlink_to(textures,target_is_directory=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
(out/'installation.json').write_text(json.dumps({'parentLayoutSha256':sha(parent_bytes),'layoutSha256':sha(target_bytes),'removedObjects':len(removed),'createdStaticObjects':len(created),'movingLanes':len(lanes),'status':'Private authoring candidate; export and complete runtime/browser checks required'},indent=2)+'\n')
print('WEST_CONNECTED_SOURCE_SAVED',out,flush=True)
