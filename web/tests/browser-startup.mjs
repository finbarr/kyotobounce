import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

const output='.local/browser-startup-test';await mkdir(output,{recursive:true});
await writeFile(output+'/receipt.json',JSON.stringify({passed:false})+'\n');
const catalog=JSON.parse(await readFile('web/starter-challenges.json'));
const children=new Set(),commands=[];
function run(args,env={}){
 const child=spawn('npm',args,{env:{...process.env,KYOTO_WORKER_EXECUTABLE:'/kyoto-native-runtime-disabled',UNITY_EDITOR:'/kyoto-native-runtime-disabled',KYOTO_VERIFY_URL:'',...env},stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
 const state={child,log:'',closed:false};children.add(state);
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{state.log+=data;process.stdout.write(data);});
 state.done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>{state.closed=true;children.delete(state);resolve({code,signal});});});
 commands.push(args.join(' '));return state;
}
async function port(){
 const server=http.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const p=server.address().port;await new Promise(resolve=>server.close(resolve));return p;
}
async function ready(state,origin){
 const deadline=Date.now()+120000;
 while(Date.now()<deadline){
  assert(!state.closed,'Preview exited before becoming ready: '+state.log);
  try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}
  await delay(250);
 }
 throw Error('Preview has not become ready; process remains live: '+state.log);
}
async function stop(state,p){
 if(process.platform==='darwin')assert.equal((await run(['stop','--',String(p)]).done).code,0);
 else process.kill(-state.child.pid,'SIGINT');
 await Promise.race([state.done,delay(10000).then(()=>{throw Error('Preview did not exit');})]);
}
let unrelated;
try{
 const invalid=run(['start','--','1e4']);assert.notEqual((await invalid.done).code,0);assert.match(invalid.log,/Choose a local port/);
 const p=await port(),origin='http://127.0.0.1:'+p;
 const start=run(['start'],{KYOTO_PORT:String(p)});await ready(start,origin);
 for(const path of ['/','/index.html','/level/atrium-welcome','/replay/test-replay']){
  const response=await fetch(origin+path);assert.equal(response.status,200);
  assert.match(await response.text(),/name="kyoto-runtime" content="browser"/);
 }
 const campaign=await (await fetch(origin+'/campaign.json')).json();assert.equal(campaign.length,30);
 const manifest=await (await fetch(origin+'/browser-build.json')).json();assert.equal(manifest.layoutSha256,catalog[0].layout);
 assert(campaign.every(c=>c.layout===manifest.layoutSha256&&c.physics===manifest.physics));
 for(const path of ['/physics-worker.js','/station.collision.bin','/assets/runtime/atrium.glb']){
  const response=await fetch(origin+path,{method:'HEAD'});assert.equal(response.status,200);
  assert.equal(Number(response.headers.get('content-length')),manifest.files['web/public'+path].bytes);
 }
 for(const path of ['/api/health','/api/scores','/assets/atrium.glb','/web/server.ts','/assets/runtime/optimization.json'])assert.equal((await fetch(origin+path)).status,404,path);
 assert.equal((await fetch(origin,{method:'POST'})).status,405);
 assert.equal((await run(['run','test:browser:local'],{KYOTO_TEST_ORIGIN:origin,KYOTO_TEST_OUTPUT:output+'/game',KYOTO_TEST_STATIC:''}).done).code,0);
 const gameplay=JSON.parse(await readFile(output+'/game/receipt.json'));assert.equal(gameplay.passed,true);
 await stop(start,p);
 const p2=await port(),dev=run(['run','dev','--',String(p2)],{KYOTO_PORT:'1'});
 await ready(dev,'http://127.0.0.1:'+p2);await stop(dev,p2);
 if(process.platform==='darwin'){
  unrelated=http.createServer((req,res)=>res.end('unrelated'));
  await new Promise(resolve=>unrelated.listen(0,'127.0.0.1',resolve));const other=unrelated.address().port;
  assert.equal((await run(['stop','--',String(other)]).done).code,0);
  assert.equal(await (await fetch('http://127.0.0.1:'+other)).text(),'unrelated');
 }
 await writeFile(output+'/receipt.json',JSON.stringify({passed:true,commands,layout:manifest.layoutSha256,physics:manifest.physics,gameplay:output+'/game/receipt.json'},null,2)+'\n');
 console.log('PASS default browser startup, environment/CLI ports, offline play, shutdown and unrelated-process protection');
}finally{
 if(unrelated)await new Promise(resolve=>unrelated.close(resolve));
 for(const state of children)if(!state.closed){if(process.platform==='win32')state.child.kill('SIGTERM');else process.kill(-state.child.pid,'SIGTERM');}
 await Promise.all([...children].map(state=>state.done));
}
