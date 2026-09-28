"""Restore the north facade around the central opening from registered municipal geometry.

Retain the current playable interior and outer wings. Clip source geometry to
the north frontage; these limits are integration seams, not surveyed joints.
Both visible meshes and native panels use the same resulting triangles.
"""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser(description=__doc__)
for key in ['candidate','shell','inventory','output']:p.add_argument('--'+key,type=Path,required=True)
p.add_argument('--west-inner-x',type=float,default=-53.6)
p.add_argument('--east-inner-x',type=float,default=40.5)
p.add_argument('--replace-west-pier',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if a.output.exists():raise FileExistsError('Choose a fresh candidate directory')
meta=json.loads((a.inventory/'metadata.json').read_text());objects=json.loads((a.inventory/'objects.json').read_text())
assert sha(a.shell)=='34ebbd14cc05debdd8e07896622b71ab8e915686550c1ba3c971336ed07db149', 'Review changed municipal source before restoring frontage'
assert -53.6<=a.west_inner_x<=-52 and 38.5<=a.east_inner_x<=40.5, 'Review source before extending into the central roof'
root=meta['root'];names={root}
while True:
 next_names=names|{o['name'] for o in objects if o['parent'] in names}
 if next_names==names:break
 names=next_names
assert len(names)==meta['meshes']+1==1038
layout=json.loads((a.candidate/'station-layout.json').read_text())
assert not any(p['id'].startswith('municipal-station-frontage-') for p in layout['panels'])
# Shared outer seams join the previously restored municipal wings.
wall=next(b for b in layout['boxes'] if b['id']=='west-north-west-return-0')
west=wall['center']['x']-wall['size']['x']/2
concourse=next(p for p in layout['panels'] if p['id']=='concourse');east=max(v['x'] for v in concourse['vertices'])
assert abs(west+169.477757)<1e-5 and east==125
frame=layout['architecture']['cityContext']['frame'];source_frame=meta['coordinateConversion']['frame']
for k in ['projectedOriginXY','referenceElevationM','localXYFromProjectedXY']:assert frame[k]==source_frame[k]
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==(a.candidate/'station-layout.json').read_text()
removed=[]
if a.replace_west_pier:
 assert a.west_inner_x>=-52.4, 'Restore the complete source inner return before removing its superseded pier'
 key='west-north-terminal-pier';old=[b for b in layout['boxes'] if b['id']==key]
 assert len(old)==1 and bpy.data.objects.get(key) is not None
 # The broad draft pier protruded through the clipped source inner return.
 # Remove its visible and collision instances together; do not hide one side.
 removed=old;layout['boxes']=[b for b in layout['boxes'] if b['id']!=key]
 bpy.data.objects.remove(bpy.data.objects[key],do_unlink=True)
requested=sorted(names)
with bpy.data.libraries.load(str(a.shell.resolve()),link=False) as (_,target):target.objects=list(requested)
loaded=dict(zip(requested,target.objects));scene=bpy.context.scene
for obj in loaded.values():scene.collection.objects.link(obj)
bpy.context.view_layer.update();print('SHELL_LOADED',len(loaded),flush=True)
collection=bpy.data.collections.new('Registered municipal north station frontage');scene.collection.children.link(collection)
new=[];parts=[]
for original,obj in loaded.items():
 if obj.type!='MESH':continue
 if obj.modifiers:raise ValueError('Unexpected source modifier '+original)
 matrix=obj.matrix_world.copy();bounds=[matrix@Vector(v) for v in obj.bound_box]
 # Leave the central glazed opening for coordinated roof/Skyway correction.
 # Inner X limits must include the whole source return wall. The original
 # -53.6/40.5 trial clipped those walls; -52.4/39 restores their full width.
 for side,xmin,xmax in [('west',west,a.west_inner_x),('east',a.east_inner_x,east)]:
  if max(v.x for v in bounds)<xmin or min(v.x for v in bounds)>xmax or max(v.y for v in bounds)<18:continue
  bm=bmesh.new();bm.from_mesh(obj.data);bm.transform(matrix)
  for axis,limit,keep_greater in [(0,xmin,True),(0,xmax,False),(1,18,True),(2,0,True)]:
   co=[0,0,0];co[axis]=limit;normal=[0,0,0];normal[axis]=1
   bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,plane_co=co,plane_no=normal,clear_outer=not keep_greater,clear_inner=keep_greater)
  if not bm.faces:bm.free();continue
  name='municipal-station-frontage-'+side+'-'+original.replace(' ','-')
  mesh=bpy.data.meshes.new(name);bm.to_mesh(mesh);bm.free();mesh.update();mesh.calc_loop_triangles()
  if not mesh.loop_triangles:bpy.data.meshes.remove(mesh);continue
  for m in obj.data.materials:mesh.materials.append(m)
  if not len(mesh.materials) or any(m is None for m in mesh.materials):raise ValueError('Unassigned shell material '+name)
  points=[v.co for v in mesh.vertices]
  assert min(v.x for v in points)>=xmin-2e-4 and max(v.x for v in points)<=xmax+2e-4 and min(v.y for v in points)>=18-2e-4
  clone=bpy.data.objects.new(name,mesh);collection.objects.link(clone);new.append(clone)
  parts.append({'id':name,'sourceObject':original,'side':side,'boundsBlender':[[min(v[k] for v in points),max(v[k] for v in points)] for k in range(3)]})
