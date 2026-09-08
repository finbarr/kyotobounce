// One requested geometry-only Linux capacity smoke; no production/history writes.
import {readFile,writeFile,mkdir,readdir,symlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve('.'),candidate=resolve(process.argv[2]||'.local/assembly-v4'),app=resolve('.local/assembly-capacity-app');
await mkdir(app); // Never reuse another load experiment.
await mkdir(app+'/web');
for(const name of ['node_modules','package.json','package-lock.json'])await symlink(root+'/'+name,app+'/'+name);
await symlink(candidate,app+'/runtime');
for(const name of await readdir(root+'/web'))if(!['public','starter-challenges.json'].includes(name))await symlink(root+'/web/'+name,app+'/web/'+name);
await symlink(candidate+'/public',app+'/web/public');
const layout=createHash('sha256').update(await readFile(candidate+'/station-layout.json')).digest('hex');
const first=JSON.parse(await readFile('web/starter-challenges.json')).find(c=>c.id==='atrium-first-bank');
if(!first)throw Error('First Bank fixture missing');
await writeFile(app+'/web/starter-challenges.json',JSON.stringify([{...first,layout,revision:1,name:'Assembly capacity fixture'}]));
const result=spawnSync(process.execPath,['web/bench/capacity.mjs'],{cwd:app,stdio:'inherit',env:{...process.env,
 KYOTO_LAYOUT:candidate+'/station-layout.json',KYOTO_WORKER_EXECUTABLE:'/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64',
 CAPACITY_LEVELS:'1,16',CAPACITY_REPS:'1',CAPACITY_SECONDS:'10',CAPACITY_WARMUP:'2',CAPACITY_OUTPUT:app+'/.local/capacity'}});
await writeFile(candidate+'/capacity-scope.json',JSON.stringify({layout,status:result.status===0?'completed':'failed',exitCode:result.status,
 scope:'Geometry-only Linux smoke: baseline 4ee2976 service and combined K025/K027/K028/K029 geometry; latest renderer/avatar changes not included.',
 fixture:'Unchanged First Bank geometry rebound to candidate hash in this fresh private database only.',
 receipt:app+'/.local/capacity/summary.json'},null,2));
process.exitCode=result.status??1;
