import assert from 'node:assert/strict';
import {readFile,mkdir,lstat,mkdtemp,rm,rename,realpath,link} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {currentAssetPaths,validAssetPath} from './asset-paths.mjs';
const execute=promisify(execFile);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const hash=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');};
const info=path=>lstat(path).catch(error=>{if(error.code==='ENOENT')return null;throw error;});

// Reject symlinked destination components before writing anything. Source files
// may be locally edited; the installer never replaces an existing asset.
async function destination(root,name){
 let path=root;
 for(const [i,part] of name.split('/').entries()){
  path=join(path,part);const entry=await info(path);if(!entry)return null;
  if(entry.isSymbolicLink())throw Error('Asset destination is a symbolic link: '+name);
  if(i<name.split('/').length-1&&!entry.isDirectory())throw Error('Asset parent is not a directory: '+name);
  if(i===name.split('/').length-1)return entry;
 }
}
export async function installAssets({root,command='fetch',archive:override,cache=join(homedir(),'.cache','kyotobounce'),fetcher=fetch}={}){
 if(!['fetch','verify'].includes(command))throw Error('Usage: node tools/assets.mjs [fetch|verify]');
 root=await realpath(root);
 const manifest=JSON.parse(await readFile(join(root,'assets-manifest.json'),'utf8'));
 const configBytes=await readFile(join(root,'web/v2/assets.json')),config=JSON.parse(configBytes);
 assert.equal(manifest.kind,'kyoto-game-assets-v1','Use the current game asset manifest');
 assert.equal(manifest.stationManifestSha256,digest(configBytes),'Asset pack does not match web/v2/assets.json');
 assert(sha(manifest.layoutSha256));
 assert.deepEqual(Object.keys(manifest.files).sort(),currentAssetPaths(config),'Asset pack must contain exactly the current game inputs');
 assert(/^assets-v\d+$/.test(manifest.version));
 const expectedUrl=`https://github.com/finbarr/kyotobounce/releases/download/${manifest.version}/kyoto-${manifest.version}.tar.gz`;
 assert.equal(manifest.archive.url,expectedUrl,'Use the versioned repository release');
 assert(Number.isSafeInteger(manifest.archive.bytes)&&manifest.archive.bytes>0&&sha(manifest.archive.sha256));
 const missing=[],changed=[];
 for(const [name,expected] of Object.entries(manifest.files)){
  assert(validAssetPath(name)&&Number.isSafeInteger(expected.bytes)&&expected.bytes>0&&sha(expected.sha256),'Invalid asset manifest entry');
  const entry=await destination(root,name);
  if(!entry)missing.push(name);
  else if(!entry.isFile()||entry.size!==expected.bytes||await hash(join(root,name))!==expected.sha256)changed.push(name);
 }
 if(changed.length)throw Error('Local assets differ from the release; nothing was overwritten. Preserve your edits or move these files aside before fetching:\n'+changed.join('\n'));
 if(!missing.length){console.log('All current game assets verified.');return {installed:0,manifest};}
 if(command==='verify')throw Error('Missing current assets. Run npm run assets:fetch.\n'+missing.join('\n'));
 let archive=override?resolve(override):join(cache,manifest.archive.sha256+'.tar.gz');
 const validArchive=async path=>{const entry=await info(path);return entry?.isFile()&&entry.size===manifest.archive.bytes&&await hash(path)===manifest.archive.sha256;};
 if(override){if(!await validArchive(archive))throw Error('Asset archive size or checksum mismatch');}
 else if(!await validArchive(archive)){
  await mkdir(cache,{recursive:true});
  console.log('Downloading current station and robot assets…');
  const response=await fetcher(manifest.archive.url);
  if(!response.ok||!response.body)throw Error('Asset download failed ('+response.status+'). If this pack is not published yet, set KYOTO_ASSET_ARCHIVE to the verified local archive.');
  const partial=archive+'.'+process.pid+'.part';
  try{
   await pipeline(response.body,createWriteStream(partial,{flags:'wx'}));
   if(!await validArchive(partial))throw Error('Asset archive size or checksum mismatch');
   await rename(partial,archive);
  }finally{await rm(partial,{force:true});}
 }
 // Validate names AND entry types before extraction. A checksum-pinned archive
 // still must not contain links, duplicate paths or files outside its allowlist.
 const options={encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,LC_ALL:'C'}};
 const names=(await execute('tar',['-tzf',archive],options)).stdout.trim().split('\n');
 if(names.length!==Object.keys(manifest.files).length||new Set(names).size!==names.length||names.some(n=>!validAssetPath(n)||!Object.hasOwn(manifest.files,n)))throw Error('Unexpected asset archive entry');
 const entries=(await execute('tar',['-tvzf',archive],options)).stdout.trim().split('\n');
 if(entries.length!==names.length||entries.some(line=>!line.startsWith('-')))throw Error('Asset archives may contain only regular files, never links');
 const local=join(root,'.local');
 const localInfo=await info(local);if(localInfo&&(!localInfo.isDirectory()||localInfo.isSymbolicLink()))throw Error('Invalid asset staging directory');
 await mkdir(local,{recursive:true});const temp=await mkdtemp(join(local,'asset-install-'));
 try{
  await execute('tar',['-xzf',archive,'-C',temp,'--no-same-owner','--no-same-permissions'],options);
  for(const [name,expected] of Object.entries(manifest.files)){
   const src=join(temp,name),entry=await lstat(src);
   if(!entry.isFile()||entry.isSymbolicLink()||entry.nlink!==1||entry.size!==expected.bytes||await hash(src)!==expected.sha256)throw Error('Asset checksum or type mismatch: '+name);
  }
  for(const name of missing){
   await destination(root,name);await mkdir(dirname(join(root,name)),{recursive:true});
   // Same-filesystem staging: install atomically without duplicating each large
   // file. link() refuses EEXIST; removing staging leaves one installed copy.
   await link(join(temp,name),join(root,name));
  }
  console.log(`Installed ${missing.length} verified current game assets.`);
  return {installed:missing.length,manifest};
 }finally{await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await installAssets({root:fileURLToPath(new URL('../',import.meta.url)),command:process.argv[2]||'fetch',archive:process.env.KYOTO_ASSET_ARCHIVE,cache:process.env.KYOTO_ASSET_CACHE});
}
