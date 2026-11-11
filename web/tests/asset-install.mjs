import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {installAssets} from '../../tools/assets.mjs';
import {currentAssetPaths} from '../../tools/asset-paths.mjs';
const execute=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex');
const directory=await mkdtemp(join(tmpdir(),'kyoto-asset-test-'));
const config={layout:'.local/v2/current/source/layout.json',motionLayout:'.local/v2/current/source/layout.json',geometry:'.local/v2/current/station/atrium.glb',station:'.local/v2/current/station/station.json',hardware:'.local/v2/current/motion/hardware.glb',detail:'.local/v2/current/motion/detail.json'},names=currentAssetPaths(config);
let sequence=0;
async function fixture(){
 const base=join(directory,String(sequence++)),source=join(base,'source'),root=join(base,'install'),archive=join(base,'assets.tar.gz'),cache=join(base,'cache'),files={};
 await mkdir(join(root,'web/v2'),{recursive:true});const configBytes=JSON.stringify(config);await writeFile(join(root,'web/v2/assets.json'),configBytes);
 for(const name of names){const bytes=Buffer.from('fixture '+name);await mkdir(dirname(join(source,name)),{recursive:true});await writeFile(join(source,name),bytes);files[name]={bytes:bytes.length,sha256:hash(bytes)};}
 const manifest={kind:'kyoto-game-assets-v1',version:'assets-v8',stationManifestSha256:hash(configBytes),layoutSha256:'1'.repeat(64),files,archive:{url:'https://github.com/finbarr/kyotobounce/releases/download/assets-v8/kyoto-assets-v8.tar.gz'}};
 const save=()=>writeFile(join(root,'assets-manifest.json'),JSON.stringify(manifest));
 async function pack(entries=names){
  await execute('tar',[...(process.platform==='darwin'?['--no-xattrs','--no-mac-metadata']:[]),'-czf',archive,'-C',source,...entries],{env:{...process.env,COPYFILE_DISABLE:'1'}});
  const bytes=await readFile(archive);Object.assign(manifest.archive,{bytes:bytes.length,sha256:hash(bytes)});await save();
 }
 await pack();return {base,source,root,archive,cache,manifest,pack,save};
}
async function untouched(f){for(const name of names)await assert.rejects(stat(join(f.root,name)),{code:'ENOENT'});}
try{
 const f=await fixture(),never=()=>{throw Error('Unexpected network request');};
 assert.equal((await installAssets({...f,fetcher:never})).installed,6);
 for(const name of names){assert.deepEqual(await readFile(join(f.root,name)),await readFile(join(f.source,name)));assert.equal((await stat(join(f.root,name))).nlink,1);}
 assert(!(await readdir(join(f.root,'.local'))).some(n=>n.startsWith('asset-install-')));
 assert.equal((await installAssets({...f,archive:'missing',fetcher:never})).installed,0);
 assert.equal((await installAssets({...f,command:'verify'})).installed,0);
 await writeFile(join(f.root,names[0]),'local edit');await rm(join(f.root,names[1]));
 await assert.rejects(installAssets({...f,fetcher:never}),/nothing was overwritten/);
 assert.equal(await readFile(join(f.root,names[0]),'utf8'),'local edit');await assert.rejects(stat(join(f.root,names[1])),{code:'ENOENT'});
 const bad=await fixture();await writeFile(bad.archive,'corrupt');await assert.rejects(installAssets(bad),/archive size or checksum mismatch/);await untouched(bad);
 const extra=await fixture();await writeFile(join(extra.source,'unexpected.txt'),'unexpected');await extra.pack([...names,'unexpected.txt']);await assert.rejects(installAssets(extra),/Unexpected asset archive entry/);await untouched(extra);
 const duplicate=await fixture();await duplicate.pack([...names,names[0]]);await assert.rejects(installAssets(duplicate),/Unexpected asset archive entry/);await untouched(duplicate);
 const linked=await fixture(),outside=join(linked.base,'outside');await writeFile(outside,'outside unchanged');await rm(join(linked.source,names[0]));await symlink(outside,join(linked.source,names[0]));await linked.pack();await assert.rejects(installAssets(linked),/only regular files/);await untouched(linked);assert.equal(await readFile(outside,'utf8'),'outside unchanged');
 const parent=await fixture();await mkdir(join(parent.base,'elsewhere'));await symlink(join(parent.base,'elsewhere'),join(parent.root,'.local'));await assert.rejects(installAssets(parent),/symbolic link/);assert.deepEqual(await readdir(join(parent.base,'elsewhere')),[]);
 const mismatch=await fixture();mismatch.manifest.files[names.at(-1)].sha256='0'.repeat(64);await mismatch.save();await assert.rejects(installAssets(mismatch),/Asset checksum or type mismatch/);await untouched(mismatch);
 const stale=await fixture();stale.manifest.stationManifestSha256='0'.repeat(64);await stale.save();await assert.rejects(installAssets(stale),/does not match/);await untouched(stale);
 const remote=await fixture();let requests=0;
 assert.equal((await installAssets({...remote,archive:undefined,fetcher:async()=>{requests++;return new Response(await readFile(remote.archive));}})).installed,6);
 await rm(join(remote.root,names[0]));assert.equal((await installAssets({...remote,archive:undefined,fetcher:never})).installed,1);assert.equal(requests,1);
 const broken=await fixture();await assert.rejects(installAssets({...broken,archive:undefined,fetcher:async()=>new Response('bad')}),/archive size or checksum mismatch/);await untouched(broken);assert.deepEqual(await readdir(broken.cache),[]);
 console.log('PASS current asset install, checksum/cache reuse, local edit preservation, stale manifests, corrupt archives, unexpected/duplicate entries and link rejection');
}finally{await rm(directory,{recursive:true,force:true});}
