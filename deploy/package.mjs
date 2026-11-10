import { cp, mkdir, readFile, writeFile, readdir, stat, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { resolve, join } from 'node:path';
import {execFileSync} from 'node:child_process';
import {stationRelease,hashFile} from './station.mjs';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=resolve(`artifacts/online/releases/${stamp}`);
// Do not silently package a source-only checkout after switching to delivery GLBs.
const browserBuild=JSON.parse(await readFile('web/public/browser-build.json','utf8'));
for(const name of ['atrium.glb','atrium-detail.glb','ori.glb','optimization.json']){
 const file='web/public/assets/runtime/'+name;
 const checksum=createHash('sha256').update(await readFile(file)).digest('hex');
 if(browserBuild.files[file]?.sha256!==checksum)throw Error('Run npm run build:web before packaging: '+file);
}
await mkdir(output,{recursive:true});
const station=await stationRelease();
// Explicit runtime allowlist: no local database, guest tokens, logs, tests, or editor project.
const files=['LICENSE','package.json','package-lock.json','web/public','web/server.ts','web/social-metadata.ts','web/connection-queue.ts','web/performance.ts','web/shot-stream.ts','web/store.ts','web/replay-cache.ts','web/replay-http.ts','web/level-http.ts','web/competition.ts','web/types.ts','web/scoring.ts','web/worker.ts','web/macos-worker.ts','web/stop.mjs','web/starter-challenges.json','Builds/PhysicsWorkerLinux','deploy'];
// The old authoring exports are not the current station. Copy only the verified
// v2 delivery assets below, and never carry old compressed siblings into a release.
for(const name of files)await cp(name,join(output,name),{recursive:true,filter:path=>resolve(path)!==resolve('web/public/assets')&&!path.split('/').some(part=>part.endsWith('_DoNotShip')||part.startsWith('._'))});
await mkdir(join(output,'runtime'),{recursive:true});
await writeFile(join(output,'runtime/station-layout.json'),station.layoutBytes);
await mkdir(join(output,'web/public/assets/runtime'),{recursive:true});
await writeFile(join(output,'web/public/assets/station.json'),station.stationBytes);
for(const [destination,source]of Object.entries(station.files))await cp(source,join(output,'web/public',destination));
delete browserBuild.files['web/public/assets/runtime/optimization.json'];
for(const name of ['assets/station.json',...Object.keys(station.files)]){
 const file=join(output,'web/public',name);browserBuild.files['web/public/'+name]={bytes:(await stat(file)).size,sha256:await hashFile(file)};
}
browserBuild.scope='Kyoto Bounce v2: current station, 30 courses and authoritative waypoint scoring';
await writeFile(join(output,'web/public/browser-build.json'),JSON.stringify(browserBuild,null,2)+'\n');
await chmod(join(output,'Builds/PhysicsWorkerLinux/KyotoPhysicsWorker.x86_64'),0o755);
await chmod(join(output,'deploy/backup.sh'),0o755);
let original=0,compressed=0;
async function compressAssets(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory()){await compressAssets(path);continue;}
  if(!entry.isFile()||!entry.name.match(/\.(glb|json)$/))continue;
  const data=await readFile(path);
  const br=brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:6}});
  await writeFile(path+'.br',br);await writeFile(path+'.gz',gzipSync(data,{level:6}));
  original+=data.length;compressed+=br.length;
 }
}
await compressAssets(join(output,'web/public/assets'));
const identity={release:stamp,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),stationVersion:'v2',campaignCount:30,node:process.versions.node,layoutSha256:station.layoutSha256,sourceLayoutSha256:station.sourceLayoutSha256,workerSha256:await hashFile(join(output,'Builds/PhysicsWorkerLinux/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll')),assetBytes:original,brotliBytes:compressed};
await writeFile(join(output,'release.json'),JSON.stringify(identity,null,2)+'\n');
await writeFile('artifacts/online/latest-release.txt',output+'\n');
console.log(JSON.stringify({output,...identity},null,2));
