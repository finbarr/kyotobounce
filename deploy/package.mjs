import { cp, mkdir, readFile, writeFile, readdir, stat, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { resolve, join } from 'node:path';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=resolve(`artifacts/online/releases/${stamp}`);
await mkdir(output,{recursive:true});
// Explicit runtime allowlist: no local database, guest tokens, logs, tests, or editor project.
const files=['package.json','package-lock.json','web/public','web/server.ts','web/connection-queue.ts','web/performance.ts','web/shot-stream.ts','web/store.ts','web/competition.ts','web/types.ts','web/scoring.ts','web/worker.ts','web/starter-challenges.json','Builds/PhysicsWorkerLinux','deploy'];
for(const name of files)await cp(name,join(output,name),{recursive:true,filter:path=>!path.includes('web/public/assets/layouts')&&!path.split('/').some(part=>part.endsWith('_DoNotShip'))});
await mkdir(join(output,'runtime'),{recursive:true});
await cp('runtime/station-layout.json',join(output,'runtime/station-layout.json'));
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
const identity={release:stamp,node:'22.23.2',layoutSha256:createHash('sha256').update(await readFile(join(output,'runtime/station-layout.json'))).digest('hex'),workerSha256:createHash('sha256').update(await readFile(join(output,'Builds/PhysicsWorkerLinux/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll'))).digest('hex'),assetBytes:original,brotliBytes:compressed};
await writeFile(join(output,'release.json'),JSON.stringify(identity,null,2)+'\n');
await writeFile('artifacts/online/latest-release.txt',output+'\n');
console.log(JSON.stringify({output,...identity},null,2));
