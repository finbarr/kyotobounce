// Assemble a private serving root without overwriting release files or archives.
import {mkdir,readdir,symlink,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
const root=resolve('.'),candidate=resolve('.local/station-detail/candidate'),scratch=resolve('.local/station-detail/preview');
async function link(src,dst){await symlink(src,dst).catch(e=>{if(e.code!=='EEXIST')throw e;});}
await mkdir(`${scratch}/web/public/assets`,{recursive:true});
await link(`${root}/node_modules`,`${scratch}/node_modules`);await link(`${root}/runtime`,`${scratch}/runtime`);
for(const f of ['package.json','package-lock.json'])await link(`${root}/${f}`,`${scratch}/${f}`);
for(const f of await readdir(`${root}/web`))if(!['public','starter-challenges.json'].includes(f))await link(`${root}/web/${f}`,`${scratch}/web/${f}`);
for(const f of await readdir(`${root}/web/public`))if(!['assets','browser-build.json'].includes(f))await link(`${root}/web/public/${f}`,`${scratch}/web/public/${f}`);
const overrides=['atrium.glb','station.json','atrium-detail.glb','atrium-detail.json'];
for(const f of await readdir(`${root}/web/public/assets`))if(!overrides.includes(f))await link(`${root}/web/public/assets/${f}`,`${scratch}/web/public/assets/${f}`);
for(const f of overrides)await copyFile(`${candidate}/browser/${f}`,`${scratch}/web/public/assets/${f}`);
const hash=createHash('sha256').update(await readFile(`${candidate}/station-layout.json`)).digest('hex');
// Private test-only revisions retain canonical starts/targets and hints; runtime
// must prove scoring afresh. No historical DB, archive or registry is modified.
const starters=JSON.parse(await readFile(`${root}/web/starter-challenges.json`));
for(const c of starters){c.layout=hash;c.name=`K027 private ${c.name}`;}
await writeFile(`${scratch}/web/starter-challenges.json`,JSON.stringify(starters));
const assembly=createHash('sha256').update(await readFile('/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll')).digest('hex');
if(assembly!=='9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef')throw new Error('Incompatible immutable worker');
const built=spawnSync('npm',['run','build:web'],{cwd:scratch,stdio:'inherit'});if(built.status!==0)throw new Error('Candidate browser build failed');
const child=spawn(process.execPath,[`${root}/web/server.ts`],{cwd:scratch,stdio:'inherit',env:{...process.env,KYOTO_PORT:'4283',KYOTO_LAYOUT:`${candidate}/station-layout.json`,KYOTO_DATA_DIR:`${root}/.local/4283/candidate-${hash.slice(0,12)}`,KYOTO_WORKER_LOG:`${root}/.local/4283/candidate-${hash.slice(0,12)}.worker.log`,KYOTO_WORKER_EXECUTABLE:'/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1;});
