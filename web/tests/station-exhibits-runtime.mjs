import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const manifest=JSON.parse(await readFile('.local/station-detail/candidate/manifest.json')),c=new Client('ws://127.0.0.1:4285'),checks=[];
const specs=[
 {id:'grand',x:92.5,y:34.62,z:-13.7,hold:650,pitch:-12,walk:3000},
 {id:'upright',x:-46.4,y:7.35,z:-16.4,hold:1100,pitch:0,walk:3000},
 {id:'miniature',x:99,y:34.62,z:-14.3,hold:850,pitch:0,walk:3000}
];
try{
 await c.join();assert.equal(c.state.layout,manifest.layoutSha256);
 for(const e of specs){
  const start=await c.place({x:e.x,y:e.y,z:e.z},.35,'start'),goal=await c.place({x:e.x+(e.id==='grand'?1:-1),y:e.y,z:e.z},.35,'goal');
  const saved=(await c.request('save-challenge',{name:`K029 ${e.id} contact`,start,goal},'saved-challenge')).challenge;
  await c.request('select-challenge',{challengeId:saved.id,revision:saved.revision},'selected');await delay(250);
  c.messages.length=0;c.input({yaw:180,pitch:e.pitch});await delay(100);
  c.send('charge',{challengeId:saved.id,revision:saved.revision,layout:c.state.layout,physics:c.state.physics,powerRange:'precision'});await delay(e.hold);c.send('release');
  await delay(3500);const contacts=c.messages.filter(m=>m.type==='impact'),matching=contacts.filter(m=>m.surface.startsWith(`k029-${e.id}-`));
  console.log(e.id,contacts.map(m=>m.surface));assert.ok(matching.length,`${e.id} actual native ball contact`);
  c.send('recall');await delay(200);await c.request('select-challenge',{challengeId:saved.id,revision:saved.revision},'selected');await delay(200);
  await c.request('select-challenge',{challengeId:null},'selected');await delay(200);
  const before=c.state.players.find(p=>p.id===c.id).feet;
  // Walk laterally along the public approach, then return to start and into the prop.
  const walk=async(input,ms)=>{const end=Date.now()+ms;while(Date.now()<end){c.input(input);await delay(80);}c.input();await delay(200);return c.state.players.find(p=>p.id===c.id).feet;};
  const along=await walk({yaw:e.id==='grand'?90:-90,z:1},700);assert.ok(Math.abs(along.x-before.x)>.7,'Public approach is walkable');assert.ok(Math.abs(along.y-e.y)<.08,'Walking stays on supporting floor');
  await c.request('select-challenge',{challengeId:saved.id,revision:saved.revision},'selected');await delay(200);
  await c.request('select-challenge',{challengeId:null},'selected');await delay(200);
  const blocked=await walk({yaw:180,z:1},e.walk);
  const settled=await walk({yaw:180,z:1},650);
  assert.ok(Math.hypot(settled.x-blocked.x,settled.z-blocked.z)<.06,'Main solid face stops continued walking');
  assert.ok(blocked.z>({grand:-14.64,upright:-18.1,miniature:-16.06}[e.id]),'Walker remains in front of solid exhibit');
  checks.push({id:e.id,challenge:saved,contacts,matching,before,along,blocked,settled,recall:'contact probes forfeited; no timer-finish claim'});
 }
 await writeFile('.local/station-detail/native-contacts.json',JSON.stringify({status:'pass',layout:manifest.layoutSha256,checks},null,2));
} catch(error){await writeFile('.local/station-detail/native-failure.json',JSON.stringify({error:String(error),checks,state:c.state,events:c.messages.slice(-20)},null,2));throw error;}finally{c.close();}
