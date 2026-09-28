import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,symlink,readlink,access,stat,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
process.chdir(root);
const port=process.argv[2]||'4425';
assert(/^\d+$/.test(port)&&Number(port)>=1024&&Number(port)<=65535,'Choose a port from 1024 to 65535');
const config=JSON.parse(await readFile('web/v2/assets.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function hashFile(path){const digest=createHash('sha256');for await(const chunk of createReadStream(path))digest.update(chunk);return digest.digest('hex');}
const json=p=>readFile(resolve(p),'utf8').then(JSON.parse);
const source=await readFile(config.layout);
assert.equal(hash(source),config.layoutSha256,'V2 source layout changed; update its asset receipt');
assert.equal(await hashFile(config.geometry),config.geometrySha256,'V2 station geometry changed; update its asset receipt');
if(config.hardware)assert.equal(await hashFile(config.hardware),config.hardwareSha256,'V2 hardware geometry changed');
const layout=JSON.parse(source),station=await json(config.station),detail=await json(config.detail),motionBytes=await readFile(config.motionLayout);
assert.equal(station.layoutSha256,hash(source),'Visual and collision exports must match');
assert.equal(hash(motionBytes),detail.candidateMotionIntegration.layoutSha256,'Unknown moving-step source');
assert.deepEqual(layout.escalators,JSON.parse(motionBytes).escalators,'Moving escalators changed since their detail export');
for(const support of layout.architecture.hallBasementIntegration.componentCombSupports)
 assert.deepEqual(detail.combSupports.find(s=>s.support===support.support),support,'Moving-step endpoints must match collision');
for(const support of layout.architecture.westCirculationV2?.combSupports||[])
 assert.deepEqual(detail.combSupports.find(s=>s.support===support.support),support,'Western moving-step endpoints must match collision');
// Only the entry position changes. No geometry export or asset duplication is needed.
layout.spawn=config.spawn;
const layoutBytes=JSON.stringify(layout)+'\n',layoutSha256=hash(layoutBytes);
station.spawn=config.spawn;station.layoutSha256=layoutSha256;
const local=resolve('.local/v2',port),overlay=resolve(local,'public');
await mkdir(resolve(overlay,'assets/runtime'),{recursive:true});
await mkdir(resolve(local,'data'),{recursive:true});
await writeFile(resolve(local,'station-layout.json'),layoutBytes);
await writeFile(resolve(overlay,'assets/station.json'),JSON.stringify(station)+'\n');
const previous=await readFile(resolve(local,'asset-receipt.json'),'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(!config.hardware&&previous?.hardware){
 const destination=resolve(overlay,'assets/runtime/atrium-detail.glb');
 const existing=await readlink(destination).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(existing){assert.equal(existing,resolve(previous.hardware),'Refusing to remove untracked hardware');await unlink(destination);}
}
const replacements={'assets/runtime/atrium.glb':config.geometry,'assets/atrium-detail.json':config.detail};
if(config.hardware)replacements['assets/runtime/atrium-detail.glb']=config.hardware;
for(const [name,sourcePath] of Object.entries(replacements)){
 const destination=resolve(overlay,name),target=resolve(sourcePath);
 try{await symlink(target,destination);}catch(error){if(error.code!=='EEXIST')throw error;const existing=await readlink(destination);if(existing!==target){const managed=name==='assets/runtime/atrium.glb'?previous?.geometry:name==='assets/runtime/atrium-detail.glb'?previous?.hardware:previous?.detail;assert(managed&&existing===resolve(managed),'Refusing to overwrite an untracked local asset');await unlink(destination);await symlink(target,destination);}}
}
const build=await json('web/public/browser-build.json');
for(const name of ['assets/station.json',...Object.keys(replacements)]){
 const path=resolve(overlay,name);build.files['web/public/'+name]={bytes:(await stat(path)).size,sha256:await hashFile(path)};
}
build.scope='Local Kyoto Bounce v2; latest reconstructed station and free exploration';
await writeFile(resolve(overlay,'browser-build.json'),JSON.stringify(build,null,2)+'\n');
const receipt={...config,layoutSha256,sourceLayoutSha256:hash(source),spawnOnly:true,port,publicOverlay:overlay,createdAt:new Date().toISOString()};
await writeFile(resolve(local,'asset-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
const worker=process.env.KYOTO_WORKER_EXECUTABLE;
if(worker)await access(worker);
console.log(`Kyoto Bounce v2: http://127.0.0.1:${port}\nAsset receipt: ${local}/asset-receipt.json`);
const child=spawn(process.execPath,['web/server.ts'],{stdio:'inherit',env:{...process.env,KYOTO_PORT:port,KYOTO_PUBLIC_OVERLAY:overlay,KYOTO_LAYOUT:resolve(local,'station-layout.json'),KYOTO_DATA_DIR:resolve(local,'data'),KYOTO_WORKER_LOG:resolve(local,'worker.log')}});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
