import { Client,delay } from './api-client.mjs';
import { mkdir,writeFile } from 'node:fs/promises';
const c=new Client(),results=[];await mkdir('artifacts/phase3/challenge-probes',{recursive:true});
try{
 await c.join();console.log('Joined probe');
 await c.request('select-challenge',{challengeId:null},'selected');
 for(const [name,holdMs,settings]of [['bank',110,{}],['spin',70,{top:-200}]]){
  c.messages=[];const r=await c.throw(holdMs,settings);results.push({name,holdMs,settings,...r});console.log(name,JSON.stringify({final:r.final,duration:r.result.duration,surfaces:r.result.surfaces,reason:r.result.reason}));c.send('recall');await delay(200);
 }
 // Reach the already verified moving lane through native walking inputs.
 const move=async(axis,target)=>{let began=Date.now();while(Date.now()-began<20000){const p=c.state.players.find(p=>p.id===c.id).feet,delta=target-p[axis];if(Math.abs(delta)<.06)break;c.input({fast:true,...(axis==='x'?{z:Math.sign(delta)}:{x:-Math.sign(delta)})});await delay(Math.min(150,Math.max(20,Math.abs(delta)/4.2*1000)));}c.input();await delay(200);};
 await move('x',17.8);await move('z',6.5);console.log('Lane start',c.state.players.find(p=>p.id===c.id).feet);
 c.messages=[];const r=await c.throw(340,{});results.push({name:'escalator',holdMs:340,settings:{},...r});console.log('escalator',JSON.stringify({final:r.final,duration:r.result.duration,surfaces:r.result.surfaces,reason:r.result.reason}));
 await writeFile('artifacts/phase3/challenge-probes/probes.json',JSON.stringify({scope:'Authoritative native shots driven through the local WebSocket input API; not browser-input acceptance',results},null,2));
}finally{c.close();}
