// Private candidate static root, port 4288, fresh database and worker log.
import {readFile,writeFile,mkdir,readdir,symlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const candidate=resolve(process.argv[2]||'.local/assembly'),root=resolve(candidate,'public');
await mkdir(root+'/assets',{recursive:true});
const replacements=new Set(['atrium.glb','station.json','atrium-detail.glb','atrium-detail.json']);
async function link(from,to){await symlink(from,to).catch(e=>{if(e.code!=='EEXIST')throw e;});}
for(const f of await readdir('web/public'))if(f!=='assets')await link(resolve('web/public',f),root+'/'+f);
for(const f of await readdir('web/public/assets'))await link(replacements.has(f)?candidate+'/browser/'+f:resolve('web/public/assets',f),root+'/assets/'+f);
let code=await readFile('web/server.ts','utf8');
const needle="const root = resolve('web/public');";
if(!code.includes(needle))throw Error('Review candidate static-root adapter');
code=code.replace(needle,`const root = ${JSON.stringify(root)};`).replace(/from (['"])\.\/(.*?)\1/g,(_,q,path)=>`from ${JSON.stringify(resolve('web',path))}`);
await writeFile(candidate+'/server.ts',code);
const child=spawn(process.execPath,[candidate+'/server.ts'],{stdio:'inherit',env:{...process.env,KYOTO_PORT:'4288',KYOTO_LAYOUT:candidate+'/station-layout.json',KYOTO_DATA_DIR:resolve('.local/4288/data'),KYOTO_WORKER_LOG:resolve('.local/4288/worker.log'),KYOTO_WORKER_EXECUTABLE:'/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exitCode=code??1);
