"""Retire selected canopy faces and detached ties, preserving retained source corners."""
import bpy,json,sys,hashlib,math,copy
from pathlib import Path
import numpy as np
base_path,component=map(Path,sys.argv[sys.argv.index('--')+1:]);assert Path('.local').resolve()in component.resolve().parents
base=json.loads(base_path.read_text());spec=json.loads((component/'spec.json').read_text());raw=Path(base['layout']).read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(raw)==base['layoutSha256']==spec['parentLayoutSha256'];old=json.loads(raw);new=copy.deepcopy(old);cuts={p['id']:set(f['index']for f in p['faces'])for p in spec['panelCuts']}
for p in new['panels']:
 if p['id']not in cuts:continue
 assert len(p['finishes'])==1 and p['finishes'][0]['triangles']==p['triangles']
 p['triangles']=[v for i in range(len(p['triangles'])//3)if i not in cuts[p['id']]for v in p['triangles'][3*i:3*i+3]]
 p['finishes'][0]['triangles']=p['triangles']
new['beams']=[p for p in new['beams']if p['id']not in spec['retiredBeams']];new['boxes']=[p for p in new['boxes']if p['id']not in spec['retiredBoxes']]
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==raw.decode()
objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects};panels={p['id']:p for p in old['panels']};surfaces=[];expect={}
def point(o,v):
 p=o.matrix_world@v;return [p.x,p.z,-p.y]
def signature(o):
 vs=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',vs);loops=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
def record(o,poly,id):
 return dict(id=id,label=o.data.materials[poly.material_index].name,points=[point(o,o.data.vertices[i].co)for i in poly.vertices])
def corners(o,faces=None):
 m=o.data;uv=m.uv_layers.active;faces=m.polygons if faces is None else faces;return [dict(points=[tuple(m.vertices[m.loops[i].vertex_index].co)for i in (p.loops if hasattr(p,'loops')else p.loop_indices)],uv=[tuple(uv.data[i].uv)for i in (p.loops if hasattr(p,'loops')else p.loop_indices)]if uv else None,normals=[tuple(m.corner_normals[i].vector)for i in (p.loops if hasattr(p,'loops')else p.loop_indices)],authored=[tuple(m.attributes['kyoto_authored_normal'].data[i].vector)for i in (p.loops if hasattr(p,'loops')else p.loop_indices)]if 'kyoto_authored_normal'in m.attributes else None)for p in faces]
for id,indices in cuts.items():
 o=objects[id];m=o.data;p=panels[id];m.calc_loop_triangles();faces=list(m.loop_triangles);assert len(faces)==len(p['triangles'])//3,(id,len(faces),len(p['triangles'])//3)
 for i,poly in enumerate(faces):
  actual=sorted(point(o,m.vertices[k].co)for k in poly.vertices);wanted=sorted([p['vertices'][k]['x'],p['vertices'][k]['y'],-p['vertices'][k]['z']]for k in p['triangles'][3*i:3*i+3])
  assert len(actual)==3 and max(abs(a-b)for v,w in zip(actual,wanted)for a,b in zip(v,w))<.00002,(id,i)
 before=corners(o,faces);keep=[i for i in range(len(faces))if i not in indices];expect[id]=[before[i]for i in keep]
 surfaces.extend(record(o,faces[i],id)for i in sorted(indices))
 mesh=bpy.data.meshes.new(id+' repaired');mesh.from_pydata([tuple(v.co)for v in m.vertices],[],[list(faces[i].vertices)for i in keep]);mesh.update()
 for mat in m.materials:mesh.materials.append(mat)
 if m.uv_layers.active:
  uv=mesh.uv_layers.new(name=m.uv_layers.active.name)
  for poly,row in zip(mesh.polygons,expect[id]):
   for li,value in zip(poly.loop_indices,row['uv']):uv.data[li].uv=value
 if 'kyoto_authored_normal'in m.attributes:
  a=mesh.attributes.new('kyoto_authored_normal','FLOAT_VECTOR','CORNER')
  for poly,row in zip(mesh.polygons,expect[id]):
   for li,value in zip(poly.loop_indices,row['authored']):a.data[li].vector=value
 for poly,i in zip(mesh.polygons,keep):poly.material_index=faces[i].material_index;poly.use_smooth=m.polygons[faces[i].polygon_index].use_smooth
 mesh.normals_split_custom_set([n for row in expect[id]for n in row['normals']]);o.data=mesh;o['kyoto_geometry_signature']=signature(o)
removed=spec['retiredBeams']+spec['retiredBoxes']
for id in removed:
 o=objects[id];assert o.type=='MESH' and not o.modifiers and not o.children
 surfaces.extend(record(o,p,id)for p in o.data.polygons);bpy.data.objects.remove(o,do_unlink=True)
for group in ('beams','boxes'):
 lookup={p['id']:i for i,p in enumerate(new[group])}
 for o in bpy.data.objects:
  if o.get('kyoto_seed','').startswith(group+'/'):
   id=o.get('kyoto_surface',o.name);assert id in lookup;o['kyoto_seed']=group+'/'+str(lookup[id])
out=component/'source';out.mkdir(exist_ok=True);newraw=json.dumps(new,separators=(',',':'))+'\n';(out/'station-layout.json').write_text(newraw)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json'])
seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
bpy.ops.wm.open_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==newraw
objects={o.get('kyoto_surface',o.name):o for o in bpy.data.objects};assert not any(id in objects for id in removed);max_normal=0
for id,expected in expect.items():
 actual=corners(objects[id]);assert len(actual)==len(expected)
 for a,b in zip(actual,expected):
  assert a['points']==b['points'] and a['uv']==b['uv'] and a['authored']==b['authored']
  for u,v in zip(a['normals'],b['normals']):
   error=math.sqrt(sum((x-y)**2 for x,y in zip(u,v)));max_normal=max(max_normal,error);assert error<.001,(id,error)
# Some flight handrails are generated from native records rather than stored as
# individually seeded Blender objects. Validate every actual source binding.
for o in bpy.data.objects:
 seed=o.get('kyoto_seed','');group,_,index=seed.partition('/')
 if group in ('panels','beams','boxes'):
  assert new[group][int(index)]['id']==o.get('kyoto_surface',o.name),(group,o.name)
for id in cuts:assert objects[id]['kyoto_seed']=='panels/'+str(next(i for i,p in enumerate(new['panels'])if p['id']==id))
proof=dict(parentSourceSha256=sha(Path(base['sourceScene']).read_bytes()),sourceSha256=sha((out/'KyotoAtrium.blend').read_bytes()),layoutSha256=sha(newraw.encode()),modifiedPanels=list(cuts),removedObjects=removed,removedPanelFaces=sum(len(v)for v in cuts.values()),savedGeometryUVsExact=True,savedAuthoredNormalsExact=True,maximumPreviewNormalError=max_normal,retainedBindingsMatch=True)
proof['pass']=True
(component/'retired-surfaces.json').write_text(json.dumps(surfaces)+'\n');(component/'source-installation.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof),flush=True)
