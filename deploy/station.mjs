import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';

export async function hashFile(path){
 const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');
}
export async function stationRelease(){
 const config=JSON.parse(await readFile(process.env.KYOTO_V2_ASSETS||'web/v2/assets.json','utf8'));
 const source=await readFile(config.layout);
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(source),config.layoutSha256,'The station source must match its asset receipt');
 assert.equal(await hashFile(config.geometry),config.geometrySha256,'The station geometry must match its asset receipt');
 assert.equal(await hashFile(config.hardware),config.hardwareSha256,'The station hardware must match its asset receipt');
 const layout=JSON.parse(source),station=JSON.parse(await readFile(config.station,'utf8')),detail=JSON.parse(await readFile(config.detail,'utf8'));
 assert.equal(station.layoutSha256,config.layoutSha256,'Collision and visuals must share the same source');
 assert.equal(await hashFile(config.motionLayout),config.layoutSha256,'Moving-step source must match the station');
 assert.equal(detail.candidateMotionIntegration.layoutSha256,config.layoutSha256,'Moving-step metadata must match the station');
 assert(!layout.lifts?.length&&!station.lifts?.length,'Only contiguous public spaces ship');
 for(const part of ['hallBasementIntegration','westCirculationV2','portaConnectionV2'])
  for(const support of layout.architecture[part]?.componentCombSupports||layout.architecture[part]?.combSupports||[])
   assert.deepEqual(detail.combSupports.find(s=>s.support===support.support),support,'Moving-step endpoints must match collision');
 // Match the tested preview exactly: the only change is the exploration spawn.
 layout.spawn=config.spawn;
 const layoutBytes=JSON.stringify(layout)+'\n',layoutSha256=hash(layoutBytes);
 const campaign=JSON.parse(await readFile('web/starter-challenges.json','utf8'));
 assert.equal(campaign.length,30,'Release the complete current campaign');
 assert(campaign.every(c=>c.layout===layoutSha256&&c.scoring==='waypoint-v4'),'Every course must match the shipped station and scoring');
 station.spawn=config.spawn;station.layoutSha256=layoutSha256;
 return {layoutBytes,stationBytes:JSON.stringify(station)+'\n',layoutSha256,sourceLayoutSha256:config.layoutSha256,files:{
  'assets/runtime/atrium.glb':config.geometry,
  'assets/runtime/atrium-detail.glb':config.hardware,
  'assets/atrium-detail.json':config.detail,
  'assets/runtime/ori.glb':'web/public/assets/runtime/ori.glb'
 }};
}
