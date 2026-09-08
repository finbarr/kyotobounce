"""Verify and preserve EVERY assets-v2 manifest file in a fresh archive candidate."""
import argparse, hashlib, json, shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False)
manifest=json.loads(Path('assets-manifest.json').read_text());assert manifest['version']=='assets-v2'
checked=[]
for name,entry in manifest['files'].items():
    source=a.source/name;raw=source.read_bytes()
    assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256'], ('Baseline mismatch',name)
    target=a.output/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
    assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']
    checked.append(name)
shutil.copyfile('assets-manifest.json',a.output/'assets-manifest.json')
(a.output/'archive-receipt.json').write_text(json.dumps({'status':'pass','version':manifest['version'],'files':checked,'count':len(checked)},indent=2)+'\n')
print('ARCHIVE_READY',len(checked),'files')
