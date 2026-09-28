"""Replace the imported eastern roof patch from original triangulated source.

UVs and corner normals survive clipping. Blender and native triangles are saved
from the same meshes. The older authored roof still awaits coordinated removal.
"""
import argparse,hashlib,json,struct,shutil,sys
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Matrix,Vector
from mathutils.geometry import barycentric_transform
p=argparse.ArgumentParser(description=__doc__)
for key in ('candidate','source','registration','component','output'):p.add_argument('--'+key,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);sha=lambda b:hashlib.sha256(b).hexdigest()
assert not a.output.exists(),'Choose a new construction candidate'
source=a.source.read_bytes();assert struct.unpack_from('<I',source)[0]==0x46546c67
n,kind=struct.unpack_from('<II',source,12);assert kind==0x4e4f534a;doc=json.loads(source[20:20+n]);size,kind=struct.unpack_from('<II',source,20+n);assert kind==0x004e4942;binary=source[28+n:28+n+size]
registration=json.loads(a.registration.read_text());construction=json.loads((a.component/'report.json').read_text());native=json.loads((a.component/'native-panels.json').read_text())
assert sha(source)==registration['source']['sha256']==construction['source']['sha256']
assert sha((a.component/'native-panels.json').read_bytes())==construction['outputs']['nativePanelsSha256']
layout_bytes=(a.candidate/'station-layout.json').read_bytes();assert sha(layout_bytes)==construction['inputLayoutSha256'];layout=json.loads(layout_bytes)
node=next(n for n in doc['nodes'] if n.get('name')==registration['source']['object']);assert not any(k in node for k in ('matrix','translation','rotation','scale'))
primitives=doc['meshes'][node['mesh']]['primitives'];assert len(primitives)==1;primitive=primitives[0];assert primitive.get('mode',4)==4

def accessor(index):
 row=doc['accessors'][index];assert not row.get('sparse');view=doc['bufferViews'][row['bufferView']];width={'SCALAR':1,'VEC2':2,'VEC3':3}[row['type']];kind={5123:'H',5125:'I',5126:'f'}[row['componentType']];item=struct.calcsize(kind);stride=view.get('byteStride',width*item);offset=view.get('byteOffset',0)+row.get('byteOffset',0)
 return [struct.unpack_from('<'+kind*width,binary,offset+i*stride) for i in range(row['count'])]
positions=accessor(primitive['attributes']['POSITION']);normals=accessor(primitive['attributes']['NORMAL']);uv=accessor(primitive['attributes']['TEXCOORD_0']);indices=[x[0] for x in accessor(primitive['indices'])];assert len(positions)==len(normals)==len(uv)
removed=set(registration['faceIds']);assert removed==set(construction['source']['faceIds']);assert max(removed)<len(indices)//3
source_ids=[i//3 for i in range(0,len(indices),3) if i//3 not in removed];faces=[indices[i*3:i*3+3] for i in source_ids]
verts=[(x,-z,y) for x,y,z in positions];corner_normals=[(x,-z,y) for x,y,z in normals]
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==layout_bytes.decode()
key='municipal-station-frontage-east-'+registration['source']['object'];obj=bpy.data.objects[key];old_index=next(i for i,r in enumerate(layout['panels']) if r['id']==key);old_record=layout['panels'][old_index]
assert obj.matrix_world==Matrix.Identity(4) and not obj.modifiers
assert len(obj.data.materials)==1;material=obj.data.materials[0];assert material.name=='Municipal | North frontage | '+doc['materials'][primitive['material']]['name']
# Verify source texture orientation against existing uncut corners before editing.
source_uv={}
for pos,tex in zip(verts,uv):source_uv.setdefault(tuple(round(v,4) for v in pos),[]).append((tex[0],1-tex[1]))
uv_errors=[]
for poly in obj.data.polygons:
 for li in poly.loop_indices:
  pos=obj.data.vertices[obj.data.loops[li].vertex_index].co;matches=source_uv.get(tuple(round(v,4) for v in pos),[])
  if matches:
   actual=obj.data.uv_layers.active.data[li].uv;uv_errors.append(min((Vector(actual)-Vector(t)).length for t in matches))
assert len(uv_errors)>100;assert max(uv_errors)<1e-4,('Source UV orientation mismatch',max(uv_errors))
mesh=bpy.data.meshes.new(key+' triangulated source');mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bm.verts.index_update();tex_layer=bm.loops.layers.uv.new('UVMap');source_face=bm.faces.layers.int.new('_source_face')
for f in bm.faces:
 f[source_face]=source_ids[f.index]
 for loop in f.loops:
  i=loop.vert.index;loop[tex_layer].uv=(uv[i][0],1-uv[i][1])
zone=layout['architecture']['municipalStationFrontage']['clipZones'];xmin,xmax=zone['eastX'];north=zone['northYMin'];height=zone['heightMin'];assert xmin==39 and xmax==125 and north==18 and height==0
for axis,limit,greater in [(0,xmin,True),(0,xmax,False),(1,north,True),(2,height,True)]:
 co=[0.,0.,0.];co[axis]=limit;nrm=[0.,0.,0.];nrm[axis]=1
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,plane_co=co,plane_no=nrm,clear_outer=not greater,clear_inner=greater)
bm.to_mesh(mesh);bm.free();mesh.update()
custom=[None]*len(mesh.loops);interpolated_normal_lengths=[]
for poly in mesh.polygons:
 original=mesh.attributes['_source_face'].data[poly.index].value;assert original not in removed
 ids=indices[original*3:original*3+3];abc=[Vector(verts[i]) for i in ids];norms=[Vector(corner_normals[i]) for i in ids]
 for li in poly.loop_indices:
  point=mesh.vertices[mesh.loops[li].vertex_index].co;nrm=barycentric_transform(point,*abc,*norms)
  assert 1e-6<nrm.length<1.1,('Invalid source corner normal',original,li,nrm[:]);interpolated_normal_lengths.append(nrm.length);nrm.normalize();custom[li]=nrm
