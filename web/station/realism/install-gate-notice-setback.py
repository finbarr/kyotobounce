"""Move only the central notice stands, retaining every other full-station record."""
import json,hashlib,shutil,sys
from pathlib import Path
import bpy,numpy as np
root=Path('.local/station-realism');base=root/'station-gate-bank-01';out=root/'station-gate-bank-02';component=root/'central-gate-bank-assembly-03'
assert not out.exists();sha=lambda b:hashlib.sha256(b).hexdigest()
lb=(base/'station-layout.json').read_bytes();assert sha(lb)=='af3692856056e8910c4606e481f29c8adf49940de6a02b90ed9efb1d9ab9ba1a';layout=json.loads(lb)
nb=(component/'native-panels.json').read_bytes();native=json.loads(nb);report=json.loads((component/'report.json').read_text());assert sha(nb)==report['outputs']['nativePanelsSha256']
selected={q['id']:q for q in native['panels'] if q['id'].startswith('gate-bank-center-notice-')};assert len(selected)==12
bpy.ops.wm.open_mainfile(filepath=str((base/'KyotoAtrium.blend').resolve()));assert bpy.data.texts['Kyoto runtime seed.json'].as_string()==lb.decode()
def signature(obj):
 vs=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',vs);loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
 return sha(vs.tobytes()+loops.tobytes()+np.array(obj.matrix_world,dtype=np.float32).tobytes())
changes=[]
for row in layout['panels']:
 if row['id'] not in selected:continue
 source=selected[row['id']];assert source['triangles']==row['triangles'];assert len(source['vertices'])==len(row['vertices'])
 objects=[o for o in bpy.data.objects if o.get('kyoto_surface')==row['id']];assert len(objects)==1;obj=objects[0]
 assert len(obj.data.vertices)==len(row['vertices']);oldHash=sha(json.dumps(row,sort_keys=True).encode())
 for i,(a,b) in enumerate(zip(row['vertices'],source['vertices'])):
  assert a['x']==b['x'] and a['y']==b['y'] and abs(a['z']-b['z']-1)<1e-5
  obj.data.vertices[i].co=(b['x'],b['z'],b['y'])
 obj.data.update();obj['kyoto_geometry_signature']=signature(obj);row['vertices']=source['vertices']
 changes.append({'id':row['id'],'beforeRecordSha256':oldHash,'afterRecordSha256':sha(json.dumps(row,sort_keys=True).encode())})
# Verify every source component surface matches the complete collision layout.
lookup={q['id']:q for q in layout['panels']}
for q in native['panels']:
 old=lookup[q['id']]
 for k in q.keys()-{'browserMaterial'}:assert q[k]==old[k],(q['id'],k)
proof={'parentLayoutSha256':sha(lb),'componentNativeSha256':sha(nb),'componentGlbSha256':report['outputs']['glbSha256'],'observationSha256':sha((root/'gate-bank-registration-01/notice-setback.json').read_bytes()),'changedPanels':changes,'nativeTranslation':[0,0,-1],'status':'Relative notice setback only. Full bank/office registration and station acceptance remain unresolved.','builderSha256':sha(Path(__file__).read_bytes())}
layout['architecture']['gateBankNoticeSetback']=proof
layout['architecture']['gateBankIntegration']={**layout['architecture']['gateBankIntegration'],'componentNativeSha256':sha(nb),'componentGlbSha256':report['outputs']['glbSha256'],'followupNoticeSetback':True}
# Compare the rest of the complete model, including all course/circulation records.
old=json.loads(lb);changed={q['id']for q in changes}
for a,b in zip(old['panels'],layout['panels']):
 if a['id'] in changed:assert {k:v for k,v in a.items()if k!='vertices'}=={k:v for k,v in b.items()if k!='vertices'}
 else:assert a==b
for k in old.keys()-{'panels','architecture'}:assert old[k]==layout[k],k
for k in old['architecture'].keys()-{'gateBankIntegration'}:assert old['architecture'][k]==layout['architecture'][k]
out.mkdir();shutil.copytree(base/'textures',out/'textures');text=json.dumps(layout,separators=(',',':'))+'\n';(out/'station-layout.json').write_text(text)
bpy.data.texts.remove(bpy.data.texts['Kyoto runtime seed.json']);seed=bpy.data.texts.load(str((out/'station-layout.json').resolve()),internal=True);seed.name='Kyoto runtime seed.json';bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str((out/'KyotoAtrium.blend').resolve()))
proof['layoutSha256']=sha(text.encode());proof['blenderSha256']=sha((out/'KyotoAtrium.blend').read_bytes());proof['allOtherRecordsExact']=True;(out/'notice-setback-install.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'changedPanels':len(changes),'layoutSha256':proof['layoutSha256']}),flush=True)
