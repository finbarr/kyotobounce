// Only the task-local service/DB. Private inspection course owned by QA guest.
import{Client}from'./api-client.mjs';import{writeFile}from'node:fs/promises';
const c=new Client('ws://127.0.0.1:4281');
try{await c.join();const start=await c.place({x:-55.3,y:7.35,z:-12},.3,'start'),goal=await c.place({x:-52,y:7.35,z:-18},.9);
const {challenge}=await c.request('save-challenge',{name:'K025 private approach inspection',start,goal},'saved-challenge');await c.request('select-challenge',{challengeId:challenge.id},'selected');await writeFile('.local/station-detail/browser-session.json',JSON.stringify({token:c.token,challenge}));}finally{c.close();}
