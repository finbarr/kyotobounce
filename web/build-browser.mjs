import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {socialPage} from './social-metadata.ts';
import {stationRelease,hashFile} from '../deploy/station.mjs';
import {buildRuntimeAssets} from '../tools/optimize-browser-assets.mjs';
import {buildCollisionPack} from '../tools/browser-collision.mjs';
import {buildBrowserPhysics} from './build-physics.mjs';
import {BROWSER_PHYSICS} from './public/physics/shot.js';

// Use the current station in place. Never regenerate the retired root station
// or write a half-gigabyte layout/asset overlay for each preview port.
export async function buildBrowser(){
 const station=await stationRelease();
 await buildCollisionPack(station.layoutBytes);delete station.layoutBytes;
 await buildRuntimeAssets({names:['ori.glb']});
 await buildBrowserPhysics();
 const graph=await build({entryPoints:['web/public/game.js'],alias:{'three-mesh-bvh':resolve('node_modules/three-mesh-bvh/build/index.module.js')},bundle:true,write:false,metafile:true,format:'esm',platform:'browser',logLevel:'silent'});
 const shellPath='web/public/index.html',shell=await readFile(shellPath,'utf8'),socialShell=socialPage(shell,{});
 if(shell!==socialShell)await writeFile(shellPath,socialShell);
 const manifest={builtUtc:new Date().toISOString(),renderer:'three-0.185.1',scope:'Browser game: current station and dedicated physics worker',layoutSha256:station.layoutSha256,physics:BROWSER_PHYSICS,files:{}};
 const record=async(name,file)=>{manifest.files[name]={bytes:(await stat(file)).size,sha256:await hashFile(file)};};
 async function publicFiles(directory){
  for(const item of await readdir(directory,{withFileTypes:true})){
   const file=directory+'/'+item.name;
   if(file==='web/public/assets'||file==='web/public/browser-build.json')continue;
   if(item.isDirectory())await publicFiles(file);
   else if(item.isFile()&&/\.(js|css|html|svg|png|jpe?g|ico|woff2)$/.test(file))await record(file,file);
  }
 }
 await publicFiles('web/public');
 for(const file of Object.keys(graph.metafile.inputs))await record(file,file);
 for(const [name,file] of Object.entries(station.files))await record('web/public/'+name,file);
 await record('web/public/physics-worker.js','.local/browser-physics/worker.js');
 await record('web/public/station.collision.bin','.local/browser-physics/station.collision.bin');
 manifest.files['web/public/assets/station.json']={bytes:Buffer.byteLength(station.stationBytes),sha256:createHash('sha256').update(station.stationBytes).digest('hex')};
 await record('web/starter-challenges.json','web/starter-challenges.json');
 await writeFile('web/public/browser-build.json',JSON.stringify(manifest,null,2)+'\n');
 return {...station,manifest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await buildBrowser();console.log('Browser game ready. Start local play: npm start');
}
