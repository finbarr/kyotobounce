import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const reservation=http.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
const origin='http://127.0.0.1:'+port,env={...process.env,KYOTO_VERIFY_URL:'',KYOTO_TEST_ORIGIN:origin,KYOTO_WORKER_EXECUTABLE:'/kyoto-native-runtime-disabled',UNITY_EDITOR:'/kyoto-native-runtime-disabled'},children=[];
function run(args){
 const child=spawn(process.execPath,args,{env,stdio:'inherit'}),state={child,done:new Promise((resolve,reject)=>{child.once('exit',(code,signal)=>resolve({code,signal}));child.once('error',reject);})};children.push(state);return state;
}
try{
 const preview=run(['web/browser-dev.mjs',String(port)]),deadline=Date.now()+120000;let ready=false;
 while(Date.now()<deadline){assert.equal(preview.child.exitCode,null,'Preview stopped');try{ready=(await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok;if(ready)break;}catch{}await delay(250);}
 assert(ready,'Preview did not become ready');assert.equal((await run(['web/tests/browser-online.mjs','--d1']).done).code,0);
}finally{
 for(const {child}of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
 await Promise.all(children.map(c=>c.done));
}
