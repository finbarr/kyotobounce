"""Export the frozen authored atrium as material/spatial batches for Three.js.
The source blend is read-only. Collision and moving-lane definitions stay in Unity.
"""
from pathlib import Path
import bpy,json,math,hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/atrium/KyotoAtrium.blend'
LAYOUT=ROOT/'runtime/station-layout.json'
OUT=ROOT/'web/public/assets';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));source_scene=bpy.context.scene
layout=json.loads(LAYOUT.read_text());records={m['label']:m for m in layout['authoredMaterials']}
def enable(layer):
 layer.exclude=False;layer.hide_viewport=False;layer.collection.hide_viewport=False
 for child in layer.children:enable(child)
enable(bpy.context.view_layer.layer_collection)
source_scene.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
groups={};counts={'sourceObjects':0,'triangles':0,'skippedDynamic':0,'skippedProxies':0}
for obj in list(source_scene.objects):
 if obj.type!='MESH':continue
 if obj.get('kyoto_dynamic') or obj.get('kyoto_lane'):
  counts['skippedDynamic']+=1;continue
 if obj.hide_render or obj.get('kyoto_authoring_helper') or obj.get('kyoto_auxiliary')=='walking surface' or obj.get('kyoto_motion_aux'):
  counts['skippedProxies']+=1;continue
 if obj.hide_viewport:obj.hide_viewport=False
 if obj.hide_get():obj.hide_set(False)
 e=obj.evaluated_get(deps);mesh=e.to_mesh();mesh.calc_loop_triangles()
 matrix=e.matrix_world;nm=matrix.to_3x3().inverted_safe().transposed();uv_layer=mesh.uv_layers.active
 center=matrix.translation;cell=(math.floor(center.x/20),math.floor(center.y/20),math.floor(center.z/15))
 flipped=matrix.determinant()<0
 counts['sourceObjects']+=1
 for tri in mesh.loop_triangles:
  original=mesh.materials[tri.material_index] if tri.material_index<len(mesh.materials) else None
  label=original.name if original else 'Default stone'
  key=(label,cell)
  g=groups.setdefault(key,{'positions':[],'normals':[],'uv':[],'faces':[]})
  base=len(g['positions']);span=float(records.get(label,{}).get('worldTextureSpan',0))
  for li in (reversed(tri.loops) if flipped else tri.loops):
   pt=matrix@mesh.vertices[mesh.loops[li].vertex_index].co
   normal=(nm@mesh.corner_normals[li].vector).normalized()
   g['positions'].append(tuple(pt));g['normals'].append(tuple(normal))
   if span>0:
    n=normal
    uv=(pt.x/span,pt.y/span) if abs(n.z)>.5 else (pt.y/span,pt.z/span) if abs(n.x)>.5 else (pt.x/span,pt.z/span)
   else:uv=tuple(uv_layer.data[li].uv) if uv_layer else (pt.x/2.4,pt.y/2.4)
   g['uv'].append(uv)
  g['faces'].append((base,base+1,base+2));counts['triangles']+=1
 e.to_mesh_clear()
print('COLLECTED_BROWSER_ART',counts,'batches',len(groups),flush=True)
scene=bpy.data.scenes.new('Browser export');bpy.context.window.scene=scene
mats={}
def material(label):
 if label in mats:return mats[label]
 rec=records.get(label,{})
 color=rec.get('linearColor',{'r':.32,'g':.34,'b':.35});alpha=rec.get('alpha',1)
 m=bpy.data.materials.new(label+' | Browser');m.use_nodes=True;m['sourceLabel']=label;m['physical']=rec.get('physical','stone')
 p=m.node_tree.nodes.get('Principled BSDF');links=m.node_tree.links;nodes=m.node_tree.nodes
 p.inputs['Base Color'].default_value=(*(color.get(k,.4) for k in 'rgb'),alpha)
 p.inputs['Metallic'].default_value=rec.get('metallic',0);p.inputs['Roughness'].default_value=rec.get('roughness',.5);p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 for key in ['albedo','normal']:
  image_ref=rec.get(key)
  if not image_ref:continue
  matches=list((LAYOUT.parent/'textures').glob(Path(image_ref).name+'.*'))
  if not matches:raise FileNotFoundError(image_ref)
  image=bpy.data.images.load(str(matches[0]),check_existing=True)
  if key=='normal':image.colorspace_settings.name='Non-Color'
  tex=nodes.new('ShaderNodeTexImage');tex.image=image
  if key=='albedo':links.new(tex.outputs['Color'],p.inputs['Base Color'])
  else:
   normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=rec.get('normalScale',1)
   links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
 mats[label]=m;return m
for (label,cell),g in groups.items():
 name=label+' @ '+','.join(map(str,cell));mesh=bpy.data.meshes.new(name)
 mesh.from_pydata(g['positions'],[],g['faces']);mesh.update()
 uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',[v for pair in g['uv'] for v in pair])
 for p in mesh.polygons:p.use_smooth=True
 mesh.normals_split_custom_set(g['normals'])
 obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);mesh.materials.append(material(label))
 obj['source']='HumanScale05.blend';obj['sourceMaterial']=label
bpy.ops.export_scene.gltf(filepath=str(OUT/'atrium.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_materials='EXPORT')
public={k:layout[k] for k in ['spawn','escalators','authoredLights','authoredMaterials']}
public.update(layoutSha256=hashlib.sha256(LAYOUT.read_bytes()).hexdigest(),coordinateMapping='Unity (x,y,z) -> Three (x,y,-z)')
(OUT/'station.json').write_text(json.dumps(public,separators=(',',':')))
counts.update(batches=len(groups),materials=len(mats),glbBytes=(OUT/'atrium.glb').stat().st_size,sourceSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),layoutSha256=public['layoutSha256'])
(ROOT/'artifacts/phase3/art').mkdir(parents=True,exist_ok=True)
(ROOT/'artifacts/phase3/art/export.json').write_text(json.dumps(counts,indent=2)+'\n')
print('KYOTO_BROWSER_ART_READY',json.dumps(counts),flush=True)
