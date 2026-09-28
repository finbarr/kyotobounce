"""Bound the obsolete upper north-block slabs by registered municipal envelopes.

Both the Blender surfaces and native triangle records are replaced together.
This is an integration candidate, not a full interior floor survey.
"""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix
p=argparse.ArgumentParser(description=__doc__)
for k in ('candidate','wall','hall','component','output'):p.add_argument('--'+k,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not a.output.exists(),'Use a fresh candidate directory'
wall=json.loads(a.wall.read_text());hall=json.loads(a.hall.read_text());component=json.loads((a.component/'report.json').read_text());layout=json.loads((a.candidate/'station-layout.json').read_text())
assert sha(a.candidate/'station-layout.json')==component['inputLayoutSha256']
assert wall['sourceSha256']==component['source']['sha256'];assert len(wall['coplanarFaces'])==21
assert abs(hall['heightM']-59.4)<1e-8 and hall['loops'][0]['areaM2']>740
# The observed diagonal facade reaches 54.234 m; the two adjacent upper slabs
# must not project south through that exterior plane. The highest slab uses
# the independently observed 59.4 m upper-hall footprint instead.
normal=wall['records'][0]['normalRenderer'];normal=Vector((normal[0],-normal[2],normal[1]));constant=wall['records'][0]['constant'];xmin,xmax=wall['measuredBoundsRenderer'][0];assert normal.y>.96
polys=[]
for z in [40.,65.]:polys.append([(xmin,-80.,z),(xmax,-80.,z),(xmax,(-constant-normal.x*xmax-normal.z*z)/normal.y,z),(xmin,(-constant-normal.x*xmin-normal.z*z)/normal.y,z)])
wall_vertices=polys[0]+polys[1]
wall_faces=[(3,2,1,0),(4,5,6,7)]+[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)]
loop=hall['loops'][0]['pointsNativeXZ'];area=sum(v[0]*w[1]-w[0]*v[1] for v,w in zip(loop,loop[1:]+loop[:1]))/2
if area<0:loop=list(reversed(loop))
n=len(loop);hall_vertices=[(x,y,z) for z in [58.,61.] for x,y in loop];hall_faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==(a.candidate/'station-layout.json').read_text()
def cutter(name,verts,faces):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj);return obj
cut=cutter('Temporary measured rear wall cut',wall_vertices,wall_faces);keep=cutter('Temporary measured upper hall envelope',hall_vertices,hall_faces)
records=[]
for key,tool,operation in [('west-north-floor-09',cut,'DIFFERENCE'),('west-north-floor-10',cut,'DIFFERENCE'),('west-north-floor-11',keep,'INTERSECT')]:
 obj=bpy.data.objects.get(key);assert obj and obj.type=='MESH' and not obj.modifiers and not obj.children
 index=next(i for i,r in enumerate(layout['panels']) if r['id']==key);row=layout['panels'][index];before_vertices=len(obj.data.vertices)
 obj.hide_viewport=False;obj.hide_set(False);bpy.context.view_layer.update();world=obj.matrix_world.copy();pts=[world@v.co for v in obj.data.vertices]
 for axis,k in [(0,'x'),(2,'y'),(1,'z')]:
  assert abs(min(v[axis] for v in pts)-min(v[k] for v in row['vertices']))<.001
  assert abs(max(v[axis] for v in pts)-max(v[k] for v in row['vertices']))<.001
 mesh=obj.data.copy();obj.data=mesh;mesh.transform(world);obj.parent=None;obj.matrix_world=Matrix.Identity(4)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));before_volume=bm.calc_volume();assert all(e.is_manifold for e in bm.edges),key+' input is not closed';bm.to_mesh(mesh);bm.free()
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);mod=obj.modifiers.new('Measured municipal envelope','BOOLEAN');mod.operation=operation;mod.solver='EXACT';mod.object=tool;bpy.ops.object.modifier_apply(modifier=mod.name);obj.select_set(False)
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));assert bm.faces and all(e.is_manifold for e in bm.edges),key+' cut is not closed';after_volume=bm.calc_volume();assert 0<after_volume<before_volume;bm.to_mesh(obj.data);bm.free();obj.data.update();obj.data.calc_loop_triangles()
 vertices=[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in obj.data.vertices];triangles=[i for tri in obj.data.loop_triangles for i in reversed(tri.vertices)]
 row.update(vertices=vertices,triangles=triangles,generator='Registered municipal west upper slab envelope repair')
 row.pop('normals',None);row.pop('uv',None)
 if row.get('finishes'):assert len(row['finishes'])==1;row['finishes'][0]['triangles']=triangles
 obj['kyoto_seed']='panels/'+str(index)
 v=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',v);t=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',t);obj['kyoto_geometry_signature']=hashlib.sha256(v.tobytes()+t.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes()).hexdigest()
 records.append({'id':key,'operation':operation,'source':'rear wall plane' if operation=='DIFFERENCE' else 'upper hall outer loop at 59.4 m','beforeVolumeM3':before_volume,'afterVolumeM3':after_volume,'removedVolumeM3':before_volume-after_volume,'removedPlanAreaM2':(before_volume-after_volume)/.28,'vertices':len(vertices),'triangles':len(triangles)//3})
for obj in [cut,keep]:bpy.data.objects.remove(obj,do_unlink=True)
provenance={'inputLayoutSha256':sha(a.candidate/'station-layout.json'),'componentGlbSha256':component['outputs']['glbSha256'],'sourceGeometrySha256':wall['sourceSha256'],'wallFileSha256':sha(a.wall),'hallFileSha256':sha(a.hall),'wallPlaneNormalBlender':list(normal),'wallPlaneConstant':constant,'measuredWallX':[xmin,xmax],'upperHallSampleHeightM':hall['heightM'],'upperHallOuterLoop':loop,'repairs':records,'limits':['The source shell bounds these slab extents; interior floor divisions, tenants and finishes are not surveyed.','The lower two repairs retain the old western strip outside the measured wall span.','Slab heights are retained; upper plaza floor levels still require registration.','The new roof component is not inserted here, and the old roof/bridge remain pending coordinated replacement.']}
layout['architecture']['westUpperSlabRepair']=provenance
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures');text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
(a.output/'slab-repair.json').write_text(json.dumps({**provenance,'layoutSha256':sha(a.output/'station-layout.json'),'blenderSha256':sha(a.output/'KyotoAtrium.blend')},indent=2)+'\n');print('UPPER_SLAB_REPAIR',json.dumps(records),flush=True)
