// Actual challenge/hint over varied release phases. Local service only.
import {Client,delay}from'../web/tests/api-client.mjs';import{mkdir,writeFile,readFile}from'node:fs/promises';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4273',out=process.env.KYOTO_TEST_OUTPUT||'artifacts/k016/baseline.json';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Local isolated service required');
const results=[];
async function probe(settings){
 const {phase}=settings;
 const c=new Client(origin.replace('http','ws'));
 try{
  await c.join();const challenge=c.messages.findLast(m=>m.type==='catalog').challenges.find(c=>c.id==='atrium-moving-return');
  await c.request('select-challenge',{challengeId:challenge.id,revision:challenge.revision},'selected');
  const h={...challenge.hint,...settings};c.input(h);await delay(150);
  const clock=()=>c.state.stationTime+(performance.now()-c.stateReceived)/1000;
  const target=phase+Math.ceil((clock()+h.holdMs/1000+.5-phase)/h.period)*h.period;
  await delay(Math.max(0,(target-.12-h.holdMs/1000-clock())*1000));
  c.send('charge',{challengeId:challenge.id,revision:challenge.revision,layout:c.state.layout,physics:c.state.physics,powerRange:h.powerRange});await delay(h.holdMs);c.send('release');
  const started=Date.now();
  while(Date.now()-started<90000){await delay(200);if(c.state.phase==='Result'||c.state.ball.y< -2)break;}
  const trace=c.messages.filter(m=>m.type==='state'),flight=trace.filter(m=>['Flight','Result'].includes(m.phase));
  const top=flight.findIndex(m=>m.ball.y>5),topDrop=top>=0&&flight.slice(top).some(m=>m.ball.y<4.5&&m.ball.x>27.5);
  const result={settings,topDrop,phase,actualPhase:c.state.releaseTime%h.period,challenge,escaped:c.state.ball.y< -2,minY:Math.min(...flight.map(m=>m.ball.y)),maxY:Math.max(...flight.map(m=>m.ball.y)),final:c.state,contacts:c.messages.filter(m=>m.type==='impact'),result:c.messages.findLast(m=>m.type==='result'),trace};
  results.push(result);console.log(JSON.stringify({settings,topDrop,phase,actual:result.actualPhase,minY:result.minY,maxY:result.maxY,escaped:result.escaped,final:{phase:c.state.phase,ball:c.state.ball,time:c.state.flightTime},surfaces:[...new Set(result.contacts.map(m=>m.surface))]}));
 }finally{c.close();}
}
await mkdir(out.slice(0,out.lastIndexOf('/')),{recursive:true});
const scenarios=process.env.KYOTO_SCENARIOS?JSON.parse(await readFile(process.env.KYOTO_SCENARIOS,'utf8')):[.02,.2,.4,.6].map(phase=>({phase}));
for(let i=0;i<scenarios.length;i+=4)await Promise.all(scenarios.slice(i,i+4).map(probe));
await writeFile(out,JSON.stringify({origin,results},null,2));
