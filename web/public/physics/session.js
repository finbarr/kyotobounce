import {Shot,launchInput,BROWSER_PHYSICS} from './shot.js';
import {Walker} from './walker.js';
import {STEP} from './ball.js';
import {ballProfile} from './materials.js';
import {v,add,clamp,identity} from './math.js';
import {ShotRunner} from './shot-runner.js';
export class GameSession{
 constructor(world,catalog,id,emit){
  this.world=world;this.catalog=catalog.map(c=>({...c,physics:BROWSER_PHYSICS}));this.id=id;this.emit=emit;this.stationTime=0;this.generation=0;this.lastTick=performance.now();this.accumulator=0;this.input={x:0,z:0,fast:false};
  this.select(this.catalog[0].id,false);this.timer=setInterval(()=>this.tick(),1000/30);
 }
 close(){clearInterval(this.timer);this.runner?.close();this.generation++;}
 player(){return {id:this.id,feet:this.walker.feet,release:this.walker.release(this.aim.yaw,this.aim.pitch,this.stationTime)||add(this.walker.feet,v(0,1.5,0)),movement:this.walker.movement,walked:this.walker.walked,grounded:this.walker.grounded,...this.aim,power:this.power||0,powerRange:this.powerRange||'precision'};}
 session(){this.emit({type:'session',id:this.id,busy:['Charging','Release','Flight'].includes(this.phase),attempt:this.attempt,challenge:this.challenge,local:true});}
 select(id,announce=true){
  const challenge=this.catalog.find(c=>c.id===id);if(!challenge)throw Error('This course is not in the current browser preview');
  this.runner?.close();this.generation++;this.challenge=challenge;this.phase='Aim';this.attempt=null;this.shot=null;this.power=0;this.chargeTime=this.releaseTime=0;
  this.walker=new Walker(this.world,add(challenge.start.center,v(0,.03,0)));this.input={x:0,z:0,fast:false};this.aim={yaw:180,pitch:15,top:0,kick:0,...challenge.hint};this.powerRange=challenge.hint?.powerRange||'precision';
  for(let i=0;i<12;i++)this.walker.move(this.input,this.aim.yaw,false,STEP);
  this.session();if(announce)this.emit({type:'selected',challenge});this.publish();
 }
 state(){return {type:'state',id:this.id,attempt:this.attempt,layout:this.world.layoutSha256,physics:BROWSER_PHYSICS,profile:ballProfile.id,radius:ballProfile.radius,challenge:this.challenge,phase:this.phase,owner:this.attempt?this.id:'',stationTime:this.stationTime,chargeTime:this.chargeTime,releaseTime:this.releaseTime,flightTime:0,power:this.power,players:[this.player()],ball:this.walker.release(this.aim.yaw,this.aim.pitch,this.stationTime)||add(this.walker.feet,v(0,1.5,0)),rotation:identity(),velocity:v(),spin:v(),impacts:0,surfaces:0,diagnostics:{sleeping:false,supported:false}};}
 publish(){this.emit(this.state());}
 tick(){
  const now=performance.now();this.accumulator+=Math.min(.1,(now-this.lastTick)/1000);this.lastTick=now;
  while(this.accumulator>=STEP){
   this.accumulator-=STEP;if(this.phase!=='Flight')this.stationTime+=STEP;
   if(['Aim','Charging','Release'].includes(this.phase))this.walker.move(this.phase==='Aim'&&now-this.inputAt<300?this.input:{x:0,z:0},this.aim.yaw,this.input.fast,STEP);
  }
  if(this.phase==='Charging')this.power=clamp((now-this.chargeAt)/2800,0,1);
  if(['Aim','Charging','Release'].includes(this.phase))this.publish();
 }
 handle(m){
  if(m.type==='input'){
   if([m.x,m.z,m.yaw,m.pitch,m.top,m.kick].some(n=>!Number.isFinite(n)))throw Error('Invalid movement or aim');
   this.input={x:clamp(m.x,-1,1),z:clamp(m.z,-1,1),fast:!!m.fast};this.inputAt=performance.now();
   if(['Aim','Charging'].includes(this.phase))this.aim={yaw:((m.yaw+180)%360+360)%360-180,pitch:clamp(m.pitch,-65,80),top:clamp(m.top,-200,200),kick:clamp(m.kick,-200,200)};return;
  }
  if(m.type==='select-challenge'){if(!['Aim','Result'].includes(this.phase))throw Error('Finish or recall the current shot first');this.select(m.challengeId);return;}
  if(m.type==='home'){if(['Aim','Result'].includes(this.phase))this.select(this.challenge.id,false);return;}
  if(m.type==='charge'){
   if(!['Aim','Result'].includes(this.phase))return;
   if(!this.walker.release(this.aim.yaw,this.aim.pitch,this.stationTime))throw Error('Move away from the wall before throwing');
   this.generation++;this.phase='Charging';this.shot=null;this.attempt=crypto.randomUUID();this.chargeAt=performance.now();this.chargeTime=this.stationTime;this.power=0;this.powerRange=m.powerRange==='full'?'full':'precision';this.session();this.publish();return;
  }
  if(m.type==='release'&&this.phase==='Charging'){
   this.power=clamp((performance.now()-this.chargeAt)/2800,0,1);this.phase='Release';this.releaseTime=this.stationTime+.12;this.publish();
   const generation=this.generation;setTimeout(()=>{if(generation===this.generation&&this.phase==='Release')this.launch();},120);return;
  }
  if(m.type==='cancel'){this.input={x:0,z:0};if(['Charging','Release'].includes(this.phase))this.reset();return;}
  if(m.type==='recall'){this.shot?.cancel();this.reset();this.emit({type:'recalled'});return;}
  if(m.type==='playback-progress'&&m.attempt===this.attempt&&this.phase==='Flight'){
   this.runner?.progress(m.time);this.stationTime=this.releaseTime+(this.runner?.played||0);return;
  }
  if(m.type==='recording-ack'&&m.attempt===this.attempt){this.runner?.acknowledge(m.sequence);return;}
  if(m.type==='bank-result'&&m.attempt===this.attempt&&this.shot?.done){this.phase='Result';this.stationTime=Math.max(this.stationTime,this.releaseTime+this.shot.ball.clock);this.session();return;}
  if(m.type==='skip-shot'&&m.attempt===this.attempt){this.runner?.skip();this.emit({type:'shot-skipping',attempt:this.attempt});}
 }
 reset(){this.runner?.close();this.generation++;this.phase='Aim';this.attempt=null;this.shot=null;this.input={x:0,z:0};this.power=0;this.session();this.publish();}
 launch(){
  const release=this.walker.release(this.aim.yaw,this.aim.pitch,this.stationTime);if(!release){this.reset();this.emit({type:'error',message:'Throw cancelled: the hand is blocked'});return;}
  this.releaseTime=this.stationTime;this.phase='Flight';const thrower=structuredClone(this.player()),launch=launchInput(this.walker.feet,{...this.aim,power:this.power,powerRange:this.powerRange});launch.position=release;
  const shot=this.shot=new Shot(this.world,this.challenge,launch,{attempt:this.attempt,releaseTime:this.releaseTime,chargeTime:this.chargeTime,thrower});
  const base={...this.state(),launchPosition:launch.position,players:[thrower]},generation=this.generation;
  this.runner=new ShotRunner(shot,base,message=>{if(generation===this.generation)this.emit(message);});
 }
}
