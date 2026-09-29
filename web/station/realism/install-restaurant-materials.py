"""Install researched finishes, UVs and stool normals without changing source geometry."""
import bpy,json,sys,hashlib
from pathlib import Path
import numpy as np
base_path,finish_dir,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
assert not (out/'KyotoAtrium.blend').exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
base=json.loads(base_path.read_text());report=json.loads((finish_dir/'report.json').read_text());raw=(finish_dir/'station-layout.json').read_bytes();layout=json.loads(raw)
assert sha(raw)==report['layoutSha256']
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==base['layoutSha256']
materials={}
for spec in report['specs']:
 m=bpy.data.materials[spec.get('from',spec['label'])]
 if spec.get('from'):
  assert not bpy.data.materials.get(spec['label']);m=m.copy();m.name=spec['label']
 materials[spec['appearance']]=m;m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=spec['color'];bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=spec['rough']
 for kind in (['albedo','normal','mask'] if spec['kind']=='wood' else ['normal','mask']):
  row=report['maps'][spec['kind']+'-'+kind];path=finish_dir/'textures'/row['file'];assert sha(path.read_bytes())==row['sha256']
  image=bpy.data.images.load(str(path.resolve()),check_existing=True)
  if kind!='albedo':image.colorspace_settings.name='Non-Color'
  image.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='MIRROR'
  if kind=='albedo':
   multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=spec['color'];links.new(tex.outputs['Color'],multiply.inputs[1]);links.new(multiply.outputs[0],bs.inputs['Base Color'])
  elif kind=='normal':
   normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45 if spec['kind']=='wood' else .3;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  else:
   subtract=nodes.new('ShaderNodeMath');subtract.operation='SUBTRACT';subtract.inputs[0].default_value=1;links.new(tex.outputs['Alpha'],subtract.inputs[1]);multiply=nodes.new('ShaderNodeMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=spec['rough'];links.new(subtract.outputs[0],multiply.inputs[0]);links.new(multiply.outputs[0],bs.inputs['Roughness'])
objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects};panels={p['id']:p for p in layout['panels']};signatures={}
def signature(o):
 vertices=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',vertices);loops=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',loops)
 return sha(vertices.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
for edit in report['edits']:
 o=objects[edit['id']];p=panels[edit['id']];mesh=o.data;signatures[edit['id']]=signature(o);assert len(mesh.vertices)==len(p['vertices'])
 if edit['uv']:
  mesh.materials[0]=materials[p['appearance']];uv=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
  for loop in mesh.loops:uv.data[loop.index].uv=tuple(p['uv'][loop.vertex_index][k] for k in ('x','y'))
 if edit['smooth']:
  normals=[tuple(p['normals'][l.vertex_index][k] for k in ('x','z','y')) for l in mesh.loops]
  for polygon in mesh.polygons:polygon.use_smooth=True
  mesh.normals_split_custom_set(normals)
  exact=mesh.attributes.get('kyoto_authored_normal') or mesh.attributes.new('kyoto_authored_normal','FLOAT_VECTOR','CORNER')
  for i,n in enumerate(normals):exact.data[i].vector=n
 assert signature(o)==signatures[edit['id']]
for id in report['adjustedLights']:
 lamp=bpy.data.objects[id];assert lamp.type=='LIGHT';lamp.data.energy=3.3;lamp['kyoto_unity_intensity']=3.3
out.mkdir(parents=True,exist_ok=True);(out/'station-layout.json').write_bytes(raw)
if not (out/'textures').exists():(out/'textures').symlink_to((Path(base['sourceScene']).parent/'textures').resolve(),target_is_directory=True)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==report['layoutSha256']
objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects}
for edit in report['edits']:
 o=objects[edit['id']];p=panels[edit['id']];mesh=o.data;assert signature(o)==signatures[edit['id']]
 if edit['uv']:
  assert mesh.materials[0].name==next(s['label']for s in report['specs'] if s['appearance']==p['appearance'])
  for l in mesh.loops:assert max(abs(mesh.uv_layers.active.data[l.index].uv[i]-p['uv'][l.vertex_index][k])for i,k in enumerate(('x','y')))<1e-5
 if edit['smooth']:
  for l in mesh.loops:assert max(abs(mesh.corner_normals[l.index].vector[i]-p['normals'][l.vertex_index][k])for i,k in enumerate(('x','z','y')))<.001
for id in report['adjustedLights']:
 lamp=bpy.data.objects[id];assert abs(lamp.data.energy-3.3)<1e-6 and lamp['kyoto_unity_intensity']==3.3
# Every newly referenced texture is packed into the saved scene.
for spec in report['specs']:
 m=bpy.data.materials[spec['label']]
 for node in m.node_tree.nodes:
  if node.type=='TEX_IMAGE':assert node.image.packed_file
proof={'pass':True,'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(raw),'editedObjects':len(signatures),'sourceGeometryUnchanged':True,'savedUVsAndNormalsMatch':True}
(out/'installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('RESTAURANT_MATERIAL_SOURCE_READY',json.dumps(proof),flush=True)
