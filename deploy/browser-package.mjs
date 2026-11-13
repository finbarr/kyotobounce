import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,stat,cp,rm,open} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {hashFile} from './station.mjs';
import {buildBrowser} from '../web/build-browser.mjs';
import {BROWSER_PHYSICS} from '../web/public/physics/shot.js';
import {verificationEndpoint} from '../web/public/online-scores.js';

export const STATIC_FILE_LIMIT=25*1024**2,CHUNK_BYTES=16*1024**2;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function emitAsset(output,name,source,{chunkBytes=CHUNK_BYTES}={}){
 assert(Number.isSafeInteger(chunkBytes)&&chunkBytes>0&&chunkBytes<=STATIC_FILE_LIMIT);
 const bytes=(await stat(source)).size,sha256=await hashFile(source),entry={bytes,sha256};
 if(bytes<=chunkBytes){const destination=join(output,name);await mkdir(dirname(destination),{recursive:true});await cp(source,destination);return entry;}
 const directory=`assets/chunks/${sha256}`;await mkdir(join(output,directory),{recursive:true});entry.parts=[];
 const file=await open(source,'r');
 try{
  for(let offset=0,index=0;offset<bytes;offset+=chunkBytes,index++){
   const data=Buffer.alloc(Math.min(chunkBytes,bytes-offset));let filled=0;
   while(filled<data.length){const {bytesRead}=await file.read(data,filled,data.length-filled,offset+filled);assert(bytesRead,'Asset changed during packaging');filled+=bytesRead;}
   const name=`${directory}/${String(index).padStart(4,'0')}.bin`;
   await writeFile(join(output,name),data);entry.parts.push({url:'/'+name,bytes:data.length,sha256:hash(data)});
  }
 }finally{await file.close();}
 assert.equal(await hashFile(source),sha256,'Asset changed during packaging');return entry;
}
export async function inventory(directory){
 const files={};
 async function visit(relative=''){
  for(const item of await readdir(join(directory,relative),{withFileTypes:true})){
   const name=join(relative,item.name);if(item.isDirectory())await visit(name);
   else{assert(item.isFile(),'Static release must not contain symlinks');const path=join(directory,name);files[name]={bytes:(await stat(path)).size,sha256:await hashFile(path)};}
  }
 }await visit();return files;
}
export async function packageBrowser({output=resolve('.local/browser-release'),verifier=process.env.KYOTO_VERIFY_URL}={}){
 // Reject invalid endpoint configuration before replacing the previous bundle.
 verifier=verifier==='same-origin'?verifier:verificationEndpoint(verifier);
 const station=await buildBrowser(),collision='.local/browser-physics/station.collision.bin';
 const receipt=JSON.parse(await readFile(collision+'.json','utf8'));
 assert.equal(receipt.layoutSha256,station.layoutSha256,'Run npm run assets:collision for this station');
 assert.equal(await hashFile(collision),receipt.sha256,'The collision pack must match its receipt');
 assert.equal((await stat(collision)).size,receipt.bytes);
 // Resolve the same browser import graph without changing its module layout.
 // Only dependencies actually used by the renderer go into the static bundle.
 // BVH's package export points to src/index.js, but the existing import map
 // uses its browser bundle. Resolve that exact entry when collecting files.
 const graph=await build({entryPoints:['web/public/game.js'],alias:{'three-mesh-bvh':resolve('node_modules/three-mesh-bvh/build/index.module.js')},bundle:true,write:false,metafile:true,format:'esm',platform:'browser',logLevel:'silent'});
 const kind='kyoto-static-v1';
 try{const old=JSON.parse(await readFile(join(output,'release.json'),'utf8'));assert.equal(old.kind,kind,'Refusing to replace an unrelated directory');await rm(output,{recursive:true});}
 catch(error){if(error.code!=='ENOENT')throw error;try{assert.equal((await readdir(output)).length,0,'Refusing to replace an unrelated directory');}catch(e){if(e.code!=='ENOENT')throw e;}}
 await mkdir(output,{recursive:true});await writeFile(join(output,'release.json'),JSON.stringify({kind,complete:false})+'\n');
 const write=async(name,bytes)=>{await mkdir(dirname(join(output,name)),{recursive:true});await writeFile(join(output,name),bytes);};
 async function copyPublic(relative=''){
  for(const item of await readdir(join('web/public',relative),{withFileTypes:true})){
   const name=join(relative,item.name);
   if(['assets','browser-build.json'].includes(name))continue;
   if(item.isDirectory())await copyPublic(name);
   else if(item.isFile()&&/\.(js|css|html|svg|png|jpe?g|ico|woff2)$/.test(name))await write(name,await readFile(join('web/public',name)));
  }
 }await copyPublic();
 for(const name of Object.keys(graph.metafile.inputs)){
  const match=/^node_modules\/(three|three-mesh-bvh)\/(.+)$/.exec(name);
  if(match)await write(`vendor/${match[1]==='three'?'three':'bvh'}/${match[2]}`,await readFile(name));
  else assert(!name.startsWith('node_modules/'),'Unexpected browser dependency: '+name);
 }
 for(const [source,destination]of [['LICENSE','LICENSE'],['node_modules/three/LICENSE','vendor/three/LICENSE'],['node_modules/three-mesh-bvh/LICENSE','vendor/bvh/LICENSE']])await write(destination,await readFile(source));
 let html=await readFile('web/public/index.html','utf8');
 html=html.replace('</head>',`<meta name="kyoto-assets" content="chunks-v1">${verifier?`<meta name="kyoto-verifier" content="${verifier}">`:''}</head>`);
 await write('index.html',html);
 await write('404.html','<!doctype html><meta charset="utf-8"><title>Not found · Kyoto Bounce</title><h1>Page not found</h1><a href="/">Play Kyoto Bounce</a>');
 await write('_redirects','/level/* /index.html 200\n/replay/* /index.html 200\n');
 await write('_headers','/*\n  X-Content-Type-Options: nosniff\n\n/:file\n  Cache-Control: no-cache\n\n/vendor/*\n  Cache-Control: no-cache\n\n/physics/*\n  Cache-Control: no-cache\n\n/assets/*.json\n  Cache-Control: no-cache\n\n/assets/runtime/*\n  Cache-Control: no-cache\n\n/assets/chunks/*\n  Cache-Control: public, max-age=31536000, immutable\n');
 const catalog=JSON.parse(await readFile('web/starter-challenges.json','utf8')).map(c=>({...c,physics:BROWSER_PHYSICS}));
 await write('campaign.json',JSON.stringify(catalog)+'\n');
 await write('assets/station.json',station.stationBytes);
 await write('physics-worker.js',await readFile('.local/browser-physics/worker.js'));
 const manifest={delivery:'chunks-v1',layoutSha256:station.layoutSha256,physics:BROWSER_PHYSICS,files:{}};
 for(const [name,source]of Object.entries({...station.files,'station.collision.bin':collision}))manifest.files['web/public/'+name]=await emitAsset(output,name,source);
 // Includes CSS, fonts, dependency modules and attribution; excludes private
 // source layouts, Unity, server code, databases, research and build caches.
 for(const [name,entry]of Object.entries(await inventory(output)))if(!name.startsWith('assets/chunks/')&&name!=='release.json')manifest.files['web/public/'+name]=entry;
 await write('browser-build.json',JSON.stringify(manifest)+'\n');
 const files=await inventory(output);
 assert(Object.keys(files).length<20000,'Cloudflare Pages file count limit');
 for(const [name,entry]of Object.entries(files))assert(entry.bytes<=STATIC_FILE_LIMIT,'Cloudflare Pages file size limit: '+name);
 const identity={kind,complete:true,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),layoutSha256:station.layoutSha256,physics:BROWSER_PHYSICS,campaignCount:catalog.length,verifier,files:Object.keys(files).length,bytes:Object.values(files).reduce((n,f)=>n+f.bytes,0)};
 await write('release.json',JSON.stringify(identity,null,2)+'\n');
 console.log(JSON.stringify({output,...identity},null,2));return {output,manifest,identity};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await packageBrowser();
