"""Extract one geographic tile from the official ZIP using verified HTTP ranges."""
import argparse, io, json, hashlib, urllib.request, zipfile, datetime
from pathlib import Path
URL='https://assets.cms.plateau.reearth.io/assets/14/1e9201-01af-4ec5-a139-12f425829f27/26100_kyoto-shi_city_2024_citygml_1_op.zip'
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--tile',default='52353680');p.add_argument('--list-only',action='store_true');a=p.parse_args()
if not a.tile.isdigit() or len(a.tile)!=8:raise ValueError('Expected a Japanese third-level mesh code')
class RemoteZip(io.RawIOBase):
 def __init__(self):
  with urllib.request.urlopen(urllib.request.Request(URL,method='HEAD'),timeout=30) as r:self.size=int(r.headers['Content-Length']);self.etag=r.headers['ETag']
  self.position=0;self.downloaded=0
 def seekable(self):return True
 def readable(self):return True
 def tell(self):return self.position
 def seek(self,offset,whence=0):
  self.position=offset if whence==0 else self.position+offset if whence==1 else self.size+offset
  if self.position<0:raise ValueError('Negative ZIP offset')
  return self.position
 def read(self,size=-1):
  if size<0:size=self.size-self.position
  size=min(size,self.size-self.position)
  if size<=0:return b''
  if size>100_000_000:raise ValueError('Unexpectedly large range; review selected entry')
  start=self.position;end=start+size-1
  req=urllib.request.Request(URL,headers={'Range':f'bytes={start}-{end}','If-Match':self.etag})
  with urllib.request.urlopen(req,timeout=90) as r:
   if r.status!=206 or r.headers.get('Content-Range')!=f'bytes {start}-{end}/{self.size}':raise ValueError('Server did not honor exact range')
   if r.headers.get('ETag')!=self.etag:raise ValueError('Archive changed during extraction')
   data=r.read(size+1)
  if len(data)!=size:raise ValueError('Range length mismatch')
  self.position+=size;self.downloaded+=size;return data
remote=RemoteZip();a.output.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(remote) as z:
 names=[n for n in z.namelist() if a.tile in n and n.lower().endswith('.gml')]
 print('Selected tile entries:',*names,sep='\n',flush=True)
 receipt={'dataset':'https://www.geospatial.jp/ckan/dataset/plateau-26100-kyoto-shi-2024','archiveUrl':URL,'archiveEtag':remote.etag,'archiveBytes':remote.size,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tile':a.tile,'entries':[]}
 if not a.list_only:
  for name in names:
   # ZIP CRC is checked by zipfile; record SHA-256 for durable local provenance.
   data=z.read(name);dest=a.output/Path(name).name
   if dest.exists() and dest.read_bytes()!=data:raise ValueError('Refusing to replace a different local source')
   dest.write_bytes(data);receipt['entries'].append({'archiveName':name,'file':dest.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'crc32':z.getinfo(name).CRC})
 receipt['downloadedBytes']=remote.downloaded
 (a.output/'acquisition.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps({'files':len(receipt['entries']),'downloadedBytes':remote.downloaded}),flush=True)
