"""Reproducible structural candidates; never overwrites canonical assets.
blender -b SOURCE.blend --python tools/repair_atrium_structure.py -- --issue gaps --output artifacts/k007/candidate
The canonical records outside this bounded repair are copied byte-equivalently
as JSON values. New colliders and preview overlay come from the same meshes.
"""
import argparse,bpy,json,sys,hashlib,math
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--issue',choices=['gaps','escalators','tactile'],required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--metadata',type=Path,default=Path('web/public/assets/atrium-detail.json'));p.add_argument('--layout',type=Path,default=Path('runtime/station-layout.json'))
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=a.output.resolve()
if out.exists():raise FileExistsError('Use a fresh candidate directory')
out.mkdir(parents=True)
source=Path(bpy.data.filepath);source_sha=hashlib.sha256(source.read_bytes()).hexdigest();layout=json.loads(a.layout.read_text());original_ids={o['id'] for k in ('boxes','panels','beams')for o in layout[k]}
created=[];removed=[]
collection=bpy.data.collections.new('Fleet '+a.issue+' structural repair');bpy.context.scene.collection.children.link(collection)
materials={m.name:m for m in bpy.data.materials};records={m['label']:m for m in layout['authoredMaterials']}
def material_like(name):
 obj=bpy.data.objects[name];return obj.data.materials[0]
def mesh(name,vertices,faces,material,physical='stone',collision=True,smooth=False):
 if name in bpy.data.objects:raise ValueError('Repair already applied: '+name)
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
 obj=bpy.data.objects.new(name,data);collection.objects.link(obj);data.materials.append(material)
 obj['kyoto_surface']=name;obj['kyoto_physical']=physical;obj['kyoto_collision']=collision;obj['kyoto_role']='landing' if a.issue=='gaps' else 'escalator-body'
 obj['inference']='Bounded fleet '+a.issue+' repair; native metres; matching collision and visible mesh.'
 for f in data.polygons:f.use_smooth=smooth
 created.append(obj);return obj
def native(p):return (p[0],p[2],p[1])
def box(name,bounds,material,physical='stone',collision=True):
 x0,x1,y0,y1,z0,z1=bounds
 verts=[native((x,y,z))for x,y,z in [(x0,y0,z0),(x0,y0,z1),(x0,y1,z0),(x0,y1,z1),(x1,y0,z0),(x1,y0,z1),(x1,y1,z0),(x1,y1,z1)]]
 # Reversed from native winding because Blender/native mapping reflects Y/Z.
 faces=[tuple(reversed(f))for f in [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]]
 return mesh(name,verts,faces,material,physical,collision)
if a.issue=='gaps':
 material=material_like('east-ground-second-landing')
 # Casing outer edges are lane centre +/- (width/2+.05). Retain actual
 # moving-step channels; infill only the three missing architectural strips.
 for label,z0,z1 in [('south',5.65,5.94),('middle',7.06,7.39),('north',8.51,9.4)]:
  box('east-lower-runout-apron-'+label,(28.6,29.5,4.9,5.5,z0,z1),material)
 for lane in layout['escalators']:
  if lane['id'] not in ('east-concourse-lower-escalator-1','east-concourse-lower-escalator-2'):continue
  c=Vector(tuple(lane['lowerCenter'][k]for k in 'xyz'));u=Vector(tuple(lane['uphill'][k]for k in 'xyz'));side=Vector((u.z,0,-u.x))
  pitch=sum((Vector(tuple(b[k]for k in 'xyz'))-Vector(tuple(a[k]for k in 'xyz'))).length for a,b in zip(lane['path'],lane['path'][1:]))/lane['stepCount']
  overlap=pitch/2+.06
  for end in ['lower','upper']:
   z0,z1,y=(-lane['flatLength']-.02,-lane['flatLength']+overlap,0) if end=='lower' else (lane['run']+lane['flatLength']-overlap,lane['run']+lane['flatLength']+.02,lane['height'])
   half=lane['width']/2+.05
   points=[c+side*x+Vector((0,h,0))+u*z for x,h,z in [(-half,y-.035,z0),(-half,y-.035,z1),(-half,y+.002,z0),(-half,y+.002,z1),(half,y-.035,z0),(half,y-.035,z1),(half,y+.002,z0),(half,y+.002,z1)]]
   faces=[tuple(reversed(f))for f in [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]]
   mesh(lane['id']+'-'+end+'-comb-transfer',[native(p)for p in points],faces,materials['Atrium | satin gate stainless steel'],'steel')
