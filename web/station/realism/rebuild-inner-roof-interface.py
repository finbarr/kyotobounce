"""Replace only the opaque inner-roof polygons covered by the registered canopy.
Rebuild both imported frontage meshes from original UVs and normals. Preserve all
uncovered facade fragments, return walls, and unrelated station records.
"""
import argparse,hashlib,json,shutil,struct,sys
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix
from mathutils.geometry import barycentric_transform
p=argparse.ArgumentParser(description=__doc__)
for k in ('candidate','source','mask','check','output'):p.add_argument('--'+k,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists(),'Use a fresh candidate directory'
sha=lambda b:hashlib.sha256(b).hexdigest()
source=a.source.read_bytes();mask_bytes=a.mask.read_bytes();check_bytes=a.check.read_bytes();mask=json.loads(mask_bytes);check=json.loads(check_bytes)
layout_bytes=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(layout_bytes)
assert sha(layout_bytes)=='8b08cb0aa24b5d26804dc739f7e23ff31784c1fd4ac21561a84952eb0361cca7'
assert sha(source)==mask['sourceSha256']==check['sourceSha256'];assert sha(mask_bytes)==check['maskSha256']
assert check['summary']=={'samples':10725,'failures':0,'conflictsCovered':2,'conflictsRetained':1}
size,kind=struct.unpack_from('<II',source,12);assert kind==0x4e4f534a;doc=json.loads(source[20:20+size]);binary_size,kind=struct.unpack_from('<II',source,20+size);assert kind==0x004e4942;binary=source[28+size:28+size+binary_size]
node=next(n for n in doc['nodes'] if n.get('name')=='Untitled.200');assert not any(k in node for k in ('matrix','translation','rotation','scale'));primitives=doc['meshes'][node['mesh']]['primitives'];assert len(primitives)==1;primitive=primitives[0]
def accessor(i):
 r=doc['accessors'][i];v=doc['bufferViews'][r['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3}[r['type']];k={5123:'H',5125:'I',5126:'f'}[r['componentType']];stride=v.get('byteStride',w*struct.calcsize(k));offset=v.get('byteOffset',0)+r.get('byteOffset',0);assert not r.get('sparse')
 return [struct.unpack_from('<'+k*w,binary,offset+n*stride) for n in range(r['count'])]
positions=accessor(primitive['attributes']['POSITION']);normals=accessor(primitive['attributes']['NORMAL']);uvs=accessor(primitive['attributes']['TEXCOORD_0']);indices=[x[0] for x in accessor(primitive['indices'])]
source_verts=[(x,-z,y) for x,y,z in positions];source_normals=[(x,-z,y) for x,y,z in normals];assert len(source_verts)==len(source_normals)==len(uvs)
masked={r['face']:r for r in mask['rows']};assert len(masked)==33
for face,row in masked.items():assert row['originalPoints']==[list(positions[i]) for i in indices[face*3:face*3+3]]
zone=layout['architecture']['municipalStationFrontage']['clipZones'];assert zone=={'westX':[-169.477757,-52.4],'eastX':[39.0,125.0],'northYMin':18,'heightMin':0}
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==layout_bytes.decode()
def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs);loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
def construct(side,apply_mask,material):
 vertices=list(source_verts);faces=[];source_ids=[]
 for face in range(len(indices)//3):
  if apply_mask and face in masked:
   for poly in masked[face]['remaining']:
    points=[(x,-z,y) for x,y,z in poly['points']];base=len(vertices);vertices.extend(points)
    for i in range(1,len(points)-1):
     abc=[Vector(points[j]) for j in [0,i,i+1]]
     if (abc[1]-abc[0]).cross(abc[2]-abc[0]).length<=2e-12:continue
     faces.append([base,base+i,base+i+1]);source_ids.append(face)
  else:faces.append(indices[face*3:face*3+3]);source_ids.append(face)
 mesh=bpy.data.meshes.new('Inner roof source interface '+side);mesh.from_pydata(vertices,[],faces);mesh.materials.append(material);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);layer=bm.faces.layers.int.new('_source_face')
 for f in bm.faces:f[layer]=source_ids[f.index]
 xmin,xmax=zone[side+'X']
 for axis,limit,greater in [(0,xmin,True),(0,xmax,False),(1,zone['northYMin'],True),(2,zone['heightMin'],True)]:
  co=[0.,0.,0.];co[axis]=limit;normal=[0.,0.,0.];normal[axis]=1
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,plane_co=co,plane_no=normal,clear_outer=not greater,clear_inner=greater)
 bm.to_mesh(mesh);bm.free();mesh.update();areas={}
 for f in mesh.polygons:
  source_id=mesh.attributes['_source_face'].data[f.index].value;areas[source_id]=areas.get(source_id,0)+f.area
 return mesh,areas
replaced=[]
for side in ('west','east'):
 key='municipal-station-frontage-'+side+'-Untitled.200';obj=bpy.data.objects[key];old_index=next(i for i,r in enumerate(layout['panels']) if r['id']==key);old=layout['panels'][old_index]
 assert obj.matrix_world==Matrix.Identity(4) and not obj.modifiers and len(obj.data.materials)==1
 material=obj.data.materials[0];appearance=next(m for m in layout['authoredMaterials'] if m['id']==old['appearance']);assert material.name==appearance['label']
 # Blender import suffixes differ from the source GLB. Retain the installed
 # material object and its unchanged authoritative appearance record.
 control,control_areas=construct(side,False,material);old_area=sum(p.area for p in obj.data.polygons);control_area=sum(control_areas.values());assert abs(old_area-control_area)<.002,(key,old_area,control_area)
 mesh,new_areas=construct(side,True,material)
 unchanged_errors=[abs(new_areas.get(face,0)-area) for face,area in control_areas.items() if face not in masked];assert max(unchanged_errors,default=0)<1e-5
 assert all(new_areas.get(face,0)<=area+.001 for face,area in control_areas.items())
 uv_layer=mesh.uv_layers.new(name='UVMap');custom=[None]*len(mesh.loops);max_plane_error=0
 for poly in mesh.polygons:
  face=mesh.attributes['_source_face'].data[poly.index].value;ids=indices[face*3:face*3+3];abc=[Vector(source_verts[i]) for i in ids];ns=[Vector(source_normals[i]) for i in ids];uv=[Vector((uvs[i][0],1-uvs[i][1],0)) for i in ids];normal=(abc[1]-abc[0]).cross(abc[2]-abc[0]).normalized()
  for li in poly.loop_indices:
   point=mesh.vertices[mesh.loops[li].vertex_index].co;max_plane_error=max(max_plane_error,abs((point-abc[0]).dot(normal)))
   tex=barycentric_transform(point,*abc,*uv);uv_layer.data[li].uv=(tex.x,tex.y);n=barycentric_transform(point,*abc,*ns);assert n.length>1e-6;n.normalize();custom[li]=n
  poly.use_smooth=True
 assert max_plane_error<.0001
 mesh.normals_split_custom_set(custom);obj.data=mesh;mesh.calc_loop_triangles();triangles=[];triangle_source_faces=[]
 for t in mesh.loop_triangles:
  points=[mesh.vertices[i].co for i in t.vertices]
  if (points[1]-points[0]).cross(points[2]-points[0]).length<2e-12:continue
  triangles.extend(reversed(t.vertices));triangle_source_faces.append(mesh.attributes['_source_face'].data[t.polygon_index].value)
 layout['panels'][old_index]={**old,'vertices':[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices],'triangles':triangles,'finishes':[{'appearance':old['appearance'],'triangles':triangles}]}
 obj['kyoto_seed']='panels/'+str(old_index);obj['kyoto_geometry_signature']=signature(obj)
 replaced.append({'id':key,'oldTriangles':len(old['triangles'])//3,'newTriangles':len(triangles)//3,'oldAreaM2':old_area,'sourceControlAreaM2':control_area,'newAreaM2':sum(new_areas.values()),'removedAreaM2':control_area-sum(new_areas.values()),'maximumUnchangedSourceFaceAreaErrorM2':max(unchanged_errors,default=0),'maximumSourcePlaneErrorM':max_plane_error,'sourceFaceAreasBefore':control_areas,'sourceFaceAreasAfter':new_areas,'triangleSourceFaces':triangle_source_faces});bpy.data.meshes.remove(control)
provenance={'status':'Opaque inner roof replaced only where covered by registered canopy; uncovered source transitions and all other source faces retained.','inputLayoutSha256':sha(layout_bytes),'sourceGlbSha256':sha(source),'maskSha256':sha(mask_bytes),'maskCheckSha256':sha(check_bytes),'maskSummary':mask['summary'],'clipZones':zone,'replacedPanels':replaced,'limits':['The narrow western return-wall seam and eastern cladding interface remain for inspection.','No Skyway, public route, course, material, light or other geometry record changes.','This is an intermediate construction candidate, not final visual or gameplay acceptance.']}
layout['architecture']['innerRoofSourceInterface']=provenance;a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures');text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json';bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
report={**provenance,'layoutSha256':sha(text.encode()),'blenderSha256':sha((a.output/'KyotoAtrium.blend').read_bytes())};(a.output/'inner-roof-rebuild.json').write_text(json.dumps(report,indent=2)+'\n');print('INNER_ROOF_READY',json.dumps({'layoutSha256':report['layoutSha256'],'blenderSha256':report['blenderSha256'],'replaced':[{k:r[k] for k in ['id','oldTriangles','newTriangles','removedAreaM2','maximumSourcePlaneErrorM']} for r in replaced]}),flush=True)
