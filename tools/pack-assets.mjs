import {currentAssetPaths} from './asset-paths.mjs';
import {stat,mkdir,writeFile,readFile,rename,rm,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {resolve,join} from 'node:path';
import {stationRelease,hashFile} from '../deploy/station.mjs';
const tag=process.argv[2];
if(!tag||!/^assets-v\d+$/.test(tag))throw Error('Usage: npm run assets:pack -- assets-vN (use a new unpublished version)');
const root=process.cwd(),configBytes=await readFile('web/v2/assets.json'),config=JSON.parse(configBytes);
if(process.env.KYOTO_V2_ASSETS)throw Error('Promote the intended station to web/v2/assets.json before packaging');
const station=await stationRelease();delete station.layoutBytes;
const files={};
for(const path of currentAssetPaths(config)){
 const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink())throw Error('Pack only regular current asset files: '+path);
 files[path]={bytes:info.size,sha256:await hashFile(path)};
}
const directory=resolve('.local/asset-pack');await mkdir(directory,{recursive:true});
const name='kyoto-'+tag+'.tar.gz',archive=join(directory,name),partial=archive+'.part';
try{await stat(archive);throw Error('Archive already exists; do not overwrite a versioned pack: '+archive);}catch(error){if(error.code!=='ENOENT')throw error;}
try{
 await new Promise((resolve,reject)=>{
  const child=spawn('tar',[...(process.platform==='darwin'?['--no-xattrs','--no-mac-metadata']:[]),'-czf',partial,'-C',root,...Object.keys(files)],{stdio:'inherit',env:{...process.env,COPYFILE_DISABLE:'1'}});
  child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error('Asset packaging failed: '+(code??signal))));
 });
 for(const [path,entry] of Object.entries(files))if(await hashFile(path)!==entry.sha256)throw Error('Asset changed while packaging: '+path);
 await rename(partial,archive);
 const manifest={kind:'kyoto-game-assets-v1',version:tag,license:'MIT; Kyoto City municipal geometry CC-BY-4.0 (see web/public/credits.html)',stationManifestSha256:createHash('sha256').update(configBytes).digest('hex'),layoutSha256:station.layoutSha256,archive:{url:`https://github.com/finbarr/kyotobounce/releases/download/${tag}/${name}`,bytes:(await stat(archive)).size,sha256:await hashFile(archive)},files};
 await writeFile('assets-manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({output:archive,...manifest},null,2));
}finally{await rm(partial,{force:true});}
