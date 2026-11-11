import {Walker} from './public/physics/walker.js';
import {Shot,launchInput,BROWSER_PHYSICS} from './public/physics/shot.js';
import {STEP} from './public/physics/ball.js';
import {v,add} from './public/physics/math.js';

export const INPUT_FORMAT='kyoto-inputs-1';
const fail=message=>{throw Error('Invalid shot inputs: '+message);};
function object(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail(label+' must be an object');
 const actual=Object.keys(value);if(actual.length!==keys.length||actual.some(k=>!keys.includes(k)))fail(label+' has missing or unsupported fields');
}
function number(n,min,max,label){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)fail(label+' is outside its allowed range');}
function integer(n,min,max,label){number(n,min,max,label);if(!Number.isSafeInteger(n))fail(label+' must be an integer');}
export function validateInputHeader(header,course,world){
 object(header,['format','courseId','revision','layout','physics','scoring','walkSteps','chargeTime','releaseTime','aim'],'header');
 if(header.format!==INPUT_FORMAT)fail('unsupported input format');
 if(course.layout!==world.layoutSha256||course.physics!==BROWSER_PHYSICS||course.scoring!=='waypoint-v4')fail('the authoritative course is incompatible');
 for(const [key,expected] of Object.entries({courseId:course.id,revision:course.revision,layout:course.layout,physics:course.physics,scoring:course.scoring}))if(header[key]!==expected)fail(key+' does not match the authoritative course');
 integer(header.walkSteps,0,2**32,'walking step count');number(header.releaseTime,0,2**32,'release time');number(header.chargeTime,0,header.releaseTime,'charge time');
 if(header.releaseTime+1e-6<header.walkSteps*STEP)fail('release precedes the walking route');
 const a=header.aim;object(a,['yaw','pitch','top','kick','power','powerRange'],'aim');
 number(a.yaw,-180,180,'yaw');number(a.pitch,-65,80,'pitch');number(a.top,-200,200,'top spin');number(a.kick,-200,200,'side spin');number(a.power,0,1,'power');
 if(a.yaw===180)fail('yaw must use the controller range [-180, 180)');
 if(!['precision','full'].includes(a.powerRange))fail('unknown power range');
 return structuredClone(header);
}
export function validateWalkRun(run,remaining){
 object(run,['steps','x','z','yaw','fast'],'walking run');integer(run.steps,1,remaining,'walking run length');
 number(run.x,-1,1,'walking x');number(run.z,-1,1,'walking z');number(run.yaw,-180,180,'walking yaw');
 if(run.yaw===180)fail('walking yaw must use the controller range [-180, 180)');
 if(typeof run.fast!=='boolean')fail('walking speed must be a normal/sprint choice');return {...run};
}

// The caller resolves the course from trusted storage and supplies its own
// collision world. Clients supply controls, never a launch position, velocity,
// contact list, waypoint claim or score. The input iterator can read persisted
// chunks: this verifier retains one walking run and one replay batch at a time.
export class ShotVerification{
 constructor(world,course,header,commands,{attempt='verified',subject='verified'}={}){
  this.header=validateInputHeader(header,course,world);this.course=structuredClone(course);this.world=world;this.attempt=attempt;this.subject=subject;
  this.iterator=commands?.[Symbol.asyncIterator]?.()||commands?.[Symbol.iterator]?.();if(!this.iterator)fail('walking controls must be iterable');
  this.walker=new Walker(world,add(this.course.start.center,v(0,.03,0)));
  for(let i=0;i<12;i++)this.walker.move({x:0,z:0},this.header.aim.yaw,false,STEP);
  this.walkedSteps=0;this.run=null;this.remaining=0;this.status='walking';this.shot=null;this.cancelled=false;this.failed=false;
 }
 cancel(){this.cancelled=true;this.shot?.cancel();this.result=undefined;this.status='cancelled';}
 async advance(maxSteps=180){
  integer(maxSteps,1,1800,'verification batch size');
  if(this.running)throw Error('This verification is already advancing');
  if(this.failed)throw Error('This verification already failed');
  if(this.cancelled)return {status:'cancelled'};
  if(this.status==='verified')return {status:this.status,result:this.result};
  this.running=true;try{
   const began=performance.now();let work=0;const scoreFrames=[];
   while(work<maxSteps&&performance.now()-began<8){
    if(this.cancelled)return {status:'cancelled'};
    if(this.status==='walking'){
     if(!this.remaining){
      const next=await this.iterator.next();if(this.cancelled)return {status:'cancelled'};
      if(next.done){
       if(this.walkedSteps!==this.header.walkSteps)fail('walking controls ended early');
       const h=this.header,a=h.aim,position=this.walker.release(a.yaw,a.pitch,h.releaseTime);if(!position)fail('the throwing hand is blocked');
       const launch={...launchInput(this.walker.feet,a),position};
       const thrower={id:this.subject,feet:{...this.walker.feet},release:position,movement:{...this.walker.movement},walked:this.walker.walked,grounded:this.walker.grounded,...a};
       this.shot=new Shot(this.world,this.course,launch,{attempt:this.attempt,thrower,chargeTime:h.chargeTime,releaseTime:h.releaseTime});this.status='flight';continue;
      }
      this.run=validateWalkRun(next.value,this.header.walkSteps-this.walkedSteps);this.remaining=this.run.steps;
     }
     this.walker.move(this.run,this.run.yaw,this.run.fast,STEP);this.remaining--;this.walkedSteps++;work++;continue;
    }
    this.shot.step();work++;
    if(this.shot.ball.budgetExhaustions)throw Error('Cannot verify a shot that exhausted collision resolution');
    if(this.shot.steps%6===0||this.shot.done)scoreFrames.push({t:this.shot.ball.clock,score:this.shot.breakdown});
    if(this.shot.done){
     const ball=this.shot.ball;
     if(this.shot.reason!=='Ball left the station'&&(!ball.sleeping||Object.values(ball.velocity).some(x=>x!==0)||Object.values(ball.spin).some(x=>x!==0)))throw Error('Cannot verify a shot before full physical rest');
     this.status='verified';break;
    }
   }
   const recording=this.shot?{...this.shot.drain(),scoreFrames}:null;this.shot?.events.splice(0);
   if(this.status==='verified'){const {poses,contacts,...result}=this.shot.result();this.result=result;}
   return {status:this.status,walkingSteps:this.walkedSteps,shotSteps:this.shot?.steps||0,recording,...(this.result?{result:this.result}:{})};
  }catch(error){this.failed=true;throw error;}finally{this.running=false;}
 }
}
