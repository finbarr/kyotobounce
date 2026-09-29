"""Install the photo-guided ceiling fittings in the existing editable station."""
import bpy,json,sys,hashlib,math
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
base_path,candidate_path,component,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
assert not (out/'KyotoAtrium.blend').exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
base=json.loads(base_path.read_text());candidate=json.loads(candidate_path.read_text());report=json.loads((component/'report.json').read_text())
old_raw=Path(base['layout']).read_bytes();new_raw=Path(candidate['layout']).read_bytes();old=json.loads(old_raw);new=json.loads(new_raw)
assert sha(old_raw)==base['layoutSha256'] and sha(new_raw)==candidate['layoutSha256']
retained=old['panels'];assert new['panels'][:len(retained)]==retained
for key in ('boxes','beams','flights','escalators','authoredLights'):assert old[key]==new[key]
added=new['panels'][len(retained):];assert len(added)==report['geometry']['panels'] and all(p['id'].startswith('daruma-ceiling-')for p in added)
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==old_raw.decode()
by_id={p['id']:i for i,p in enumerate(new['panels'])}
materials={m['id']:m for m in new['authoredMaterials']};created={}
def material(key):
 if key in created:return created[key]
 r=materials[key]
 existing=bpy.data.materials.get(r['label'])
 if existing:created[key]=existing;return existing
 m=bpy.data.materials.new(r['label']);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=tuple(r['linearColor'][k]for k in 'rgba');bs.inputs['Metallic'].default_value=r['metallic'];bs.inputs['Roughness'].default_value=r['roughness']
 if r.get('emissionColor'):
  bs.inputs['Emission Color'].default_value=tuple(r['emissionColor'][k]for k in 'rgb')+(1,);bs.inputs['Emission Strength'].default_value=r.get('emission',1)
 if r.get('albedo'):
  image=bpy.data.images.load(str((component/report['texture']['file']).resolve()),check_existing=True);image.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='EXTEND';m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 created[key]=m;return m
collection=bpy.data.collections.new('Daruma Kyoto ceiling fittings');bpy.context.scene.collection.children.link(collection)
def signature(o):
 vertices=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',vertices);loops=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',loops)
 return sha(vertices.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
for index,p in enumerate(added,start=len(retained)):
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
out.mkdir(parents=True,exist_ok=True);(out/'station-layout.json').write_bytes(new_raw)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
(out/'textures').symlink_to((Path(base['sourceScene']).parent/'textures').resolve(),target_is_directory=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==new_raw.decode();objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects}
for p in added:
 o=objects[p['id']];mesh=o.data;assert o['kyoto_seed']=='panels/'+str(by_id[p['id']]);assert signature(o)==o['kyoto_geometry_signature'];assert mesh.materials[0].name==materials[p['appearance']]['label'];assert [i for f in mesh.polygons for i in reversed(f.vertices)]==p['triangles'];assert max((v.co-Vector((q['x'],q['z'],q['y']))).length for v,q in zip(mesh.vertices,p['vertices']))<2e-5
 for l in mesh.loops:
  if p.get('uv'):assert max(abs(mesh.uv_layers.active.data[l.index].uv[i]-p['uv'][l.vertex_index][k])for i,k in enumerate(('x','y')))<1e-5
  if p.get('normals'):assert max(abs(mesh.corner_normals[l.index].vector[i]-p['normals'][l.vertex_index][k])for i,k in enumerate(('x','z','y')))<.001
for p in retained:
 o=objects.get(p['id']);assert o and o['kyoto_seed']=='panels/'+str(by_id[p['id']])
proof={'pass':True,'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(new_raw),'addedPanels':len(added),'savedGeometryUVsNormalsMatch':True,'retainedBindingsMatch':True}
(out/'installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('DARUMA_CEILING_SOURCE_READY',json.dumps(proof),flush=True)
