import { readFile, mkdir, stat, copyFile, mkdtemp, rm, rename } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(join(root,'assets-manifest.json'),'utf8'));
const command=process.argv[2]||'fetch';
if(!['fetch','verify'].includes(command))throw new Error('Usage: node tools/assets.mjs [fetch|verify]');
const hash=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');};
const validPath=p=>typeof p==='string'&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(s=>s==='..'||s==='.'||!s);
const missing=[];const changed=[];
for(const [name,expected] of Object.entries(manifest.files)){
  if(!validPath(name))throw new Error('Invalid manifest path');
  const path=join(root,name),info=await stat(path).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(!info)missing.push(name);
  else if(!info.isFile()||info.size!==expected.bytes||await hash(path)!==expected.sha256)changed.push(name);
}
if(changed.length)throw new Error('Local assets differ from the release; nothing was overwritten. Preserve your edits or move these files aside before fetching:\n'+changed.join('\n'));
if(!missing.length){console.log('All release assets verified.');process.exit(0);}
if(command==='verify')throw new Error('Missing assets. Run npm run assets:fetch.\n'+missing.join('\n'));
const cache=process.env.KYOTO_ASSET_CACHE||join(homedir(),'.cache','kyotobounce');
await mkdir(cache,{recursive:true});
const archive=join(cache,manifest.archive.sha256+'.tar.gz');
const cached=await stat(archive).catch(()=>null);
if(!cached||await hash(archive)!==manifest.archive.sha256){
  console.log('Downloading editable art and runtime assets…');
  const response=await fetch(manifest.archive.url);
  if(!response.ok||!response.body)throw new Error('Asset download failed: '+response.status);
  const partial=archive+'.'+process.pid+'.part';
  try{
    await pipeline(response.body,createWriteStream(partial));
    if(await hash(partial)!==manifest.archive.sha256)throw new Error('Asset archive checksum mismatch');
    // Publish atomically: another worktree must never read a half-written cache entry.
    await rename(partial,archive);
  }finally{await rm(partial,{force:true});}
}
const temp=await mkdtemp(join(tmpdir(),'kyoto-assets-'));
try{
  const list=spawnSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:4*1024*1024});
  if(list.status!==0)throw new Error(list.stderr||'Cannot list asset archive');
  const names=list.stdout.trim().split('\n');
  if(names.length!==Object.keys(manifest.files).length||new Set(names).size!==names.length||names.some(n=>!validPath(n)||!manifest.files[n]))throw new Error('Unexpected asset archive entry');
  const unpack=spawnSync('tar',['-xzf',archive,'-C',temp],{encoding:'utf8'});
  if(unpack.status!==0)throw new Error(unpack.stderr||'Cannot unpack asset archive');
  for(const name of missing){
    const src=join(temp,name),expected=manifest.files[name];
    if((await stat(src)).size!==expected.bytes||await hash(src)!==expected.sha256)throw new Error('Asset checksum mismatch: '+name);
  }
  for(const name of missing){await mkdir(dirname(join(root,name)),{recursive:true});await copyFile(join(temp,name),join(root,name),1);}
  console.log(`Installed ${missing.length} verified assets. Original .blend sources are in art-source/.`);
}finally{await rm(temp,{recursive:true,force:true});}
