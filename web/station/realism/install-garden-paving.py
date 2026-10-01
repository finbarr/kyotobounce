"""Save and reopen the garden finish, verifying geometry, UVs and packed maps."""
import bpy,json,sys,hashlib
import numpy as np
from pathlib import Path

directory=Path(sys.argv[sys.argv.index('--')+1]);out=directory/'source'
assert Path('.local').resolve() in out.resolve().parents
assert not (out/'KyotoAtrium.blend').exists(),'Preserve an existing candidate source'
sha=lambda b:hashlib.sha256(b).hexdigest()
report=json.loads((directory/'report.json').read_text());base=report['parent']
raw=(directory/'station-layout.json').read_bytes();assert sha(raw)==report['layoutSha256']
parent_hash=sha(Path(base['sourceScene']).read_bytes())
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==base['layoutSha256']
def target():
 objects=[o for o in bpy.data.objects if o.get('kyoto_surface')==report['panelId']]
 assert len(objects)==1;return objects[0]
def geometry(obj):
 mesh=obj.data;v=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',v)
 loops=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',loops)
 return sha(v.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
def bindings():
 return {o.name:([m.name if m else None for m in o.data.materials],o.get('kyoto_seed'),len(o.data.vertices),len(o.data.polygons)) for o in bpy.data.objects if o.type=='MESH' and o.get('kyoto_surface')!=report['panelId']}
obj=target();before=geometry(obj);retained=bindings();mesh=obj.data
assert len(mesh.materials)==1 and mesh.materials[0].name=='station-additions-garden-paving'
material=mesh.materials[0].copy();material.name=report['materialLabel'];mesh.materials[0]=material
def expected_uv(point):return ((point.x+202.3)/2.4,1-(point.y+25)/2.4)
layer=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
for loop in mesh.loops:layer.data[loop.index].uv=expected_uv(obj.matrix_world@mesh.vertices[loop.vertex_index].co)
material.use_nodes=True;nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF');assert bs
bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=1
material.diffuse_color=(1,1,1,1)
for kind in ('albedo','normal','mask'):
 row=report['maps'][kind];path=directory/'textures'/row['file'];assert sha(path.read_bytes())==row['sha256']
 image=bpy.data.images.load(str(path.resolve()),check_existing=False)
 if kind!='albedo':image.colorspace_settings.name='Non-Color'
 image.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT'
 if kind=='albedo':links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 elif kind=='normal':
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=report['normalScale'];links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 else:
  subtract=nodes.new('ShaderNodeMath');subtract.operation='SUBTRACT';subtract.inputs[0].default_value=1;links.new(tex.outputs['Alpha'],subtract.inputs[1]);links.new(subtract.outputs[0],bs.inputs['Roughness'])
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((directory/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
out.mkdir(parents=True,exist_ok=True);scene=out/'KyotoAtrium.blend';bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(scene.resolve()))
bpy.ops.wm.open_mainfile(filepath=str(scene.resolve()))
obj=target();assert geometry(obj)==before;assert bindings()==retained
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==report['layoutSha256']
assert obj.data.materials[0].name==report['materialLabel']
error=0
for loop in obj.data.loops:
 expected=expected_uv(obj.matrix_world@obj.data.vertices[loop.vertex_index].co)
 error=max(error,max(abs(a-b)for a,b in zip(expected,obj.data.uv_layers.active.data[loop.index].uv)))
assert error<.000004
for kind in ('albedo','normal','mask'):
 row=report['maps'][kind];images=[n.image for n in obj.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and Path(n.image.filepath).name==row['file']]
 assert len(images)==1 and sha(images[0].packed_file.data)==row['sha256']
proof={'pass':True,'parentSourceSha256':parent_hash,'sourceSha256':sha(scene.read_bytes()),'layoutSha256':report['layoutSha256'],'floorGeometryUnchanged':True,'retainedBindingsMatch':True,'uvLoops':len(obj.data.loops),'maximumUVError':error,'threePackedTexturesMatch':True}
(directory/'source-installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('GARDEN_PAVING_SOURCE_VERIFIED',json.dumps(proof),flush=True)
