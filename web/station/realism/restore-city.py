"""Restore the attributed municipal exterior into a separate, matching candidate.

The pinned current atrium remains unchanged. Geometry comes from the recovered
local-frame municipal Blender source, not a new interpretation of photographs.
"""
import argparse, hashlib, json, sys, shutil
from pathlib import Path
import bpy
import numpy as np

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--station',type=Path,required=True)
p.add_argument('--layout',type=Path,required=True)
p.add_argument('--city',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected='b04f448471d9d80b341471466f692db5c9afcd3079c7320e02e8e9ceda4d2e64'
if sha(a.city)!=expected:raise ValueError('Review a changed municipal source before restoring it')
if a.output.exists():raise FileExistsError('Use a new candidate directory')
a.output.mkdir(parents=True)
layout=json.loads(a.layout.read_text())
if any(r['id'].startswith('municipal-') for k in ['boxes','panels','beams'] for r in layout[k]):raise ValueError('Municipal geometry already installed')
shutil.copytree(a.layout.parent/'textures',a.output/'textures')
bpy.ops.wm.open_mainfile(filepath=str(a.station.resolve()))
scene=bpy.context.scene
if bpy.data.texts['Kyoto runtime seed.json'].as_string()!=a.layout.read_text():raise ValueError('Station seed and canonical layout differ')
with bpy.data.libraries.load(str(a.city.resolve()),link=False) as (source,target):target.scenes=list(source.scenes)
print('MUNICIPAL_LIBRARY_LOCAL',flush=True)
if len(target.scenes)!=1:raise ValueError('Expected one municipal source scene')
city=target.scenes[0]
conversion=json.loads(city['coordinate_conversion'])
labels={name:entry for f in conversion['files'] for name,entry in f['renamedModels'].items()}
join=json.loads(city['municipal_station_join'])
concourse=next(x for x in layout['panels'] if x['id']=='concourse')
vs=concourse['vertices'];footprint=[min(v['x'] for v in vs),min(v['z'] for v in vs),max(v['x'] for v in vs),max(v['z'] for v in vs)]
if max(abs(x-y) for x,y in zip(footprint,join['footprintXY']))>1e-5:raise ValueError('Rebuild municipal entrance join for changed station footprint')
collection=bpy.data.collections.new('Municipal north plaza and city context');scene.collection.children.link(collection)
objects=sorted([o for o in city.objects if o.type=='MESH'],key=lambda o:o.name)
default=bpy.data.materials.new('Source unassigned material');default.diffuse_color=(.8,.8,.8,1);default.roughness=.5
for obj in objects:
 if not len(obj.data.materials):obj.data.materials.append(default)
 for i,mat in enumerate(obj.data.materials):
  if mat is None:obj.data.materials[i]=default
materials={m for o in objects for m in o.data.materials if m}
records={};textures={};counts={'objects':0,'triangles':0,'removedZeroAreaTriangles':0,'materials':len(materials)}
def image_ref(im,usage):
 if not im or not im.packed_file:raise ValueError('Missing packed municipal texture')
 raw=bytes(im.packed_file.data);digest=hashlib.sha256(raw).hexdigest()
 ext='.jpg' if raw.startswith(b'\xff\xd8') else '.png' if raw.startswith(b'\x89PNG') else None
 if not ext:raise ValueError('Unexpected image encoding: '+im.name)
 filename=digest[:24]+ext
 if filename in textures and textures[filename]['usage']!=usage:raise ValueError('Texture has conflicting color spaces')
 (a.output/'textures'/filename).write_bytes(raw)
 textures[filename]={'file':filename,'sha256':digest,'bytes':len(raw),'size':list(im.size),'usage':usage}
 return 'AtriumTextures/'+Path(filename).stem
for m in sorted(materials,key=lambda m:m.name):
 old=m.name;m.name='Municipal | '+old
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None
 color=list(bs.inputs['Base Color'].default_value) if bs else list(m.diffuse_color)
 key='municipal-material-'+hashlib.sha256(old.encode()).hexdigest()[:16]
 row={'id':key,'label':m.name,'physical':'stone','linearColor':dict(zip('rgba',color)),'metallic':float(bs.inputs['Metallic'].default_value) if bs else m.metallic,'roughness':float(bs.inputs['Roughness'].default_value) if bs else m.roughness,'alpha':float(bs.inputs['Alpha'].default_value) if bs else color[3]}
 if bs:
  if bs.inputs['Alpha'].is_linked:raise ValueError('Inspect municipal alpha graph: '+old)
  if bs.inputs['Base Color'].is_linked:
   node=bs.inputs['Base Color'].links[0].from_node
   if node.type!='TEX_IMAGE':raise ValueError('Inspect municipal color graph: '+old)
   row['albedo']=image_ref(node.image,'color');row['linearColor']=dict.fromkeys('rgba',1.)
  if bs.inputs['Normal'].is_linked:
   node=bs.inputs['Normal'].links[0].from_node
   if node.type!='NORMAL_MAP' or not node.inputs['Color'].is_linked:raise ValueError('Inspect municipal normal graph: '+old)
   row['normal']=image_ref(node.inputs['Color'].links[0].from_node.image,'normal');row['normalScale']=float(node.inputs['Strength'].default_value)
  if bs.inputs['Roughness'].is_linked:
   node=bs.inputs['Roughness'].links[0].from_node
   if node.type!='MATH' or node.operation!='SUBTRACT' or not node.inputs[1].is_linked:raise ValueError('Inspect municipal roughness graph: '+old)
   im=node.inputs[1].links[0].from_node.image
   row['mask']=image_ref(im,'linear')
 records[m.name]=row;layout['authoredMaterials'].append(row)

def signature(o):
 v=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',v)
 t=np.empty(len(o.data.loops),dtype=np.int32);o.data.loops.foreach_get('vertex_index',t)
 return hashlib.sha256(v.tobytes()+t.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes()).hexdigest()

print('MUNICIPAL_MATERIALS',len(materials),'unique textures',len(textures),flush=True)
bounds=[];parts=[]
for obj in objects:
 if obj.name not in labels:raise ValueError('Unidentified municipal object: '+obj.name)
 if obj.modifiers:raise ValueError('Evaluate municipal modifiers explicitly')
 matrix=obj.matrix_world.copy();name=obj.name;label=labels[name]['originalLabel']
 ground=name.startswith(('municipal-plaza-','municipal-road-'));fixture=name.startswith('municipal-fixture-')
 physical='grass' if label=='植栽' else 'asphalt' if label=='車道部' else 'stone' if ground else 'facade'
 role='municipal-ground' if ground else 'municipal-building'
 if fixture:physical=obj['physical'];role=obj['role']
 mesh=obj.data;mesh.calc_loop_triangles();world=[matrix@v.co for v in mesh.vertices]
 triangles=[];finishes={}
 for t in mesh.loop_triangles:
  pts=[world[i] for i in t.vertices]
  if (pts[1]-pts[0]).cross(pts[2]-pts[0]).length<2e-12:counts['removedZeroAreaTriangles']+=1;continue
  indices=list(t.vertices) if matrix.determinant()<0 else list(reversed(t.vertices))
  triangles.extend(indices)
  mat=mesh.materials[t.material_index] if len(mesh.materials) else None
  if not mat:raise ValueError('Unassigned municipal material: '+name)
  finishes.setdefault(records[mat.name]['id'],[]).extend(indices)
 if not triangles:continue
 obj.parent=None;obj.matrix_world=matrix;collection.objects.link(obj)
 obj['kyoto_surface']=name;obj['kyoto_physical']=physical;obj['kyoto_role']=role;obj['kyoto_collision']=True
 row={'id':name,'vertices':[dict(x=float(v.x),y=float(v.z),z=float(v.y)) for v in world],'triangles':triangles,'material':physical,'role':role,'collision':True,'appearance':next(iter(finishes)),'finishes':[{'appearance':k,'triangles':v} for k,v in finishes.items()]}
 obj['kyoto_seed']='panels/'+str(len(layout['panels']));obj['kyoto_geometry_signature']=signature(obj)
 layout['panels'].append(row);counts['objects']+=1;counts['triangles']+=len(triangles)//3
 b=[[min(v[i] for v in world),max(v[i] for v in world)] for i in range(3)];bounds.append(b)
 parts.append({'id':name,'label':label,'physical':physical,'role':role,'triangles':len(triangles)//3,'boundsBlender':b})
bpy.data.scenes.remove(city)
layout['architecture']['cityContext']={'source':'https://data.city.kyoto.lg.jp/resource/?id=21224','license':'CC BY 4.0','attribution':'Kyoto City, CC BY 4.0. Selected buildings, ground and shelters; local coordinate conversion; original entrance join and authored ground finishes retained.','sourceSha256':expected,'status':'Restored candidate: geometry installed; photographic alignment, native joins and performance acceptance pending','frame':conversion['frame'],'stationRootExcluded':3520856608,'parts':counts['objects'],'triangles':counts['triangles']}
layout['architecture']['northForecourt']={'source':'https://data.city.kyoto.lg.jp/resource/?id=21224','status':'Restored candidate; current-station native verification pending','entranceTransitionWidthM':join['transitionWidthM'],'footprintXY':footprint,'limits':['Source agreement is not survey accuracy.','Existing Stone Museum fixtures require overlap review.','The selected source does not complete the southern plaza.']}
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
# Text.write inserts characters individually and is quadratic for a huge line.
# Bulk loading preserves the exact canonical bytes and finishes in linear time.
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json'])
seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True)
seed.name='Kyoto runtime seed.json'
if seed.as_string()!=text:raise ValueError('Embedded seed differs after bulk load')
print('MUNICIPAL_SEED_LOADED',len(text),flush=True)
scene['municipal_restoration_source_sha256']=expected
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
report={'status':'Candidate generated; runtime/visual/performance checks pending','stationSourceSha256':sha(a.station),'baselineLayoutSha256':sha(a.layout),'layoutSha256':sha(a.output/'station-layout.json'),'sourceSha256':sha(a.output/'KyotoAtrium.blend'),'municipalSourceSha256':expected,'counts':counts,'textures':list(textures.values()),'parts':parts,'frame':conversion['frame'],'entranceFootprintXY':footprint}
(a.output/'restoration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('RESTORED_CITY',json.dumps(counts),'textures',len(textures),'textureBytes',sum(t['bytes'] for t in textures.values()),flush=True)
