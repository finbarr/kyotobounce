"""Export the frozen authored atrium as material/spatial batches for Three.js.
The source blend is read-only. Collision and moving-lane definitions stay in Unity.
"""
from pathlib import Path
import bpy,json,math,hashlib,argparse,sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,default=ROOT/'art-source/atrium/KyotoAtrium.blend')
parser.add_argument('--layout',type=Path,default=ROOT/'runtime/station-layout.json')
parser.add_argument('--output',type=Path)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
SOURCE=args.source.resolve();LAYOUT=args.layout.resolve()
OUT=(args.output or ROOT/'web/public/assets').resolve();OUT.mkdir(parents=True,exist_ok=True)
REPORT=OUT/'atrium-export.json' if args.output else ROOT/'artifacts/phase3/art/export.json'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));source_scene=bpy.context.scene
layout=json.loads(LAYOUT.read_text());records={m['label']:m for m in layout['authoredMaterials']}
def enable(layer):
 layer.exclude=False;layer.hide_viewport=False;layer.collection.hide_viewport=False
 for child in layer.children:enable(child)
enable(bpy.context.view_layer.layer_collection)
source_scene.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
# The west-wing facade caps/substrates share top planes with the closed floor
# slabs. Keep the floor as the visible surface where they overlap, including
# the former K020 doorway case. Preserve exposed rims, sides and collision.
FLOOR_PREFIXES=('west-north-floor-','west-south-floor-')
CAP_PREFIXES=('west-north-slab-edge-','west-south-slab-edge-',
              'west-north-substrate-','west-south-substrate-')
def is_cap(name):return name.startswith(CAP_PREFIXES)
floor_triangles={side:[] for side in ('north','south')}
for floor in source_scene.objects:
    if floor.type!='MESH' or floor.hide_render or not floor.name.startswith(FLOOR_PREFIXES):continue
    side=floor.name.split('-')[1]
    e=floor.evaluated_get(deps);fm=e.to_mesh();fm.calc_loop_triangles()
    for triangle in fm.loop_triangles:
        pts=[e.matrix_world@fm.vertices[i].co for i in triangle.vertices]
        if (pts[1]-pts[0]).cross(pts[2]-pts[0]).z>1e-8 and max(v.z for v in pts)-min(v.z for v in pts)<1e-5:
            floor_triangles[side].append(pts)
    e.to_mesh_clear()
if not all(floor_triangles.values()):raise RuntimeError('West-wing supporting floors are missing')
cap_audit={'objects':{},'trianglesTrimmed':0,'coveredAreaM2':0}
def planar_area(poly):
    return abs(sum(a[0].x*b[0].y-b[0].x*a[0].y for a,b in zip(poly,poly[1:]+poly[:1])))*.5 if len(poly)>2 else 0

def split_face(poly,a,b):
    def distance(v):return (b.x-a.x)*(v[0].y-a.y)-(b.y-a.y)*(v[0].x-a.x)
    inside=[];outside=[]
    for v,w in zip(poly,poly[1:]+poly[:1]):
        dv,dw=distance(v),distance(w)
        (inside if dv>=0 else outside).append(v)
        if (dv>=0)!=(dw>=0):
            t=dv/(dv-dw)
            at=(v[0].lerp(w[0],t),v[1].lerp(w[1],t),tuple(x+(y-x)*t for x,y in zip(v[2],w[2])))
            inside.append(at);outside.append(at)
    return inside,outside

def visible_cap_fragments(name,vertices):
    if not is_cap(name) or min(v[1].z for v in vertices)<.99:return [vertices]
    original=planar_area(vertices);pieces=[vertices]
    for floor_triangle in floor_triangles[name.split('-')[1]]:
        if max(abs(v[0].z-floor_triangle[0].z) for v in vertices)>.0001:continue
        remaining=[]
        for poly in pieces:
            inside=poly
            for a,b in zip(floor_triangle,floor_triangle[1:]+floor_triangle[:1]):
                if len(inside)<3:break
                inside,outside=split_face(inside,a,b)
                if planar_area(outside)>1e-9:remaining.append(outside)
        pieces=remaining
    removed=original-sum(planar_area(poly) for poly in pieces)
    if removed>1e-8:
        cap_audit['trianglesTrimmed']+=1;cap_audit['coveredAreaM2']+=removed
        cap_audit['objects'][name]=cap_audit['objects'].get(name,0)+removed
    return pieces

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
  vertices=[];span=float(records.get(label,{}).get('worldTextureSpan',0))
  for li in (reversed(tri.loops) if flipped else tri.loops):
   pt=matrix@mesh.vertices[mesh.loops[li].vertex_index].co
   normal=(nm@mesh.corner_normals[li].vector).normalized()
   if span>0:
    n=normal
    uv=(pt.x/span,pt.y/span) if abs(n.z)>.5 else (pt.y/span,pt.z/span) if abs(n.x)>.5 else (pt.x/span,pt.z/span)
   else:uv=tuple(uv_layer.data[li].uv) if uv_layer else (pt.x/2.4,pt.y/2.4)
   vertices.append((pt,normal,uv))
  for polygon in visible_cap_fragments(obj.name,vertices):
   for i in range(1,len(polygon)-1):
    face=[polygon[0],polygon[i],polygon[i+1]]
    if is_cap(obj.name) and (face[1][0]-face[0][0]).cross(face[2][0]-face[0][0]).length<1e-10:continue
    base=len(g['positions'])
    for pt,normal,uv in face:
     g['positions'].append(tuple(pt));g['normals'].append(tuple(normal));g['uv'].append(uv)
    g['faces'].append((base,base+1,base+2));counts['triangles']+=1
 e.to_mesh_clear()
counts['floorCapDeduplication']=cap_audit
for required in ('west-north-slab-edge-2-0-0','west-south-substrate-2-2','west-south-slab-edge-3-2-2'):
 assert required in cap_audit['objects'], f'Expected overlapping cap {required} not found; review source revision'
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
bpy.ops.export_scene.gltf(filepath=str(OUT/'atrium.glb'),export_format='GLB',use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_materials='EXPORT')
public={k:layout[k] for k in ['spawn','escalators','authoredLights','authoredMaterials']}
if 'concourseDetails' in layout:public['concourseDetails']=layout['concourseDetails']
public.update(layoutSha256=hashlib.sha256(LAYOUT.read_bytes()).hexdigest(),coordinateMapping='Unity (x,y,z) -> Three (x,y,-z)')
(OUT/'station.json').write_text(json.dumps(public,separators=(',',':')))
counts.update(batches=len(groups),materials=len(mats),glbBytes=(OUT/'atrium.glb').stat().st_size,sourceSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),layoutSha256=public['layoutSha256'])
REPORT.parent.mkdir(parents=True,exist_ok=True)
REPORT.write_text(json.dumps(counts,indent=2)+'\n')
print('KYOTO_BROWSER_ART_READY',json.dumps(counts),flush=True)
