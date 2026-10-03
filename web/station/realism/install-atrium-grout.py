"""Install the same closed floor and finishes in the editable Blender source."""
import bpy,json,sys,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector,geometry
from mathutils.bvhtree import BVHTree
base_path,candidate_path=map(Path,sys.argv[sys.argv.index('--')+1:]);base=json.loads(base_path.read_text());candidate=json.loads(candidate_path.read_text());out=candidate_path.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=Path(candidate['layout']).read_bytes();layout=json.loads(raw);proof=json.loads((out/'geometry-proof.json').read_text())
assert sha(raw)==candidate['layoutSha256']
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==base['layoutSha256']
matches=[o for o in bpy.data.objects if o.get('kyoto_surface',o.name)==proof['surface']];assert len(matches)==1
o=matches[0];object_name=o.name;old=o.data;old_names=set(bpy.data.objects.keys());inverse=o.matrix_world.inverted()
floor=next(p for p in layout['panels']if p['id']==proof['surface'])
vertices=[tuple(inverse@Vector((v['x'],v['z'],v['y'])))for v in floor['vertices']]
faces=[floor['triangles'][i:i+3][::-1]for i in range(0,len(floor['triangles']),3)]
mesh=bpy.data.meshes.new(old.name+' flush grout');mesh.from_pydata(vertices,[],faces);mesh.update()
assert len(old.materials)==1;mesh.materials.append(old.materials[0])
r=layout['authoredMaterials'][-1];assert r['id']=='atrium-flush-grout'
m=bpy.data.materials.new(r['label']);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=tuple(r['linearColor'][k]for k in 'rgba');bs.inputs['Roughness'].default_value=r['roughness'];mesh.materials.append(m)
grout={tuple(floor['finishes'][1]['triangles'][i:i+3])for i in range(0,len(floor['finishes'][1]['triangles']),3)}
old.calc_loop_triangles();old_triangles=list(old.loop_triangles)
bvh=BVHTree.FromPolygons([v.co for v in old.vertices],[t.vertices for t in old_triangles],all_triangles=True)
uv=mesh.uv_layers.new(name='UVMap');expected_uv=[]
for p in mesh.polygons:
 p.material_index=1 if tuple(reversed(p.vertices))in grout else 0
 _,_,near,_=bvh.find_nearest(p.center);t=old_triangles[near]
 a,b,c=[old.vertices[i].co for i in t.vertices];ua,ub,uc=[Vector((*old.uv_layers.active.data[i].uv,0))for i in t.loops]
 for li in p.loop_indices:
  value=geometry.barycentric_transform(mesh.vertices[mesh.loops[li].vertex_index].co,a,b,c,ua,ub,uc)
  uv.data[li].uv=value.xy;expected_uv.append(tuple(value.xy))
o.data=mesh
v=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',v);loops=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',loops)
o['kyoto_geometry_signature']=sha(v.tobytes()+loops.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes())
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str(Path(candidate['layout']).resolve()),internal=True);seed.name='Kyoto runtime seed.json';seed.use_fake_user=True
bpy.context.preferences.filepaths.save_version=0
source=out/'KyotoAtrium.blend';assert not source.exists()
bpy.ops.wm.save_as_mainfile(filepath=str(source.resolve()));bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
assert set(bpy.data.objects.keys())==old_names
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==candidate['layoutSha256']
o=bpy.data.objects[object_name];mesh=o.data
assert len(mesh.vertices)==len(vertices)and len(mesh.polygons)==len(faces)
assert [i for p in mesh.polygons for i in reversed(p.vertices)]==floor['triangles']
assert max((o.matrix_world@v.co-Vector((p['x'],p['z'],p['y']))).length for v,p in zip(mesh.vertices,floor['vertices']))<1e-6
for loop in mesh.loops:assert max(abs(a-b)for a,b in zip(mesh.uv_layers.active.data[loop.index].uv,expected_uv[loop.index]))<1e-6
for p in mesh.polygons:assert p.material_index==(1 if tuple(reversed(p.vertices))in grout else 0)
detail=json.loads(Path(base['detail']).read_text());detail['candidateMotionIntegration']['layoutSha256']=candidate['layoutSha256'];(out/'atrium-detail.json').write_text(json.dumps(detail,separators=(',',':'))+'\n')
candidate.update(sourceScene=str(source),motionLayout=candidate['layout'],detail=str(out/'atrium-detail.json'));candidate_path.write_text(json.dumps(candidate,indent=2)+'\n')
report=dict(sourceSha256=sha(source.read_bytes()),layoutSha256=candidate['layoutSha256'],changedObject=o.name,geometryMatches=True,uvAndFinishesMatch=True,retainedObjectsExact=True,reopenedSeedExact=True)
(out/'source-proof.json').write_text(json.dumps(report,indent=2)+'\n');print('ATRIUM_GROUT_SOURCE_READY',json.dumps(report),flush=True)
