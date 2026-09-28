"""Replace the obsolete canopy in a fresh full-station construction candidate.

The retained Skyway and access routes are deliberately intermediate geometry.
No source municipal faces or existing route records are edited by this step.
"""
import argparse, collections, hashlib, json, shutil, sys
from pathlib import Path
import bpy, numpy as np
p=argparse.ArgumentParser(description=__doc__)
for k in ('candidate','inventory','central','west','output'):p.add_argument('--'+k,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert not a.output.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
layout_bytes=(a.candidate/'station-layout.json').read_bytes();layout=json.loads(layout_bytes)
inv_bytes=a.inventory.read_bytes();inv=json.loads(inv_bytes)
assert sha(layout_bytes)==inv['layoutSha256']=='b60d9fe49f2e037be3fd27c69f21ee7d64eab86a7798f2a0ae9ca4af0e9e1976'
components=[]
for directory in (a.central,a.west):
 b=(directory/'native-panels.json').read_bytes();r=json.loads((directory/'report.json').read_text());n=json.loads(b)
 assert sha(b)==r['outputs']['nativePanelsSha256']
 components.append((directory,r,n,b))
assert [len(c[2]['panels']) for c in components]==[22002,1080]
# All western source roof faces lie south of the imported frontage clipping plane.
assert max(v['z'] for q in components[1][2]['panels'] if q['material']=='glass' for v in q['vertices'])<layout['architecture']['municipalStationFrontage']['clipZones']['northYMin']
assert min(v['x'] for q in components[1][2]['panels'] for v in q['vertices'])>layout['architecture']['municipalStationFrontage']['clipZones']['westX'][0]
removed={}
for kind in ('panels','beams'):
 indices=set(inv['families'][kind]['recordIndices'])
 assert len(indices)==inv['families'][kind]['count']
 assert all(layout[kind][i]['id'].startswith('canopy') for i in indices)
 if kind=='panels':indices.update(i for i,q in enumerate(layout[kind]) if q['id'].startswith('central-roof'))
 removed[kind]=indices
assert len(removed['panels'])==9021 and len(removed['beams'])==33293
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()))
assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==layout_bytes.decode()
remove_surfaces={kind:collections.Counter(layout[kind][i]['id'] for i in indices) for kind,indices in removed.items()}
parented={o.parent for o in bpy.data.objects if o.parent is not None}
selected=[];actual={kind:collections.Counter() for kind in removed}
for obj in bpy.data.objects:
 surface=obj.get('kyoto_surface','');seed=obj.get('kyoto_seed','');kind=seed.split('/')[0]
 if kind in removed and surface in remove_surfaces[kind]:
  assert obj.type=='MESH' and obj not in parented and not obj.modifiers
  selected.append(obj);actual[kind][surface]+=1
assert actual==remove_surfaces,'Authoring objects do not match exact native removal inventory'
removed_names=[o.name for o in selected]
selected_set=set(selected)
retained_indices={}
for kind,indices in removed.items():
 retained_indices[kind]={i:new for new,i in enumerate(i for i in range(len(layout[kind])) if i not in indices)}
 layout[kind]=[q for i,q in enumerate(layout[kind]) if i not in indices]
panel_map={q['id']:i for i,q in enumerate(layout['panels'])};assert len(panel_map)==len(layout['panels'])
beam_map=collections.defaultdict(list)
for i,q in enumerate(layout['beams']):beam_map[q['id']].append(i)
used_beams=set()
remapped=collections.Counter()
for obj in bpy.data.objects:
 if obj in selected_set:continue
 seed=obj.get('kyoto_seed','');kind=seed.split('/')[0];surface=obj.get('kyoto_surface',obj.name)
 if kind=='panels':
  assert surface in panel_map;obj['kyoto_seed']='panels/'+str(panel_map[surface]);remapped[kind]+=1
 elif kind=='beams':
  # Legacy numeric seeds predate layout sorting. Match stable surface identity
  # and the actual mesh center, rather than interpreting an old array index.
  world=[obj.matrix_world@v.co for v in obj.data.vertices]
  center={key:(min(v[axis] for v in world)+max(v[axis] for v in world))/2 for key,axis in [('x',0),('y',2),('z',1)]}
  matches=[i for i in beam_map[surface] if i not in used_beams and max(abs(center[k]-(layout['beams'][i]['a'][k]+layout['beams'][i]['b'][k])/2) for k in 'xyz')<.001]
  if len(matches)>1:
   xyz=np.array([(v.x,v.z,v.y) for v in world]);xyz-=xyz.mean(axis=0)
   _,axes=np.linalg.eigh(xyz.T@xyz);axis=axes[:,-1]
   def aligned(i):
    q=layout['beams'][i];direction=np.array([q['b'][k]-q['a'][k] for k in 'xyz']);direction/=np.linalg.norm(direction)
    return abs(float(axis@direction))>.99999
   matches=[i for i in matches if aligned(i)]
  assert len(matches)==1,(obj.name,surface,center,matches)
  new=matches[0];used_beams.add(new);obj['kyoto_seed']='beams/'+str(new);remapped[kind]+=1
 elif kind=='boxes' and surface=='south-concourse-hall-return-east':
  obj['kyoto_seed']='panels/'+str(panel_map[surface]);remapped['converted-box']+=1

