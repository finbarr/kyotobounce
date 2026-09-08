// Native input snapshots drive the actual rig; complements normal-game review.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import {createAvatar,poseAvatar} from '../public/avatar.js';
import {Client,delay} from './api-client.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4287';
const out=process.env.KYOTO_TEST_OUTPUT||'.local/station-detail/native-movement.json';
const b=await readFile('web/public/assets/ori.glb'),asset=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const avatars=['ori','koma','don'].map(character=>createAvatar(asset,{character})),c=new Client(origin.replace(/^http/,'ws')),rows=[];let frames=0;
c.socket.on('message',data=>{const s=JSON.parse(String(data));if(s.type!=='state')return;const p=s.players.find(p=>p.id===c.id);if(!p)return;
 for(const a of avatars){a.group.position.set(p.feet.x,p.feet.y,-p.feet.z);a.group.rotation.y=Math.PI-p.yaw*Math.PI/180;poseAvatar(a,p,s.phase,s,s.stationTime);}frames++;
});
const player=()=>c.state.players.find(p=>p.id===c.id);
function capture(name){rows.push({name,player:player(),phase:c.state.phase,avatars:avatars.map(a=>({character:a.character,blend:a.walkBlend,hips:a.bones.hips.position.toArray(),feet:['L','R'].map(s=>a.group.worldToLocal(a.bones[`foot.${s}`].getWorldPosition(new T.Vector3())).toArray())}))});}
async function axis(axis,target){const end=Date.now()+20000;while(Date.now()<end){const delta=target-player().feet[axis];if(Math.abs(delta)<.07)break;c.input({yaw:90,fast:true,x:axis==='z'?-Math.sign(delta):0,z:axis==='x'?Math.sign(delta):0});await delay(Math.min(100,Math.max(15,Math.abs(delta)/4.2*1000)));}c.input({yaw:90});await delay(200);assert.ok(Math.abs(player().feet[axis]-target)<.17,`Native route reaches ${axis}=${target}`);}
let failure;
try{
 await c.join();capture('fresh');
 // Match game.js startup: native yaw 0 receives browser initial yaw 180,
 // with no movement key held. This is a turn even on a fresh idle load.
 c.input({yaw:180});await delay(3000);capture('startup-heading');
 assert.ok(rows.at(-1).avatars.every(a=>a.blend===0&&a.feet.every((f,i)=>Math.hypot(f[0]-(i?-.115:.115),f[2])<.019)),'Fresh native heading settles without a one-sided stance');
 c.input({yaw:90,z:1});await delay(1000);
 for(let i=1;i<=30;i++){c.input({yaw:90+i*6});await delay(1000/60);}await delay(3000);capture('turn-stop');
 assert.ok(rows.at(-1).avatars.every(a=>a.blend===0&&a.feet.every((f,i)=>Math.hypot(f[0]-(i?-.115:.115),f[2])<.019)),'Native walk/turn settles both feet');
 c.send('home');await delay(300);await axis('x',17.8);await axis('z',4.65);await axis('x',30);capture('stair-landing');assert.ok(Math.abs(player().feet.y-5.5)<.1,'Native stairs reach landing');
 await axis('z',1.571);await axis('x',33.6);capture('escalator-approach');c.input({yaw:90,z:1});await delay(3000);c.input({yaw:90});await delay(2000);capture('escalator-transition');
 assert.ok(player().feet.y>5.5,'Native escalator transition rises');
}catch(e){failure=String(e);}finally{c.close();await mkdir(out.slice(0,out.lastIndexOf('/')),{recursive:true});await writeFile(out,JSON.stringify({status:failure?'fail':'pass',origin,frames,failure,rows},null,2)+'\n');}
if(failure)throw new Error(failure);console.log('PASS native walk/turn/stop and stair/escalator route across all three rigs');
