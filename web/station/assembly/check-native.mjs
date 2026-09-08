// Reuse reviewed feature probes against ONE combined candidate and isolated port.
// Temporary adapters change only input/output paths; assertion bodies stay intact.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const candidate=resolve(process.argv[2]||'.local/assembly');
const mode=process.argv[3]||'service';
const evidence=resolve(candidate,'evidence');
await mkdir(evidence,{recursive:true});
const worker='/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64';
const hash=b=>createHash('sha256').update(b).digest('hex');
const assembly=hash(await readFile(worker.replace('KyotoPhysicsWorker.x86_64','KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll')));
if(assembly!=='9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef')throw Error('Worker identity mismatch');
const layout=hash(await readFile(candidate+'/station-layout.json'));
await writeFile(evidence+'/manifest.json',JSON.stringify({layoutSha256:layout}));
function run(args){const p=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,KYOTO_WORKER_EXECUTABLE:worker}});if(p.status!==0)throw Error('Probe failed: '+args.join(' '));}
async function adapted(file,replacements){
 let code=await readFile(file,'utf8');
 for(const [from,to] of replacements){if(!code.includes(from))throw Error('Probe adapter drift: '+from);code=code.replaceAll(from,to);}
 code=code.replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,q,ref)=>'from '+JSON.stringify(pathToFileURL(resolve(dirname(file),ref)).href));
 const target=resolve(evidence,file.split('/').at(-1));await writeFile(target,code);run([target]);
}
if(mode==='direct'){
 run(['tools/probe_structural_native.mjs',candidate+'/station-layout.json','web/station/heart-in/native-cases.json',evidence+'/heart-in.json']);
 run(['web/tests/heart-in-native-check.mjs',evidence+'/heart-in.json']);
 await adapted('web/tests/plaza-landmarks-native.mjs',[
  ["resolve('artifacts/station-detail/plaza-landmarks'),candidate=dir+'/candidate'",`resolve(${JSON.stringify(evidence)}),candidate=${JSON.stringify(candidate)}`],
 ]);
}else if(mode==='service'){
 await adapted('web/tests/east-square-native.mjs',[
  ['ws://127.0.0.1:4283','ws://127.0.0.1:4288'],
  ['artifacts/station-detail/east-square/native.json',evidence+'/east-square-native.json'],
  ['.local/station-detail/candidate/station-layout.json',candidate+'/station-layout.json'],
 ]);
 for(const file of ['web/tests/station-exhibits-runtime.mjs','web/tests/station-exhibits-faces.mjs'])await adapted(file,[
  ['ws://127.0.0.1:4285','ws://127.0.0.1:4288'],
  ['.local/station-detail/candidate/manifest.json',evidence+'/manifest.json'],
  ['.local/station-detail/',evidence+'/'],
 ]);
}else throw Error('Unknown mode');
await writeFile(evidence+'/'+mode+'-checks.json',JSON.stringify({status:'pass',layout,assembly,mode},null,2));
