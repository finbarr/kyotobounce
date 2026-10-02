"""Install the bounded atrium fixture and fascia repair into the editable source."""
import bpy,json,sys,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
base_path,candidate_path=map(Path,sys.argv[sys.argv.index('--')+1:]);base=json.loads(base_path.read_text());candidate=json.loads(candidate_path.read_text());out=candidate_path.parent
proof=json.loads((out/'repair.json').read_text());retired=set(proof['retired']);added=set(proof['added']);sha=lambda b:hashlib.sha256(b).hexdigest()
raw=Path(candidate['layout']).read_bytes();new=json.loads(raw);old=json.loads(Path(base['layout']).read_bytes())
assert sha(raw)==candidate['layoutSha256']
for key in ['beams','flights','escalators','authoredLights','authoredMaterials']:assert new[key]==old[key],key
for key in ['boxes','panels']:assert [p for p in new[key]if p['id']not in added]==[p for p in old[key]if p['id']not in retired],key
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==base['layoutSha256']
indices={key:{p['id']:i for i,p in enumerate(new[key])}for key in ['panels','boxes']};objects=[];removed=[]
for o in bpy.data.objects:
 id=o.get('kyoto_surface',o.name)
 if id in retired:objects.append(o);removed.append(id);continue
 tag=o.get('kyoto_seed','')
 if '/'in tag and tag.split('/')[0]in indices:
  key,index=tag.split('/');id=old[key][int(index)]['id'];assert id in indices[key];o['kyoto_seed']=key+'/'+str(indices[key][id])
assert set(removed)==retired
retained_names=set(o.name for o in bpy.data.objects)-set(o.name for o in objects)
bpy.data.batch_remove(ids=objects);print('REMOVED_ATRIUM_OBJECTS',len(objects),flush=True)
materials={m['id']:m for m in new['authoredMaterials']};created={}
def material(key):
 if key in created:return created[key]
 r=materials[key];existing=bpy.data.materials.get(r['label'])
 if existing:created[key]=existing;return existing
 m=bpy.data.materials.new(r['label']);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=tuple(r['linearColor'][k]for k in 'rgba');bs.inputs['Metallic'].default_value=r.get('metallic',0);bs.inputs['Roughness'].default_value=r.get('roughness',.7);created[key]=m;return m
def signature(o):
 vertices=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',vertices);loops=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',loops)
 return sha(vertices.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
collection=bpy.data.collections.new('Atrium joints and mounted gate fixtures');bpy.context.scene.collection.children.link(collection)
for p in new['panels']:
 if p['id']not in added:continue
 mesh=bpy.data.meshes.new(p['id']);mesh.from_pydata([(v['x'],v['z'],v['y'])for v in p['vertices']],[],[p['triangles'][i:i+3][::-1]for i in range(0,len(p['triangles']),3)]);mesh.update();o=bpy.data.objects.new(p['id'],mesh);collection.objects.link(o);mesh.materials.append(material(p['appearance']))
 if p.get('uv'):
  uv=mesh.uv_layers.new(name='UVMap')
  for loop in mesh.loops:uv.data[loop.index].uv=tuple(p['uv'][loop.vertex_index][k]for k in ('x','y'))
 o['kyoto_surface']=p['id'];o['kyoto_seed']='panels/'+str(indices['panels'][p['id']]);o['kyoto_physical']=p['material'];o['kyoto_role']=p['role'];o['kyoto_collision']=p.get('collision',True);o['kyoto_geometry_signature']=signature(o)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str(Path(candidate['layout']).resolve()),internal=True);seed.name='Kyoto runtime seed.json';seed.use_fake_user=True
bpy.data.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True);bpy.context.preferences.filepaths.save_version=0
source=out/'KyotoAtrium.blend';assert not source.exists();bpy.ops.wm.save_as_mainfile(filepath=str(source.resolve()));bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
assert set(o.name for o in bpy.data.objects)==retained_names|added
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==candidate['layoutSha256'];assert bpy.data.texts['Kyoto runtime seed.json'].is_in_memory
assert not any(o.get('kyoto_lift')for o in bpy.data.objects)
for o in bpy.data.objects:
 tag=o.get('kyoto_seed','')
 if '/'in tag and tag.split('/')[0]in indices:
  key,index=tag.split('/');assert new[key][int(index)]['id']==o.get('kyoto_surface',o.name)
for p in new['panels']:
 if p['id']not in added:continue
 o=bpy.data.objects[p['id']];assert signature(o)==o['kyoto_geometry_signature'];assert [i for f in o.data.polygons for i in reversed(f.vertices)]==p['triangles'];assert max((v.co-Vector((q['x'],q['z'],q['y']))).length for v,q in zip(o.data.vertices,p['vertices']))<2e-5
 assert o.data.materials[0].name==materials[p['appearance']]['label']
 if p.get('uv'):
  for loop in o.data.loops:assert max(abs(o.data.uv_layers.active.data[loop.index].uv[i]-p['uv'][loop.vertex_index][k])for i,k in enumerate(('x','y')))<1e-5
detail=json.loads(Path(base['detail']).read_text());detail['candidateMotionIntegration']['layoutSha256']=candidate['layoutSha256'];(out/'atrium-detail.json').write_text(json.dumps(detail,separators=(',',':'))+'\n')
candidate.update(sourceScene=str(source),motionLayout=candidate['layout'],detail=str(out/'atrium-detail.json'));candidate_path.write_text(json.dumps(candidate,indent=2)+'\n')
report=dict(sourceSha256=sha(source.read_bytes()),layoutSha256=candidate['layoutSha256'],removedStaticObjects=len(removed),addedPanels=len(added),retainedNamesExact=True,reopenedSeedExact=True,addedMeshesExact=True,bindingsChecked=True)
(out/'source-proof.json').write_text(json.dumps(report,indent=2)+'\n');print('ATRIUM_DETAIL_SOURCE_READY',report,flush=True)
