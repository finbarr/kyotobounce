"""Replace inherited western circulation in a private Blender/layout candidate."""
import bpy,json,hashlib,sys,struct
from pathlib import Path
import numpy as np
args=sys.argv[sys.argv.index('--')+1:];base,component,out=map(Path,args);assert not out.exists() and Path('.local').resolve()in out.resolve().parents
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(base/'station-layout.json').read_bytes();layout=json.loads(lb);nb=(component/'native-panels.json').read_bytes();native=json.loads(nb);report=json.loads((component/'report.json').read_text());assert sha(nb)==report['outputs']['nativePanelsSha256']
def retired(s):return s.startswith(('west-concourse-lower-','west-concourse-upper-','tactile-west-concourse-lower-','tactile-west-concourse-upper-'))or s in ['west-1f-2f','west-2f-3f','west-2f-landing']
bpy.ops.wm.open_mainfile(filepath=str((base/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
removed={}
original_ids={kind:[p['id']for p in layout[kind]]for kind in ['panels','beams','boxes','flights','escalators']}
for kind in ['panels','beams','boxes','flights','escalators']:
 removed[kind]=[p['id']for p in layout[kind]if retired(p['id'])];layout[kind]=[p for p in layout[kind]if not retired(p['id'])]
assert [len(removed[k])for k in ['panels','beams','boxes','flights','escalators']]==[119,24,0,6,4]
objects=[o for o in bpy.data.objects if retired(o.get('kyoto_surface',''))or o.name.startswith(('west-concourse-lower-','west-concourse-upper-','west-1f-2f','west-2f-3f'))]
assert len(objects)==1075;bpy.data.batch_remove(ids=tuple(objects))
# Reindex retained seed bindings after retiring records.
indexes_by_kind={kind:{p['id']:i for i,p in reversed(list(enumerate(layout[kind])))}for kind in removed}
print('WEST_REMOVED',len(objects),flush=True)
for o in bpy.data.objects:
 seed=o.get('kyoto_seed','')
 if not seed:continue
 kind=seed.split('/')[0]
 if kind in removed:
  source_id=original_ids[kind][int(seed.split('/')[1])];index=indexes_by_kind[kind].get(source_id);assert index is not None,(o.name,seed,source_id);o['kyoto_seed']=kind+'/'+str(index)
print('WEST_REINDEXED',flush=True)
gb=(component/report['outputs']['glbFile']).read_bytes();assert sha(gb)==report['outputs']['glbSha256'];n,k=struct.unpack_from('<II',gb,12);j=json.loads(gb[20:20+n]);binary=gb[28+n:]
def acc(index):
 a=j['accessors'][index];v=j['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC3':3}[a['type']];fmt={5125:'I',5126:'f'}[a['componentType']];size=struct.calcsize(fmt);return np.array([struct.unpack_from('<'+fmt*w,binary,v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',w*size))for i in range(a['count'])])
def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs);loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops);return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
materials=[]
for i,m in enumerate(j['materials']):
 label=m['name'];pbr=m['pbrMetallicRoughness'];color=pbr['baseColorFactor'];record=dict(id='west-v2-material-'+str(i),label=label,physical='glass'if i==0 else 'rubber'if i==2 else 'steel'if i==1 else 'stone',linearColor=dict(zip('rgba',color)),alpha=color[3],metallic=pbr['metallicFactor'],roughness=pbr['roughnessFactor'],doubleSided=m.get('doubleSided',False))
 assert not any(r['label']==label for r in layout['authoredMaterials']);layout['authoredMaterials'].append(record)
 mat=bpy.data.materials.new(label);mat.use_nodes=True;s=mat.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=color;s.inputs['Roughness'].default_value=record['roughness'];s.inputs['Metallic'].default_value=record['metallic'];s.inputs['Alpha'].default_value=color[3];materials.append((mat,record))
collection=bpy.data.collections.new('Western circulation v2');bpy.context.scene.collection.children.link(collection);offsets=[0]*len(materials)
attrs=[(acc(p['attributes']['POSITION']),acc(p['attributes']['NORMAL']))for m in j['meshes']for p in m['primitives']]
for q in native['panels']:
 mi=q['browserMaterial'];start=offsets[mi];end=start+len(q['vertices']);offsets[mi]=end;positions,normals=(a[start:end]for a in attrs[mi])
 assert max(np.linalg.norm(positions[i]-[v['x'],v['y'],-v['z']])for i,v in enumerate(q['vertices']))<1e-5
 mesh=bpy.data.meshes.new(q['id']);mesh.from_pydata([(v[0],-v[2],v[1])for v in positions],[],[q['triangles'][i:i+3][::-1]for i in range(0,len(q['triangles']),3)]);mesh.materials.append(materials[mi][0]);mesh.update();corner=[]
 for face in mesh.polygons:
  face.use_smooth=True
  for li in face.loop_indices:
   v=normals[mesh.loops[li].vertex_index];corner.append((v[0],-v[2],v[1]))
 mesh.normals_split_custom_set(corner);exact=mesh.attributes.new(name='kyoto_authored_normal',type='FLOAT_VECTOR',domain='CORNER');exact.data.foreach_set('vector',[v for n in corner for v in n])
 row={k:v for k,v in q.items()if k!='browserMaterial'};row['appearance']=materials[mi][1]['id'];row['vertices']=[dict(x=float(v[0]),y=float(v[1]),z=-float(v[2]))for v in positions]
 obj=bpy.data.objects.new(q['id'],mesh);collection.objects.link(obj)
 for k,v in dict(kyoto_surface=row['id'],kyoto_physical=row['material'],kyoto_role=row['role'],kyoto_collision=row.get('collision',True),kyoto_seed='panels/'+str(len(layout['panels']))).items():obj[k]=v
 obj['kyoto_geometry_signature']=signature(obj);layout['panels'].append(row)
print('WEST_COMPONENT_IMPORTED',flush=True)
for mi,(positions,_)in enumerate(attrs):assert offsets[mi]==len(positions)
layout['escalators'].extend(native['escalators']);layout['routes']=[r for r in layout['routes']if not r['id'].startswith('west-concourse-')and r['id']not in ['full-stair-ascent','full-stair-descent']]
layout['architecture']['westCirculationV2']=dict(component=str(component),sourceSha256=report['sourceSha256'],nativeSha256=sha(nb),removed=removed,combSupports=native['combSupports'],scope=report['scope'])
out.mkdir(parents=True);(out/'textures').symlink_to((Path('.local/station-realism/gate-bank-browser-input-02/textures')).resolve(),target_is_directory=True)
text=json.dumps(layout,separators=(',',':'))+'\n';(out/'station-layout.json').write_text(text);bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
(out/'installation.json').write_text(json.dumps(dict(parentLayoutSha256=sha(lb),layoutSha256=sha(text.encode()),componentGlbSha256=sha(gb),componentNativeSha256=sha(nb),removedObjects=len(objects),removed=removed),indent=2)+'\n')
print('WEST_V2_INSTALLED',sha(text.encode()))
