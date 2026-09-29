"""Move the rear fittings and install the communal table in the same editable scene."""
import bpy,json,sys,hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
base_path,candidate_path,component,relocation_path,out=map(Path,sys.argv[sys.argv.index('--')+1:]);assert Path('.local').resolve() in out.resolve().parents;assert not (out/'KyotoAtrium.blend').exists()
sha=lambda b:hashlib.sha256(b).hexdigest();base=json.loads(base_path.read_text());candidate=json.loads(candidate_path.read_text());r=json.loads(relocation_path.read_text());report=json.loads((component/'report.json').read_text());old_raw=Path(base['layout']).read_bytes();raw=Path(candidate['layout']).read_bytes();old=json.loads(old_raw);new=json.loads(raw)
assert sha(old_raw)==base['layoutSha256'] and sha(raw)==candidate['layoutSha256']
added=new['panels'][len(old['panels']):];assert len(added)==report['geometry']['panels'];assert old['authoredMaterials']==new['authoredMaterials']
by_id={p['id']:p for p in new['panels']};indices={p['id']:i for i,p in enumerate(new['panels'])}
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==old_raw.decode();objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects}
def signature(o):
 vertices=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',vertices);loops=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',loops)
 return sha(vertices.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
for id in r['movedIds']:
 o=objects[id];p=by_id[id];assert len(o.data.vertices)==len(p['vertices']);assert o.matrix_world==Matrix.Identity(4)
 for v,q in zip(o.data.vertices,p['vertices']):v.co=(q['x'],q['z'],q['y'])
 o.data.update()
 if p.get('normals'):
  normals=[tuple(p['normals'][l.vertex_index][k]for k in ('x','z','y'))for l in o.data.loops]
  o.data.normals_split_custom_set(normals)
 o['kyoto_geometry_signature']=signature(o)
for id in r['movedLights']:
 o=bpy.data.objects[id];p=next(l['position']for l in new['authoredLights']if l['id']==id);o.location=(p['x'],p['z'],p['y'])
materials={m['id']:m for m in new['authoredMaterials']};collection=bpy.data.collections.new('Daruma central communal table');bpy.context.scene.collection.children.link(collection)
for p in added:
 mesh=bpy.data.meshes.new(p['id']);mesh.from_pydata([(v['x'],v['z'],v['y'])for v in p['vertices']],[],[p['triangles'][i:i+3][::-1]for i in range(0,len(p['triangles']),3)]);mesh.update();o=bpy.data.objects.new(p['id'],mesh);collection.objects.link(o);mesh.materials.append(bpy.data.materials[materials[p['appearance']]['label']])
 if p.get('uv'):
  uv=mesh.uv_layers.new(name='UVMap')
  for l in mesh.loops:uv.data[l.index].uv=tuple(p['uv'][l.vertex_index][k]for k in ('x','y'))
 normals=[tuple(p['normals'][l.vertex_index][k]for k in ('x','z','y'))for l in mesh.loops]
 for f in mesh.polygons:f.use_smooth=True
 mesh.normals_split_custom_set(normals);exact=mesh.attributes.new('kyoto_authored_normal','FLOAT_VECTOR','CORNER')
 for i,n in enumerate(normals):exact.data[i].vector=n
 o['kyoto_surface']=p['id'];o['kyoto_seed']='panels/'+str(indices[p['id']]);o['kyoto_physical']=p['material'];o['kyoto_role']=p['role'];o['kyoto_collision']=p.get('collision',True);o['kyoto_geometry_signature']=signature(o)
out.mkdir(parents=True,exist_ok=True);(out/'station-layout.json').write_bytes(raw);(out/'textures').symlink_to((Path(base['sourceScene']).parent/'textures').resolve(),target_is_directory=True)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json';bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode();objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects}
for p in [by_id[id]for id in r['movedIds']]+added:
 o=objects[p['id']];mesh=o.data;assert o['kyoto_seed']=='panels/'+str(indices[p['id']]);assert signature(o)==o['kyoto_geometry_signature'];assert [i for f in mesh.polygons for i in reversed(f.vertices)]==p['triangles'];assert max((v.co-Vector((q['x'],q['z'],q['y']))).length for v,q in zip(mesh.vertices,p['vertices']))<2e-5
 for l in mesh.loops:
  if p.get('uv'):assert max(abs(mesh.uv_layers.active.data[l.index].uv[i]-p['uv'][l.vertex_index][k])for i,k in enumerate(('x','y')))<1e-5
  if p.get('normals'):assert max(abs(mesh.corner_normals[l.index].vector[i]-p['normals'][l.vertex_index][k])for i,k in enumerate(('x','z','y')))<.001
for id in r['movedLights']:
 p=next(l['position']for l in new['authoredLights']if l['id']==id);assert (bpy.data.objects[id].location-Vector((p['x'],p['z'],p['y']))).length<1e-5
proof={'pass':True,'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(raw),'movedPanels':len(r['movedIds']),'addedPanels':len(added),'savedGeometryUVsNormalsMatch':True};(out/'installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('DARUMA_TABLE_SOURCE_READY',json.dumps(proof),flush=True)
