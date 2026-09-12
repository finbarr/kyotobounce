"""Freeze the installed current station as a complete immutable replay bundle."""
import hashlib,json,shutil
from pathlib import Path
root=Path.cwd();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
layout=sha(root/'runtime/station-layout.json');assert layout=='485daa6d8189436f526f6f89e7b82818ff3171de92f45ac40bf65da5e2419b2d'
registry=json.loads((root/'web/layout-assets.json').read_text());target=root/'web/public/assets/layouts'/layout;target.mkdir(parents=True,exist_ok=True)
assets={}
for key,name in [('atrium','atrium.glb'),('station','station.json'),('detail','atrium-detail.glb'),('detailMeta','atrium-detail.json'),('robot','ori.glb'),('collision','station-layout.json')]:
 source=root/('runtime' if key=='collision' else 'web/public/assets')/name;dest=target/name
 if dest.exists():assert sha(dest)==sha(source),name
 else:shutil.copyfile(source,dest)
 assets[key]=dict(url='/assets/layouts/'+layout+'/'+name,bytes=dest.stat().st_size,sha256=sha(dest))
assert json.loads((target/'station.json').read_text())['layoutSha256']==layout
assert json.loads((target/'atrium-detail.json').read_text())['sourceLayoutSha256']==layout
registry['layouts'][layout]=dict(layout=layout,assets=assets)
(root/'web/layout-assets.json').write_text(json.dumps(registry,indent=2)+'\n');print('ARCHIVED',layout,len(assets))