mesh.normals_split_custom_set(custom)
for poly in mesh.polygons:poly.use_smooth=True
obj.data=mesh

def signature(obj):
 mesh=obj.data;v=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',v);t=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',t);return sha(v.tobytes()+t.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
mesh.calc_loop_triangles();triangles=[]
for t in mesh.loop_triangles:
 points=[mesh.vertices[i].co for i in t.vertices]
 if (points[1]-points[0]).cross(points[2]-points[0]).length<2e-12:continue
 triangles.extend(reversed(t.vertices))
row={**old_record,'vertices':[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices],'triangles':triangles,'finishes':[{'appearance':old_record['appearance'],'triangles':triangles}]};layout['panels'][old_index]=row;obj['kyoto_seed']='panels/'+str(old_index);obj['kyoto_geometry_signature']=signature(obj)
# Use the current canopy glass pipeline, with independently named physical IDs.
glass=bpy.data.materials['Glass - placeholder'];glass_record=next(m for m in layout['authoredMaterials'] if m['label']==glass.name)
steel=bpy.data.materials.new('Canopy steel - registered outer frame');steel.use_nodes=True;bs=steel.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.79,.81,.8,1);bs.inputs['Metallic'].default_value=.3;bs.inputs['Roughness'].default_value=.38
steel_record={'id':'registered-roof-outer-steel','label':steel.name,'physical':'roof','linearColor':dict(zip('rgba',[.79,.81,.8,1])),'metallic':.3,'roughness':.38,'alpha':1.};assert not any(m['id']==steel_record['id'] for m in layout['authoredMaterials']);layout['authoredMaterials'].append(steel_record)
collection=bpy.data.collections.new('Registered eastern roof construction');bpy.context.scene.collection.children.link(collection);added=[]
for panel in native['panels']:
 assert not any(r['id']==panel['id'] for r in layout['panels']);is_glass=panel['material']=='glass';name=('canopy-glazing-registered-'+panel['id']) if is_glass else panel['id'];assert bpy.data.objects.get(name) is None
 verts=[(v['x'],v['z'],v['y']) for v in panel['vertices']];tris=[list(reversed(panel['triangles'][i:i+3])) for i in range(0,len(panel['triangles']),3)]
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],tris);m.materials.append(glass if is_glass else steel);m.update();o=bpy.data.objects.new(name,m);collection.objects.link(o);record=glass_record if is_glass else steel_record
 final={**panel,'appearance':record['id']};o['kyoto_surface']=panel['id'];o['kyoto_physical']=panel['material'];o['kyoto_role']=panel['role'];o['kyoto_collision']=True;o['kyoto_seed']='panels/'+str(len(layout['panels']));o['kyoto_geometry_signature']=signature(o);layout['panels'].append(final);added.append(panel['id'])
provenance={'status':'Construction candidate: source frontage patch replaced and eastern outer roof inserted; older authored roof/Skyway await coordinated replacement.','inputLayoutSha256':sha(layout_bytes),'sourceGlbSha256':sha(source),'registrationSha256':sha(a.registration.read_bytes()),'componentGlbSha256':construction['outputs']['glbSha256'],'nativePanelsSha256':construction['outputs']['nativePanelsSha256'],'replacedPanel':key,'excludedSourceFaces':sorted(removed),'clipZones':zone,'oldFrontageTriangles':len(old_record['triangles'])//3,'newFrontageTriangles':len(triangles)//3,'preservedUvSamples':len(uv_errors),'maxExistingUvDifference':max(uv_errors),'sourceCornerNormalsPreserved':True,'interpolatedNormalLengthRange':[min(interpolated_normal_lengths),max(interpolated_normal_lengths)],'addedPanels':added,'limits':['No other frontage panel or source attachment is removed.','The older authored canopy and Skyway remain; this is an intermediate assembly candidate, not visual acceptance.','Roof glass thickness, grid phase and member sizes remain provisional.']}
layout['architecture']['eastRoofSourceInterface']=provenance
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures');text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
report={**provenance,'layoutSha256':sha((a.output/'station-layout.json').read_bytes()),'blenderSha256':sha((a.output/'KyotoAtrium.blend').read_bytes())};(a.output/'interface-rebuild.json').write_text(json.dumps(report,indent=2)+'\n');print('EAST_INTERFACE_READY',json.dumps({k:v for k,v in report.items() if k not in ('addedPanels','excludedSourceFaces')}),flush=True)
