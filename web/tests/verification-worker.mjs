// Test-only observer of the actual GameSession controller. It records calls
// to movement; it never supplies a position or changes a physics result.
import {GameSession} from '../public/physics/session.js';
import {Walker} from '../public/physics/walker.js';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {INPUT_FORMAT} from '../verification.mjs';
import {campaignLaunches} from './browser-launches.mjs';
let session,active=false,runs=[],steps=0,proof;
const move=Walker.prototype.move;
Walker.prototype.move=function(input,yaw,fast,dt){
 if(active){
  const current={steps:1,x:input.x,z:input.z,yaw:input.x||input.z?yaw:0,fast:!!fast},last=runs.at(-1);
  if(last&&['x','z','yaw','fast'].every(k=>last[k]===current[k]))last.steps++;else runs.push(current);steps++;
 }
 return move.call(this,input,yaw,fast,dt);
};
function install(s){
 const launch=s.launch.bind(s);s.launch=()=>{
  active=false;launch();if(!s.shot)return;
  const a=s.aim;proof={header:{format:INPUT_FORMAT,courseId:s.challenge.id,revision:s.challenge.revision,layout:s.challenge.layout,physics:s.challenge.physics,scoring:s.challenge.scoring,walkSteps:steps,chargeTime:s.chargeTime,releaseTime:s.releaseTime,aim:{yaw:a.yaw,pitch:a.pitch,top:a.top,kick:a.kick,power:s.power,powerRange:s.powerRange}},commands:structuredClone(runs)};
 };
}
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){
   const world=new StaticWorld(decodeCollisionPack(await(await fetch('/collision.bin')).arrayBuffer()));
   session=new GameSession(world,m.catalog,'proof-player',reply=>{
    if(reply.type==='input-start'||reply.type==='input-chunk')queueMicrotask(()=>session.handle({type:'input-ack',route:reply.route,sequence:reply.type==='input-start'?-1:reply.sequence}));
    self.postMessage(reply.type==='local-result'?{...reply,proof}:reply);
   });install(session);const launches=campaignLaunches(world,m.catalog);active=true;self.postMessage({type:'test-ready',launches});return;
  }
  if(m.type==='select-challenge'){active=false;session.handle(m);runs=[];steps=0;proof=null;active=true;return;}
  session.handle(m);
 }catch(error){self.postMessage({type:'error',message:String(error)});}
};