elif a.issue=='escalators':
 sys.path.insert(0,str(Path(__file__).resolve().parent))
 from repair_escalator_ends import build
 removed,envelopes=build(layout,mesh,materials)
 (out/'envelopes.json').write_text(json.dumps(envelopes,indent=2)+'\n')
else:
 sys.path.insert(0,str(Path(__file__).resolve().parent))
 from build_tactile_contact import build
 patches=build(layout,mesh,materials,a.metadata)
 records={m['label']:m for m in layout['authoredMaterials']}
 (out/'tactile-profile.json').write_text(json.dumps(patches,indent=2)+'\n')
bpy.context.view_layer.update()
def export_panel(obj):
 me=obj.data;me.calc_loop_triangles();verts=[];normals=[];triangles=[];shared={}
 # Preserve exact evaluated corner normals, but share equal corners instead
 # of expanding every triangle. This keeps curved-rail candidates lightweight.
 import numpy as np
 positions=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',positions);positions=positions.reshape((-1,3))
 normal_data=np.empty(len(me.corner_normals)*3,dtype=np.float32);me.corner_normals.foreach_get('vector',normal_data);normal_data=normal_data.reshape((-1,3))
 loops=np.empty(len(me.loops),dtype=np.int32);me.loops.foreach_get('vertex_index',loops)
 for t in me.loop_triangles:
  for li in reversed(t.loops):
   vi=int(loops[li]);n=normal_data[li];key=(vi,*map(float,n))
   index=shared.get(key)
   if index is None:
    index=len(verts);shared[key]=index;pt=positions[vi]
    verts.append(dict(zip('xyz',map(float,(pt[0],pt[2],pt[1])))));normals.append(dict(zip('xyz',map(float,(n[0],n[2],n[1])))))
   triangles.append(index)
 mat=obj.data.materials[0];rec=records.get(mat.name)
 if rec is None:raise ValueError('Material not present in canonical appearance records: '+mat.name)
 return {'id':obj.name,'material':obj['kyoto_physical'],'role':obj['kyoto_role'],'vertices':verts,'normals':normals,'triangles':triangles,'uv':[{'x':v['x']/2.4,'y':v['z']/2.4}for v in verts],'collision':obj['kyoto_collision'],'appearance':rec['id'],'finishes':[],'playerOnly':False,'ballStairs':False}
for obj in created:layout['panels'].append(export_panel(obj))
# Only a candidate copy is saved; preserve the input and all release pack files.
blend=out/'KyotoAtrium.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend),check_existing=False)
layout['blenderSource']={'path':str(blend),'sha256':hashlib.sha256(blend.read_bytes()).hexdigest(),'geometryAuthority':'Bounded structural patch from matched Blender meshes; canonical records otherwise preserved'}
layout_file=out/'station-layout.json';layout_file.write_text(json.dumps(layout,separators=(',',':'))+'\n')
# Export just the added meshes as a review overlay, not a replacement full atrium.
for obj in bpy.context.selected_objects:obj.select_set(False)
for obj in created:obj.select_set(True)
bpy.context.view_layer.objects.active=created[0]
bpy.ops.export_scene.gltf(filepath=str(out/'repair-overlay.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_extras=True)
report={'issue':a.issue,'inputSourceSha256':source_sha,'inputLayoutSha256':hashlib.sha256(a.layout.read_bytes()).hexdigest(),'added':[o.name for o in created],'removed':removed,'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in [blend,layout_file,out/'repair-overlay.glb']}}
(out/'candidate.json').write_text(json.dumps(report,indent=2)+'\n');print('CANDIDATE_READY',json.dumps(report),flush=True)
