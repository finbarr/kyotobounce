import { assetRoots } from './asset-paths.mjs';
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const tag=process.argv[2];
if(!tag||!/^assets-v\d+$/.test(tag))throw new Error('Usage: npm run assets:pack -- assets-vN (use a new version for changed assets)');
const hash=async p=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
const files={};
async function walk(path){
 const info=await stat(join(root,path));
 if(info.isDirectory()){for(const name of (await readdir(join(root,path))).sort())if(!name.startsWith('.')&&!name.endsWith('.blend1'))await walk(path+'/'+name);}
 else if(info.isFile())files[path]={bytes:info.size,sha256:await hash(join(root,path))};
}
for(const path of assetRoots)await walk(path);
const out=join(root,'artifacts/open-source');await mkdir(out,{recursive:true});
const name='kyoto-'+tag+'.tar.gz',archive=join(out,name);
const packed=spawnSync('tar',[...(process.platform==='darwin'?['--no-xattrs','--no-mac-metadata']:[]),'-czf',archive,'-C',root,...Object.keys(files)],{stdio:'inherit',env:{...process.env,COPYFILE_DISABLE:'1'}});
if(packed.status!==0)throw new Error('Asset packaging failed');
await writeFile(join(root,'assets-manifest.json'),JSON.stringify({version:tag,license:'MIT',archive:{url:`https://github.com/finbarr/kyotobounce/releases/download/${tag}/${name}`,bytes:(await stat(archive)).size,sha256:await hash(archive)},files},null,2)+'\n');
console.log('Packaged '+Object.keys(files).length+' assets: '+archive);
