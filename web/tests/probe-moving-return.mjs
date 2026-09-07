import { Client,delay } from './api-client.mjs';
import { readFile,writeFile } from 'node:fs/promises';
const c=new Client(),challenge=JSON.parse(await readFile('web/starter-challenges.json','utf8')).find(c=>c.id==='atrium-moving-return'),results=[];
const settings={yaw:90,pitch:-30,top:-100,kick:0},holdMs=420,period=challenge.hint.period;
try{
 await c.join();
 for(const phase of [.2,.2,.6]){
  await c.request('select-challenge',{challengeId:challenge.id,revision:challenge.revision},'selected');await c.request('select-challenge',{challengeId:null},'selected');
  c.input(settings);await delay(150);
  const clock=()=>c.state.stationTime+(performance.now()-c.stateReceived)/1000;
  const target=phase+Math.ceil((clock()+holdMs/1000+.4-phase)/period)*period;
  await delay(Math.max(0,(target-.14-holdMs/1000-clock())*1000));
  const done=c.next(m=>['result','error','notice'].includes(m.type),40000);
  c.send('charge',{challengeId:null,revision:null,layout:c.state.layout,physics:c.state.physics});await delay(holdMs);c.send('release');const result=await done;
  if(result.type!=='result')throw new Error(result.message);await delay(100);results.push({phase,actualPhase:result.releaseTime%period,holdMs,settings,result,final:c.state.ball,velocity:c.state.velocity,contacts:c.messages.filter(m=>m.type==='impact'&&m.qualifying)});
  console.log(JSON.stringify({phase,actual:results.at(-1).actualPhase,duration:result.duration,surfaces:result.surfaces,final:c.state.ball,power:result.thrower.power,contacts:[...new Set(results.at(-1).contacts.map(m=>m.surface))]}));
  c.messages=[];
 }
 await writeFile('artifacts/phase3/challenge-probes/moving-return-controlled.json',JSON.stringify({scope:'Three bounded native API shots to choose a playable moving-bank hint; not DOM acceptance',results},null,2));
}finally{c.close();}
