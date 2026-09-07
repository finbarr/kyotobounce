import { Store } from '../store.ts';
import { Client } from './api-client.mjs';
import { readFile,writeFile } from 'node:fs/promises';
const probes=JSON.parse(await readFile('artifacts/phase3/challenge-probes/probes.json','utf8')).results;
const movingCandidate=JSON.parse(await readFile('artifacts/phase3/challenge-probes/moving-return-candidate.json','utf8').catch(()=>'null'));
const layout=JSON.parse(await readFile('web/public/assets/station.json','utf8'));
const lane=layout.escalators.find(l=>l.id==='east-concourse-lower-escalator-1');
let length=0;for(let i=1;i<lane.path.length;i++){
 const a=lane.path[i-1],b=lane.path[i];const d=['x','y','z'].map(k=>Math.fround(Math.fround(b[k])-Math.fround(a[k])));
 length+=Math.fround(Math.sqrt(Math.fround(Math.fround(Math.fround(d[0]*d[0])+Math.fround(d[1]*d[1]))+Math.fround(d[2]*d[2]))));
}
const period=length/lane.stepCount/Math.abs(lane.speed),client=new Client(),challenges=[];
try{
 await client.join();await client.request('select-challenge',{challengeId:null},'selected');
 for(const [i,p]of probes.entries()){
  if(i===2&&movingCandidate){const c=movingCandidate.challenge;c.start=await client.place(c.start.center,c.start.radius,'start');c.goal=await client.place(c.goal.center,c.goal.radius,'goal');challenges.push(c);continue;}
  const start=await client.place(p.result.thrower.feet,i===2?.25:.75,'start'),goal=await client.place(p.final,[1.25,.65,.6][i],'goal');
  const holdMs=Math.round(Math.sqrt(p.result.thrower.power)*1200),name=['First Bank','Return Ticket','Moving Return'][i];
  const hint={yaw:90,pitch:15,top:p.settings.top||0,kick:0,holdMs,note:i===0?`A gentle floor bank. Set the suggested aim and release near ${Math.round(holdMs/12)}% power.`:i===1?`Strong backspin brings the ball back. Release near ${Math.round(holdMs/12)}% power.`:`Hit the moving tread, then settle behind the start. Aim for ${Math.round(holdMs/12)}% power and the green release mark.`};
  if(i===2){hint.period=period;hint.releasePhase=p.result.releaseTime%period;}
  challenges.push({id:['atrium-first-bank','atrium-return-ticket','atrium-moving-return'][i],revision:1,name,creator:'station',order:i,start,goal,layout:client.state.layout,physics:client.state.physics,hint,...(i===2?{requiredSurface:lane.id}:{})});
  console.log('Prepared',name,JSON.stringify({start:start.center,goal:goal.center,holdMs,period:i===2?period:undefined}));
 }
 await writeFile('web/starter-challenges.json',JSON.stringify(challenges,null,2)+'\n');
 const store=new Store('web/data/kyoto.sqlite');try{for(const c of challenges)if(!store.challenge(c.id,c.revision))store.saveChallenge(c);}finally{store.close();}
}finally{client.close();}
