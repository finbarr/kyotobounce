"""Apply the verified city-object removal to the single editable station source."""
import bpy,json,sys,hashlib
from pathlib import Path
base_path,candidate_path=map(Path,sys.argv[sys.argv.index('--')+1:])
base=json.loads(base_path.read_text());candidate=json.loads(candidate_path.read_text());out=candidate_path.parent
proof=json.loads((out/'removal.json').read_text());retired={p['id'] for p in proof['retired']}
raw=Path(candidate['layout']).read_bytes();new=json.loads(raw);old=json.loads(Path(base['layout']).read_bytes())
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(raw)==candidate['layoutSha256']
assert new['panels']==[p for p in old['panels'] if p['id'] not in retired]
for key in old:
 if key not in ['panels','architecture']:assert new[key]==old[key],key
bpy.ops.wm.open_mainfile(filepath=str(Path(base['sourceScene']).resolve()))
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==base['layoutSha256']
indices={p['id']:i for i,p in enumerate(new['panels'])};removed=[];objects_to_remove=[]
print('SOURCE_VALIDATED',flush=True)
retained_names=set(o.name for o in bpy.data.objects if o.name not in retired)
for o in list(bpy.data.objects):
 id=o.get('kyoto_surface',o.name)
 if id in retired:
  removed.append(id);objects_to_remove.append(o);continue
 tag=o.get('kyoto_seed','')
 if tag.startswith('panels/'):
  id=old['panels'][int(tag.split('/')[1])]['id'];assert id in indices;o['kyoto_seed']='panels/'+str(indices[id])
assert set(removed)==retired
bpy.data.batch_remove(ids=objects_to_remove)
print('SOURCE_OBJECTS_REMOVED',len(removed),flush=True)
# Text.write inserts a long JSON line character by character. Loading the
# already verified file avoids that quadratic editor operation.
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json'])
seed=bpy.data.texts.load(str(Path(candidate['layout']).resolve()),internal=True)
seed.name='Kyoto runtime seed.json';seed.use_fake_user=True
print('SOURCE_SEED_LOADED',flush=True)
# Release meshes, materials and packed images used only by the removed city.
bpy.data.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True)
bpy.context.preferences.filepaths.save_version=0
source=out/'KyotoAtrium.blend';assert not source.exists()
print('SAVING_SOURCE',flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source.resolve()))
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
assert set(o.name for o in bpy.data.objects)==retained_names
assert not any(o.get('kyoto_surface',o.name) in retired for o in bpy.data.objects)
assert sha(bpy.data.texts['Kyoto runtime seed.json'].as_string().encode())==candidate['layoutSha256']
assert bpy.data.texts['Kyoto runtime seed.json'].is_in_memory,'Source must not depend on a temporary external text file'
for o in bpy.data.objects:
 tag=o.get('kyoto_seed','')
 if tag.startswith('panels/'):
  assert new['panels'][int(tag.split('/')[1])]['id']==o.get('kyoto_surface',o.name)
# Motion geometry is unchanged. Update its layout identity, keeping the native
# endpoint/comb checks in the launcher and reusing the existing hardware GLB.
detail=json.loads(Path(base['detail']).read_text());detail['candidateMotionIntegration']['layoutSha256']=candidate['layoutSha256']
(out/'atrium-detail.json').write_text(json.dumps(detail,separators=(',',':'))+'\n')
candidate.update(sourceScene=str(source),motionLayout=candidate['layout'],detail=str(out/'atrium-detail.json'))
candidate_path.write_text(json.dumps(candidate,indent=2)+'\n')
report={'sourceSha256':sha(source.read_bytes()),'layoutSha256':candidate['layoutSha256'],'removedSourceObjects':len(removed),'retainedObjectNamesExact':True,'reopenedEmbeddedSeedExact':True,'seedIndicesChecked':True}
(out/'source-proof.json').write_text(json.dumps(report,indent=2)+'\n');print('SOURCE_BOUNDARY_READY',report,flush=True)
