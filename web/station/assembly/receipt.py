"""Compact candidate artifact identity and static render cost; no FPS claims."""
import argparse, hashlib, json, struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('candidate',type=Path);a=p.parse_args();root=a.candidate
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
layout=sha(root/'station-layout.json');assembly=json.loads((root/'assembly.json').read_text())
station=json.loads((root/'browser/station.json').read_text());hardware=json.loads((root/'browser/atrium-detail.json').read_text())
export=json.loads((root/'browser/atrium-export.json').read_text())
assert layout==assembly['layoutSha256']==station['layoutSha256']==hardware['sourceLayoutSha256']==export['layoutSha256']
assert sha(root/'KyotoAtrium.blend')==assembly['sourceSha256']==export['sourceSha256']
costs={}
for name in ['atrium.glb','atrium-detail.glb']:
    raw=(root/'browser'/name).read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n])
    primitives=[p for m in doc['meshes'] for p in m['primitives']]
    triangles=sum(doc['accessors'][p['indices']]['count']//3 if 'indices' in p else doc['accessors'][p['attributes']['POSITION']]['count']//3 for p in primitives)
    costs[name]={'bytes':len(raw),'triangles':triangles,'primitives':len(primitives),'materials':[m.get('name') for m in doc['materials']]}
files=['KyotoAtrium.blend','station-layout.json','assembly.json','browser/atrium.glb','browser/station.json','browser/atrium-export.json','browser/atrium-detail.glb','browser/atrium-detail.json','hardware-source/AtriumHardware.blend']
files += [str(f.relative_to(root)) for f in sorted((root/'textures').iterdir()) if f.is_file()]
files += [name for name in ['browser/cross-feature.json','browser/base-geometry-parity.json','font-audit.json','capacity-scope.json'] if (root/name).exists()]
receipt={'layoutSha256':layout,'sourceSha256':assembly['sourceSha256'],'baseLayoutSha256':assembly['baseLayoutSha256'],
 'files':{n:{'bytes':(root/n).stat().st_size,'sha256':sha(root/n)}for n in files},'renderCost':costs,
 'newMaterials':assembly['materials'],'solidMeshesVerified':len(assembly['checks']['solidMeshes']),
 'limits':['Static render counts only; coordinator owns hardware browser acceptance.','No publication or deployment performed.']}
for name in ['cross-feature','base-geometry-parity']:
    f=root/'browser'/f'{name}.json'
    if f.exists():
        proof=json.loads(f.read_text());assert proof['status']=='pass';receipt[name]=proof
for mode in ['direct','service']:
    f=root/'evidence'/f'{mode}-checks.json'
    if f.exists():
        proof=json.loads(f.read_text());assert proof['layout']==layout and proof['status']=='pass';receipt[mode+'Checks']=proof
    else:receipt[mode+'Checks']={'status':'pending'}
(root/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'layoutSha256':layout,'sourceSha256':assembly['sourceSha256'],'costs':{k:{x:v[x]for x in ['bytes','triangles','primitives']}for k,v in costs.items()},'direct':receipt['directChecks']['status'],'service':receipt['serviceChecks']['status']}))
