"""Install the floor finish and UVs while preserving source geometry and physics."""
import bpy,json,sys,hashlib
from pathlib import Path
base_path,finish_dir,out=map(Path,sys.argv[sys.argv.index('--')+1:])
assert Path('.local').resolve() in out.resolve().parents
assert not (out/'KyotoAtrium.blend').exists(),'Preserve existing candidate source'
sha=lambda b:hashlib.sha256(b).hexdigest()
base=json.loads(base_path.read_text());report=json.loads((finish_dir/'report.json').read_text());raw=(finish_dir/'station-layout.json').read_bytes();layout=json.loads(raw)
assert sha(raw)==report['layoutSha256']
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==base['layoutSha256']
objects=[o for o in bpy.data.objects if o.get('kyoto_surface')=='west-restaurant-floor'];assert len(objects)==1
obj=objects[0];mesh=obj.data;assert len(mesh.materials)==1
material=mesh.materials[0];assert material.name==report['materialLabel']
E=report['frame']['origin'];A=report['frame']['across'];N=report['frame']['inward'];span=report['frame']['spanM']
def uv(point):
 x=point.x-E[0];z=-point.y-E[2]
 return ((x*A[0]+z*A[1])/span,1-(x*N[0]+z*N[1])/span)
layer=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
for loop in mesh.loops:layer.data[loop.index].uv=uv(obj.matrix_world@mesh.vertices[loop.vertex_index].co)
material.use_nodes=True;nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=1
for kind in ('albedo','normal','mask'):
 row=report['maps'][kind];path=finish_dir/'textures'/row['file'];assert sha(path.read_bytes())==row['sha256']
 image=bpy.data.images.load(str(path.resolve()),check_existing=False)
 if kind!='albedo':image.colorspace_settings.name='Non-Color'
 image.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT'
 if kind=='albedo':links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 elif kind=='normal':
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.6;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 else:
  subtract=nodes.new('ShaderNodeMath');subtract.operation='SUBTRACT';subtract.inputs[0].default_value=1;links.new(tex.outputs['Alpha'],subtract.inputs[1]);links.new(subtract.outputs[0],bs.inputs['Roughness'])
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((finish_dir/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
out.mkdir(parents=True,exist_ok=True);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
proof={'parentSourceSha256':sha(Path(base['sourceScene']).read_bytes()),'sourceSha256':sha((out/'KyotoAtrium.blend').read_bytes()),'layoutSha256':sha(raw),'updatedObject':obj.name,'uvLoops':len(mesh.loops),'geometryUnchanged':True}
(out/'floor-installation.json').write_text(json.dumps(proof,indent=2)+'\n');print('RESTAURANT_FLOOR_SOURCE_READY',json.dumps(proof),flush=True)
