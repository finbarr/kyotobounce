import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Client,delay} from './api-client.mjs';
const c=new Client('ws://127.0.0.1:4285'),manifest=JSON.parse(await readFile('.local/station-detail/candidate/manifest.json')),faces=[],shots=[];
try{
 await c.join();assert.equal(c.state.layout,manifest.layoutSha256);
 for(const [id,origin,direction] of [
 ['grand-curved-case',{x:90,y:35.51,z:-16.5},{x:1,y:0,z:0}],
 ['grand-closed-lid',{x:92,y:36.5,z:-16.4},{x:0,y:-1,z:0}],
 ['upright-upper-panel',{x:-46.4,y:8.48,z:-18.4},{x:0,y:0,z:-1}],
 ['miniature-glass-long0.644',{x:99,y:35.85,z:-15.2},{x:0,y:0,z:-1}],
 ['miniature-base-panel0.65',{x:99.65,y:34.96,z:-15.2},{x:0,y:0,z:-1}],
 ['miniature-glass-roof',{x:99,y:37,z:-16.7},{x:0,y:-1,z:0}]
 ]){const r=await c.request('place',{slot:'waypoint',radius:.1,origin,direction},'placement');assert.equal(r.disk.surface,`k029-${id}`);faces.push(r.disk);}
 for(const e of [
 {id:'grand',start:{x:90.7,y:34.62,z:-16.4},goal:{x:90.7,y:34.62,z:-15.5},yaw:90,pitch:-30,hold:650,expect:'curved-case'},
 {id:'upright',start:{x:-46.4,y:7.35,z:-16.4},goal:{x:-47.4,y:7.35,z:-16.4},yaw:180,pitch:8,hold:1450,expect:'upper-panel'},
 {id:'miniature',start:{x:98.5,y:34.62,z:-14.8},goal:{x:97.5,y:34.62,z:-14.8},yaw:180,pitch:-48,hold:1200,expect:'base-panel'}
 ]){
  const start=await c.place(e.start,.25,'start'),goal=await c.place(e.goal,.25,'goal');const course=(await c.request('save-challenge',{name:`K029 ${e.id} main face`,start,goal},'saved-challenge')).challenge;await c.request('select-challenge',{challengeId:course.id,revision:course.revision},'selected');
  c.messages.length=0;c.input({yaw:e.yaw,pitch:e.pitch});await delay(120);c.send('charge',{challengeId:course.id,revision:course.revision,layout:c.state.layout,physics:c.state.physics,powerRange:'precision'});await delay(e.hold);c.send('release');await delay(2500);const contacts=c.messages.filter(m=>m.type==='impact');console.log(e.id,contacts.map(m=>m.surface));shots.push({e,contacts});assert.ok(contacts.some(m=>m.surface.startsWith(`k029-${e.id}-${e.expect}`)),`${e.id} main face actual ball contact`);c.send('recall');await delay(150);
 }
 await writeFile('.local/station-detail/native-faces.json',JSON.stringify({status:'pass',layout:manifest.layoutSha256,faces,shots},null,2));
} catch(e){await writeFile('.local/station-detail/faces-failure.json',JSON.stringify({error:String(e),faces,shots},null,2));throw e;}finally{c.close();}