for o in loaded.values():bpy.data.objects.remove(o,do_unlink=True)
materials={m for o in new for m in o.data.materials};records={};textures={}
def image_ref(im):
 if not im.packed_file:raise ValueError('Unpacked shell texture '+im.name)
 data=bytes(im.packed_file.data);ext='.jpg' if data.startswith(b'\xff\xd8') else '.png' if data.startswith(b'\x89PNG') else None
 if not ext:raise ValueError('Unsupported shell texture')
 digest=hashlib.sha256(data).hexdigest();file=digest[:24]+ext;(a.output/'textures'/file).write_bytes(data)
 textures[file]={'file':file,'sha256':digest,'size':list(im.size),'bytes':len(data)}
 return 'AtriumTextures/'+Path(file).stem
for m in sorted(materials,key=lambda m:m.name):
 old=m.name;m.name='Municipal | North frontage | '+old
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None
 color=list(bs.inputs['Base Color'].default_value) if bs else list(m.diffuse_color)
 row={'id':'municipal-station-frontage-material-'+hashlib.sha256(old.encode()).hexdigest()[:16],'label':m.name,'physical':'facade','linearColor':dict(zip('rgba',color)),'metallic':float(bs.inputs['Metallic'].default_value) if bs else m.metallic,'roughness':float(bs.inputs['Roughness'].default_value) if bs else m.roughness,'alpha':float(bs.inputs['Alpha'].default_value) if bs else color[3]}
 if bs:
  for k in ['Alpha','Roughness','Metallic','Normal']:
   if bs.inputs[k].is_linked:raise ValueError('Inspect linked shell material '+old+': '+k)
  if bs.inputs['Base Color'].is_linked:
   node=bs.inputs['Base Color'].links[0].from_node
   if node.type!='TEX_IMAGE':raise ValueError('Inspect source color graph '+old)
   row['albedo']=image_ref(node.image);row['linearColor']=dict.fromkeys('rgba',1.)
 records[m.name]=row;layout['authoredMaterials'].append(row)
bpy.context.view_layer.update();count=0
for obj,part in zip(new,parts):
 mesh=obj.data;mesh.calc_loop_triangles();triangles=[];finishes={}
 for t in mesh.loop_triangles:
  vs=[mesh.vertices[i].co for i in t.vertices]
  if (vs[1]-vs[0]).cross(vs[2]-vs[0]).length<2e-12:continue
  ids=list(reversed(t.vertices));triangles.extend(ids);finishes.setdefault(records[mesh.materials[t.material_index].name]['id'],[]).extend(ids)
 assert triangles
 row={'id':obj.name,'vertices':[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices],'triangles':triangles,'material':'facade','role':'municipal-station-north-frontage','collision':True,'appearance':next(iter(finishes)),'finishes':[{'appearance':k,'triangles':v} for k,v in finishes.items()]}
 obj['kyoto_surface']=obj.name;obj['kyoto_physical']='facade';obj['kyoto_role']=row['role'];obj['kyoto_collision']=True;obj['kyoto_seed']='panels/'+str(len(layout['panels']))
 v=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',v);t=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',t)
 obj['kyoto_geometry_signature']=hashlib.sha256(v.tobytes()+t.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes()).hexdigest()
 layout['panels'].append(row);count+=len(triangles)//3;part['triangles']=len(triangles)//3
provenance={'source':'https://data.city.kyoto.lg.jp/resource/?id=21224','license':'CC BY 4.0','attribution':'Kyoto City. North station facade selected and clipped by Kyoto Bounce; retained local coordinate frame.','sourceBlenderSha256':sha(a.shell),'municipalRootId':3520856608,'blenderRoot':root,'clipZones':{'westX':[west,a.west_inner_x],'eastX':[a.east_inner_x,east],'northYMin':18,'heightMin':0},'removedSupersededBoxes':removed,'objects':len(new),'triangles':count,'status':'Candidate: north facade added, source-plane/photo/native checks pending','limits':['Clipping planes are work seams, not surveyed architectural joints.','Current interior and roof remain; source-derived facade joins and occluded old surfaces require integration review.','Source facade textures are a coarse baseline; close architectural detail and current tenant checks remain required.','Southern rail complex and Hachijo remain incomplete.']}
layout['architecture']['municipalStationFrontage']=provenance
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json';assert seed.as_string()==text
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
report={**provenance,'inputLayoutSha256':sha(a.candidate/'station-layout.json'),'layoutSha256':sha(a.output/'station-layout.json'),'sourceSha256':sha(a.output/'KyotoAtrium.blend'),'parts':parts,'textures':list(textures.values())}
(a.output/'frontage-restoration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('STATION_FRONTAGE_READY',len(new),count,'triangles',len(textures),'textures',flush=True)
