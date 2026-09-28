"""Private asset transfer with content deduplication; never publish this archive."""
import hashlib,json,os,shutil,sys,tarfile,tempfile,subprocess
from pathlib import Path

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
 return h.hexdigest()

mode,archive,*args=sys.argv[1:]
if mode=='pack':
 root=Path(args[0]).resolve();records=[];unique={}
 paths=['.local/station-realism','.local/stability/native-fixture.json','research/kyoto-station','runtime','art-source','web/public/assets','Builds/PhysicsWorkerLinux']
 for selected in paths:
  start=root/selected
  assert start.exists(),start
  for p in sorted(start.rglob('*')) if start.is_dir() else [start]:
   if p.is_symlink():continue # Disposable runtime workspaces are recreated from their committed generators.
   if not p.is_file() or '__pycache__' in p.parts or p.suffix in ['.pyc','.log','.blend1'] or '.sqlite' in p.name or 'DoNotShip' in str(p) or p.name=='.DS_Store':continue
   digest=sha(p);records.append({'path':str(p.relative_to(root)),'sha256':digest,'size':p.stat().st_size,'mode':p.stat().st_mode&0o777});unique.setdefault(digest,p)
 print(json.dumps({'files':len(records),'unique':len(unique),'bytes':sum(r['size'] for r in records),'uniqueBytes':sum(p.stat().st_size for p in unique.values())}),flush=True)
 with tarfile.open(archive,'w|gz',compresslevel=1) as tar:
  for digest,p in unique.items():tar.add(p,arcname='blobs/'+digest,recursive=False)
  with tempfile.NamedTemporaryFile() as f:
   f.write(json.dumps(records).encode());f.flush();tar.add(f.name,arcname='manifest.json')
 Path(archive+'.sha256').write_text(sha(Path(archive))+'\n')
 print('Packed',archive,Path(archive).stat().st_size,flush=True)
elif mode=='restore':
 root=Path(args[0]).resolve()
 with tempfile.TemporaryDirectory(prefix='kyoto-assets-',dir=root) as temp:
  if archive.endswith('.zst'):
   with subprocess.Popen(['zstd','-dc','--long=30',archive],stdout=subprocess.PIPE) as child:
    with tarfile.open(fileobj=child.stdout,mode='r|') as tar:tar.extractall(temp,filter='data')
    assert child.wait()==0,'Archive decompression failed'
  else:
   with tarfile.open(archive,'r:*') as tar:tar.extractall(temp,filter='data')
  records=json.loads((Path(temp)/'manifest.json').read_text());checked=set()
  for r in records:
   source=Path(temp)/'blobs'/r['sha256'];target=(root/r['path']).resolve();assert target.is_relative_to(root)
   if r['sha256'] not in checked:assert sha(source)==r['sha256'];checked.add(r['sha256'])
   target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target);target.chmod(r['mode']);assert target.stat().st_size==r['size']
  out=root/'.local/remote-prep';out.mkdir(parents=True,exist_ok=True);(out/'asset-manifest.json').write_text(json.dumps(records,indent=2)+'\n')
 print('Restored independent copies:',len(records))
else:raise ValueError(mode)