assert len(used_beams)==len(layout['beams'])
print('VERIFIED_RETAINED_BINDINGS',dict(remapped),flush=True)
bpy.data.batch_remove(ids=tuple(selected))
print('REMOVED_OLD_ROOF',len(selected),flush=True)

def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs)
 loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
materials={physical:next(m for m in layout['authoredMaterials'] if m['id']==mid) for physical,mid in [('glass','blender-ffc4e873df23'),('roof','registered-roof-outer-steel')]}
blender_materials={k:bpy.data.materials[v['label']] for k,v in materials.items()}
object_names={o.name for o in bpy.data.objects}
collection=bpy.data.collections.new('Registered complete roof construction');bpy.context.scene.collection.children.link(collection)
added=[]
for directory,r,n,b in components:
 print('INSERTING_COMPONENT',str(directory),flush=True)
 for q in n['panels']:
  assert q['id'] not in panel_map
  name='canopy-glazing-registered-'+q['id'] if q['material']=='glass' else q['id'];assert name not in object_names;object_names.add(name)
  mesh=bpy.data.meshes.new(name);mesh.from_pydata([(v['x'],v['z'],v['y']) for v in q['vertices']],[],[q['triangles'][i:i+3][::-1] for i in range(0,len(q['triangles']),3)]);mesh.materials.append(blender_materials[q['material']]);mesh.update()
  obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
  for k,v in {'kyoto_surface':q['id'],'kyoto_physical':q['material'],'kyoto_role':q['role'],'kyoto_collision':q.get('collision',True),'kyoto_seed':'panels/'+str(len(layout['panels']))}.items():obj[k]=v
  obj['kyoto_geometry_signature']=signature(obj)
  panel_map[q['id']]=len(layout['panels']);layout['panels'].append({**q,'appearance':materials[q['material']]['id']});added.append(q['id'])
provenance={'status':'Full-station roof construction candidate; old Skyway retained and route integration unfinished.', 'inputLayoutSha256':sha(layout_bytes),'inventorySha256':sha(inv_bytes),'removedRecordIndices':{k:sorted(v) for k,v in removed.items()},'removedObjectNames':removed_names,'remappedObjects':dict(remapped),'components':[{'directory':str(d),'nativePanelsSha256':sha(b),'glbSha256':r['outputs']['glbSha256'],'panels':len(n['panels'])} for d,r,n,b in components],'addedPanels':added,'limits':['Existing eastern registered roof and all municipal source meshes remain unchanged.','Western source roof lies outside the imported frontage; no municipal faces removed.','Existing Skyway, fixtures, escalators and access routes remain pending coordinated replacement.','New central roof has framed openings for the uninstalled new Skyway; this is not final route, course or visual acceptance.']}
layout['architecture']['registeredRoofReplacement']=provenance
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures')
text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
report={**provenance,'layoutSha256':sha(text.encode()),'blenderSha256':sha((a.output/'KyotoAtrium.blend').read_bytes())};(a.output/'roof-replacement.json').write_text(json.dumps(report,indent=2)+'\n')
print('ROOF_REPLACEMENT',json.dumps({'removedPanels':len(removed['panels']),'removedBeams':len(removed['beams']),'addedPanels':len(added),'layoutSha256':report['layoutSha256'],'blenderSha256':report['blenderSha256']}),flush=True)
