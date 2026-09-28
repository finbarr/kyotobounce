"""Install the gate architecture with an exact retirement manifest; equipment and wing connections remain unfinished."""
import argparse,collections,hashlib,json,struct,sys,shutil,re
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser(description=__doc__)
for key in ['candidate','component','spec','output']:p.add_argument('--'+key,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists() and Path('.local').resolve() in a.output.resolve().parents
sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(lb)
sb=a.spec.read_bytes();spec=json.loads(sb)
assert sha(lb)==spec['inputs']['layout']['sha256']=='1d0f58ec47d797539f4644b991ce1e22ea7a5129cb43d2296a7fe39692b3b08d'
nb=(a.component/'native-panels.json').read_bytes();native=json.loads(nb);report=json.loads((a.component/'report.json').read_text())
assert sha(nb)==report['outputs']['nativePanelsSha256']
selected_ids={q['id'] for q in native['panels']}
assert len(selected_ids)==1025 and not native.get('escalators')
assert sha(nb)==spec['inputs']['component']['nativeSha256']
# A visual role such as 'floor' is not a registered physics material. Reject
# accidental fallback before assembling an authoritative collision layout.
physics_source=Path('KyotoRicochet/Assets/Kyoto/Scripts/StationWorld.cs').read_text()
physical_keys=set(re.findall(r'\{"([^"]+)",Surface.Material',physics_source));assert len(physical_keys)>30
unknown=[(q['id'],q['material'])for q in native['panels']if q['id']in selected_ids and q.get('collision',True) and q['material']not in physical_keys]
assert not unknown,('Unrecognized physical materials would use the stone fallback',unknown)
used_materials={q['browserMaterial'] for q in native['panels'] if q['id'] in selected_ids}
def glb(path):
 b=path.read_bytes();n,k=struct.unpack_from('<II',b,12);assert k==0x4e4f534a;j=json.loads(b[20:20+n]);size,k=struct.unpack_from('<II',b,20+n);assert k==0x004e4942;binary=b[28+n:28+n+size]
 def acc(index):
  q=j['accessors'][index];v=j['bufferViews'][q['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[q['type']];fmt={5123:'H',5125:'I',5126:'f'}[q['componentType']];stride=v.get('byteStride',w*struct.calcsize(fmt));start=v.get('byteOffset',0)+q.get('byteOffset',0);assert not q.get('sparse')
  return np.array([struct.unpack_from('<'+fmt*w,binary,start+i*stride) for i in range(q['count'])])
 return b,j,binary,acc
gb,gj,gbin,gacc=glb(a.component/report['outputs']['glbFile']);assert sha(gb)==report['outputs']['glbSha256']
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
# Every removed record is pinned by ID and content hash. Reindex retained seed
# records of each geometry kind so future exports do not read stale indices.
ids={r['id'] for rows in spec['retired'].values() for r in rows}
removed_objects=[]
for kind,rows in spec['retired'].items():
 expected={r['id']:r for r in rows};found={r['id']:r for r in layout[kind] if r['id'] in expected};assert set(found)==set(expected)
 for id,row in found.items():assert sha(json.dumps(row,sort_keys=True,separators=(',',':')).encode())==expected[id]['recordSha256']
 objects=[o for o in bpy.data.objects if (o.name if kind=='authoredLights' else o.get('kyoto_surface')) in expected]
 assert len(objects)==len(expected),(kind,len(objects),len(expected));removed_objects.extend(objects)
 layout[kind]=[r for r in layout[kind] if r['id'] not in expected]
bpy.data.batch_remove(ids=tuple(removed_objects))
for kind in ['panels','boxes']:
 lookup={r['id']:i for i,r in enumerate(layout[kind])};assert len(lookup)==len(layout[kind])
 for obj in bpy.data.objects:
  if obj.get('kyoto_seed','').startswith(kind+'/'):
   assert obj.get('kyoto_surface') in lookup;obj['kyoto_seed']=kind+'/'+str(lookup[obj['kyoto_surface']])
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
collection=bpy.data.collections.new('Gate bank integration candidate');bpy.context.scene.collection.children.link(collection)
def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs);loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())

def bind(obj,row,index):
 for k,v in {'kyoto_surface':row['id'],'kyoto_physical':row['material'],'kyoto_role':row['role'],'kyoto_collision':row.get('collision',True),'kyoto_seed':'panels/'+str(index)}.items():obj[k]=v
 obj['kyoto_geometry_signature']=signature(obj)

def image(index,key,metallic_factor=1,roughness_factor=1):
 texture=gj['textures'][index];im=gj['images'][texture['source']];view=gj['bufferViews'][im['bufferView']];data=gbin[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']];suffix='.png' if im['mimeType']=='image/png' else '.jpg';name='gate-'+sha(data)[:24];dest=a.output/'textures'/(name+suffix)
 if not dest.exists():dest.write_bytes(data)
 if key!='mask':return 'AtriumTextures/'+name
 source=bpy.data.images.load(str(dest.resolve()),check_existing=False);source.colorspace_settings.name='Non-Color';pixels=np.empty(source.size[0]*source.size[1]*4,dtype=np.float32);source.pixels.foreach_get(pixels);pixels=pixels.reshape(-1,4);converted=np.ones_like(pixels);converted[:,0]=pixels[:,2]*metallic_factor;converted[:,3]=1-pixels[:,1]*roughness_factor
 name+='-canonical-mask-'+sha(str((metallic_factor,roughness_factor)).encode())[:8];target=bpy.data.images.new(name,width=source.size[0],height=source.size[1],alpha=True);target.colorspace_settings.name='Non-Color';target.pixels.foreach_set(converted.reshape(-1));target.filepath_raw=str((a.output/'textures'/(name+'.png')).resolve());target.file_format='PNG';target.save();return 'AtriumTextures/'+name
materials=[]
for i,m in enumerate(gj['materials']):
 if i not in used_materials:materials.append(None);continue
 pbr=m['pbrMetallicRoughness'];color=pbr.get('baseColorFactor',[1]*4);id='gate-bank-material-'+str(i);label='Gate bank | '+m['name'];existing=next((q for q in layout['authoredMaterials'] if q['label']==label),None);id=existing['id'] if existing else id
 row={'id':id,'label':label,'physical':'glass' if m.get('alphaMode')=='BLEND' else 'stone','linearColor':dict(zip('rgba',color)),'alpha':color[3],'metallic':pbr.get('metallicFactor',1),'roughness':pbr.get('roughnessFactor',1),'doubleSided':m.get('doubleSided',False)}
 for key,info in [('albedo',pbr.get('baseColorTexture')),('normal',m.get('normalTexture')),('mask',pbr.get('metallicRoughnessTexture'))]:
  if info:
   assert not info.get('texCoord',0) and not info.get('extensions');row[key]=image(info['index'],key,row['metallic'],row['roughness'])
   if key=='normal':row['normalScale']=info.get('scale',1)
 if 'albedo' in row:assert color==[1,1,1,1]
 if 'mask' in row:row['roughness']=1;row['metallic']=0 # Factors are baked into the canonical mask channels.
 if 'emissiveFactor' in m:row.update(emission=1,emissionColor=dict(zip('rgb',m['emissiveFactor'])))
 if existing:assert row==existing,(label,'Existing material changed')
 mat=bpy.data.materials.get(label) or bpy.data.materials.new(label);mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=color;shader.inputs['Roughness'].default_value=row['roughness'];shader.inputs['Metallic'].default_value=row['metallic'];shader.inputs['Alpha'].default_value=color[3]
 if not existing:layout['authoredMaterials'].append(row)
 if row.get('emission'):shader.inputs['Emission Color'].default_value=(*m['emissiveFactor'],1);shader.inputs['Emission Strength'].default_value=1
 materials.append((mat,row))
offsets=[0]*len(gj['materials']);added=[]
for q in native['panels']:
 mi=q['browserMaterial'];pr=gj['meshes'][mi]['primitives'][0];assert pr['material']==mi;start=offsets[mi];end=start+len(q['vertices']);offsets[mi]=end
 if q['id'] not in selected_ids:continue
 assert all(old['id']!=q['id'] for old in layout['panels']),q['id']
 vp=gacc(pr['attributes']['POSITION'])[start:end];vn=gacc(pr['attributes']['NORMAL'])[start:end];vu=gacc(pr['attributes']['TEXCOORD_0'])[start:end] if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(vp),2))
 error=max(np.linalg.norm(vp[i]-[v['x'],v['y'],-v['z']]) for i,v in enumerate(q['vertices']));assert error<1e-5
 mesh=bpy.data.meshes.new(q['id']);mesh.from_pydata([(v[0],-v[2],v[1]) for v in vp],[],[q['triangles'][i:i+3][::-1] for i in range(0,len(q['triangles']),3)]);mesh.materials.append(materials[mi][0]);mesh.update();uv=mesh.uv_layers.new(name='UVMap');custom=[]
 for f in mesh.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   index=mesh.loops[li].vertex_index;uv.data[li].uv=(vu[index][0],1-vu[index][1]);normal=vn[index];custom.append((normal[0],-normal[2],normal[1]))
 mesh.normals_split_custom_set(custom)
 # Retain original corner vectors separately: Blender's encoded custom normals
 # can exceed our 0.05-degree error limit on thin rods and small pebbles.
 exact=mesh.attributes.new(name='kyoto_authored_normal',type='FLOAT_VECTOR',domain='CORNER');exact.data.foreach_set('vector',[v for n in custom for v in n])
 # Blender can report zero encoded normals on sub-micrometre landing slivers.
 # Their exact, nonzero face normals are stored above and required by export.
 bad=[i for i,n in enumerate(mesh.corner_normals) if n.vector.length<=.9]
 if bad:
  assert q['role']=='hall-basement-landing',q['id']
  assert all(np.linalg.norm(custom[i])>.99 for i in bad)
  print('EXACT_NORMAL_REQUIRED',q['id'],len(bad),flush=True)
 obj=bpy.data.objects.new(q['id'],mesh);collection.objects.link(obj)
 row={k:v for k,v in q.items() if k!='browserMaterial'};row['appearance']=materials[mi][1]['id'];row['vertices']=[{'x':float(v.co.x),'y':float(v.co.z),'z':float(v.co.y)} for v in mesh.vertices]
 bind(obj,row,len(layout['panels']));layout['panels'].append(row);added.append(q['id'])
for i,n in enumerate(offsets):assert n==gj['accessors'][gj['meshes'][i]['primitives'][0]['attributes']['POSITION']]['count']
proof={'status':spec['status'],'inputLayoutSha256':sha(lb),'componentNativeSha256':sha(nb),'componentGlbSha256':sha(gb),'specSha256':sha(sb),'retired':spec['retired'],'addedPanels':added,'retainedPanels':len(layout['panels'])-len(added),'limits':spec['limits'],'builderSha256':sha(Path(__file__).read_bytes())}
layout['architecture']['gateBankIntegration']=proof
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
proof['layoutSha256']=sha(text.encode());proof['blenderSha256']=sha((a.output/'KyotoAtrium.blend').read_bytes());(a.output/'gate-bank-install.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'oldPanels':len(ids),'newPanels':len(added),'layoutSha256':proof['layoutSha256']}),flush=True)
