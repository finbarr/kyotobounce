"""Remove two source-contradicted eastern draft boxes from visual/native geometry."""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser(description=__doc__)
for k in ('candidate','audit','registration','output'):p.add_argument('--'+k,type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not a.output.exists(),'Use a fresh candidate directory'
layout_text=(a.candidate/'station-layout.json').read_text();layout=json.loads(layout_text);audit=json.loads(a.audit.read_text());registration=json.loads(a.registration.read_text())
assert sha(a.candidate/'station-layout.json')==audit['layout']['sha256']==registration['inputLayoutSha256']
assert sha(a.audit)==registration['auditSha256'];assert audit['source']['sha256']==registration['source']['sha256']
assert audit['intersections'][0]['id']=='east-north-roof' and len(audit['intersections'][0]['sourceTriangles'])==0
assert audit['intersections'][1]['id']=='east-north-upper-backing' and len(audit['intersections'][1]['sourceTriangles'])==39
assert sum(r['areaM2'] for r in audit['intersections'][1]['sourceTriangles'] if abs(r['normalRenderer'][2])>.95)==0
ids=registration['removeBoxIds'];assert ids==['east-north-roof','east-north-upper-backing']
old_boxes=layout['boxes'];removed=[b for b in old_boxes if b['id'] in ids];assert len(removed)==2
for box in removed:
 ref=next(r for r in audit['boxes'] if r['id']==box['id']);assert {k:v for k,v in ref.items() if k!='bounds'}==box
bpy.ops.wm.open_mainfile(filepath=str((a.candidate/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==layout_text
seeded_box_count=sum(o.get('kyoto_seed','').startswith('boxes/') for o in bpy.data.objects)
for box in removed:
 # Existing seed indices predate the reordered native export. Use the stable
 # surface identity and independently checked world bounds for selection.
 obj=bpy.data.objects.get(box['id']);assert obj and obj.get('kyoto_surface',obj.name)==box['id'] and obj.type=='MESH' and not obj.children and not obj.modifiers
 world=obj.matrix_world;pts=[world@v.co for v in obj.data.vertices]
 for axis,key in [(0,'x'),(2,'y'),(1,'z')]:
  assert abs(min(v[axis] for v in pts)-(box['center'][key]-box['size'][key]/2))<.001
  assert abs(max(v[axis] for v in pts)-(box['center'][key]+box['size'][key]/2))<.001
 bpy.data.objects.remove(obj,do_unlink=True)
layout['boxes']=[b for b in old_boxes if b['id'] not in ids];new_indices={b['id']:i for i,b in enumerate(layout['boxes'])};remapped=0
for obj in bpy.data.objects:
 seed=obj.get('kyoto_seed','')
 if seed.startswith('boxes/'):
  stable_id=obj.get('kyoto_surface',obj.name);assert stable_id not in ids
  if stable_id in new_indices:obj['kyoto_seed']='boxes/'+str(new_indices[stable_id])
  else:
   # This source box had already been converted into a triangulated panel.
   assert stable_id=='south-concourse-hall-return-east'
   matches=[i for i,p in enumerate(layout['panels']) if p['id']==stable_id];assert len(matches)==1;obj['kyoto_seed']='panels/'+str(matches[0])
  remapped+=1
assert remapped==seeded_box_count-2
provenance={'inputLayoutSha256':sha(a.candidate/'station-layout.json'),'sourceSha256':audit['source']['sha256'],'registrationSha256':sha(a.registration),'auditSha256':sha(a.audit),'removedBoxes':removed,'remappedFormerBoxSeedObjects':remapped,'seedSelection':'Stable kyoto_surface ID and world bounds; prior box seed indices were stale. Existing south-concourse-hall-return-east is mapped to its already converted native panel.','reason':'Published axonometric and exact source sections show open space above the eastern curved roof. No source triangle intersects the old roof volume; the old backing cuts roof surfaces without a matching vertical wall.','limits':['This removes two obsolete draft boxes. Other authored roof, truss and Skyway geometry remains to replace coherently.','Municipal geometry and published drawings do not establish surveyed interior dimensions.']}
layout['architecture']['eastUpperEnvelopeRepair']=provenance
a.output.mkdir(parents=True);shutil.copytree(a.candidate/'textures',a.output/'textures');text=json.dumps(layout,separators=(',',':'))+'\n';(a.output/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((a.output/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((a.output/'KyotoAtrium.blend').resolve()))
(a.output/'envelope-repair.json').write_text(json.dumps({**provenance,'layoutSha256':sha(a.output/'station-layout.json'),'blenderSha256':sha(a.output/'KyotoAtrium.blend')},indent=2)+'\n');print('EAST_ENVELOPE_REPAIR',ids,flush=True)
