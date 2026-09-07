import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Client,delay} from './api-client.mjs';
const client=new Client(),out='artifacts/phase3/robot-power',checks={};
async function launch(holdMs,revision){
  await client.request('select-challenge',{challengeId:'atrium-first-bank',revision},'selected');client.input({pitch:15});await delay(140);
  client.send('charge',{challengeId:client.state.challenge.id,revision:client.state.challenge.revision,layout:client.state.layout,physics:client.state.physics});
  await delay(holdMs);client.send('release');
  const flight=await client.next(m=>m.type==='state'&&m.phase==='Flight');
  await delay(350);const end=client.next(m=>m.type==='result');client.send('recall');const result=await end;await delay(120);
  return {speed:Math.hypot(result.velocity.x,result.velocity.y,result.velocity.z),power:result.thrower.power,throwModel:result.challenge.throwModel,revision:result.challenge.revision,first:flight.ball};
}
try{
  await client.join();checks.legacy=await launch(1250,1);checks.previousRobot=await launch(1250,2);checks.robot=await launch(1250);
  assert.ok(Math.abs(checks.legacy.speed-12)<.01);assert.ok(Math.abs(checks.robot.speed-100)<.01);assert.equal(checks.robot.throwModel,'robot-v3');assert.ok(Math.abs(checks.previousRobot.speed-32)<.01);
  const old=JSON.parse(await readFile(`${out}/before/records.json`,'utf8')).replay;
  const replay=await client.request('replay',{attempt:old.id},'replay');assert.ok(replay.replay.poses.length>2);checks.oldReplayAccepted=old.id;
  const db=new DatabaseSync('web/data/kyoto.sqlite',{readOnly:true}),row=db.prepare('SELECT replay FROM attempts WHERE id=?').get(old.id);db.close();
  assert.equal(createHash('sha256').update(row.replay).digest('hex'),old.sha256,'Historical recording bytes stay identical');
  await client.request('select-challenge',{challengeId:'atrium-first-bank'},'selected');const gentle=await client.throw(365);
  assert.equal(gentle.result.success,true);assert.equal(gentle.result.score,1100);checks.gentle={score:gentle.result.score,power:gentle.result.thrower.power};
  await writeFile(`${out}/native.json`,JSON.stringify({status:'pass',checks},null,2));console.log('PASS 12, 32 and 100 m/s, separate revisions, immutable legacy replay and gentle 1100 bank');
}catch(error){await writeFile(`${out}/native.json`,JSON.stringify({status:'fail',error:String(error),checks},null,2));throw error;}
finally{client.close();}
