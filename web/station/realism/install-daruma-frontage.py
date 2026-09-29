"""Replace the draft Daruma boundary with the researched shopfront to the editable scene without rebuilding it."""
import bpy,json,sys,hashlib,math
from pathlib import Path
import numpy as np
from mathutils import Vector

manifest_path,candidate_path,component,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
assert not (out/'KyotoAtrium.blend').exists(),'Preserve existing candidate source edits'
sha=lambda b:hashlib.sha256(b).hexdigest()
base=json.loads(manifest_path.read_text());candidate=json.loads(candidate_path.read_text())
old_bytes=Path(base['layout']).read_bytes();new_bytes=Path(candidate['layout']).read_bytes()
old=json.loads(old_bytes);new=json.loads(new_bytes)
assert sha(old_bytes)==base['layoutSha256'] and sha(new_bytes)==candidate['layoutSha256']
retired={p['id']for p in old['panels'] if p['id']=='west-restaurant-shop-4' or p['id'].startswith('west-restaurant-shop-4-')};assert len(retired)==6
retained=[p for p in old['panels']if p['id'] not in retired];assert new['panels'][:len(retained)]==retained
for key in ('boxes','beams','flights','escalators'):assert new[key]==old[key],key
added=new['panels'][len(retained):]
report=json.loads((component/'report.json').read_text())
assert len(added)==report['geometry']['panels'] and all(p['id'].startswith('daruma-')for p in added)
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==old_bytes.decode()
by_id={p['id']:i for i,p in enumerate(new['panels'])};removed=[]
for o in list(bpy.data.objects):
 key=o.get('kyoto_seed','')
 if not key.startswith('panels/'):continue
 id=old['panels'][int(key.split('/')[1])]['id']
 assert id==o.get('kyoto_surface',o.name),(o.name,key,id)
 if id in retired:removed.append(id);bpy.data.objects.remove(o,do_unlink=True)
 else:o['kyoto_seed']='panels/'+str(by_id[id])
assert set(removed)==retired
materials={m['id']:m for m in new['authoredMaterials']};created_materials={}
def material(key):
 if key in created_materials:return created_materials[key]
 r=materials[key];assert not bpy.data.materials.get(r['label']),'Unexpected existing entry material'
 m=bpy.data.materials.new(r['label']);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=tuple(r['linearColor'][k]for k in 'rgba')
 bs.inputs['Metallic'].default_value=r['metallic'];bs.inputs['Roughness'].default_value=r['roughness']
 bs.inputs['Alpha'].default_value=r['linearColor'].get('a',1)
 if r['linearColor'].get('a',1)<1:m.surface_render_method='DITHERED'
 if r.get('emissionColor'):
  bs.inputs['Emission Color'].default_value=tuple(r['emissionColor'][k]for k in 'rgb')+(1,)
  bs.inputs['Emission Strength'].default_value=r.get('emission',1)
 if r.get('albedo'):
  path=component/'daruma-artwork.png';image=bpy.data.images.load(str(path.resolve()),check_existing=True);image.pack();texture=m.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image;texture.extension='EXTEND';m.node_tree.links.new(texture.outputs['Color'],bs.inputs['Base Color'])
 created_materials[key]=m;return m
collection=bpy.data.collections.new('Daruma shopfront');bpy.context.scene.collection.children.link(collection)
for index,p in enumerate(added,start=len(retained)):
 mesh=bpy.data.meshes.new(p['id']);mesh.from_pydata([(v['x'],v['z'],v['y'])for v in p['vertices']],[],[p['triangles'][i:i+3][::-1]for i in range(0,len(p['triangles']),3)]);mesh.update()
 o=bpy.data.objects.new(p['id'],mesh);collection.objects.link(o);mesh.materials.append(material(p['appearance']))
 if p.get('uv'):
  uv=mesh.uv_layers.new(name='UVMap')
  for loop in mesh.loops:uv.data[loop.index].uv=tuple(p['uv'][loop.vertex_index][k]for k in ('x','y'))
 o['kyoto_surface']=p['id'];o['kyoto_seed']='panels/'+str(index);o['kyoto_physical']=p['material'];o['kyoto_role']=p['role'];o['kyoto_collision']=p.get('collision',True)
 vertices=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',vertices)
 loops=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',loops)
 o['kyoto_geometry_signature']=sha(vertices.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
 assert [i for f in mesh.polygons for i in reversed(f.vertices)]==p['triangles']
 assert max((v.co-Vector((q['x'],q['z'],q['y']))).length for v,q in zip(mesh.vertices,p['vertices']))<.00002
lights=new['authoredLights'][len(old['authoredLights']):]
assert new['authoredLights'][:len(old['authoredLights'])]==old['authoredLights']
assert len(lights)==6 and all(l['id'].startswith('restaurant-practical-daruma-')for l in lights)
for row in lights:
 lamp=bpy.data.lights.new(row['id'],'SPOT');lamp.color=tuple(row['linearColor'][k]for k in ('r','g','b'));lamp.energy=row['intensity'];lamp.spot_size=math.radians(row['spotAngle']);lamp.spot_blend=1-row['innerSpotAngle']/row['spotAngle']
 o=bpy.data.objects.new(row['id'],lamp);collection.objects.link(o);p=row['position'];o.location=(p['x'],p['z'],p['y']);o['kyoto_fixture']=True;o['kyoto_unity_intensity']=row['intensity'];o['kyoto_range_m']=row['range'];o['reference']=row['source'];o['inference']=row['note']
out.mkdir(parents=True,exist_ok=True);(out/'station-layout.json').write_bytes(new_bytes)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
if not (out/'textures').exists():(out/'textures').symlink_to((Path(base['sourceScene']).parent/'textures').resolve(),target_is_directory=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
report={'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(new_bytes),'addedPanels':len(added),'sourceGeometryMatches':True,'retainedNativeRecordsUnchanged':True,'removedIds':sorted(retired)}
(out/'daruma-installation.json').write_text(json.dumps(report,indent=2)+'\n')
print('DARUMA_SOURCE_READY',json.dumps(report),flush=True)
