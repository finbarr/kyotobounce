import assert from 'node:assert/strict';
import {subwayLift} from './subway-lift-spec.mjs';

// A separate sampled path for every floor pair keeps car acceleration and
// relative-motion collision identical in either direction, including short trips.
export function liftTravel(height,speed=.8,acceleration=.8){
 assert(height>0&&speed>0&&acceleration>0);
 const ramp=Math.min(speed/acceleration,Math.sqrt(height/acceleration)),peak=acceleration*ramp;
 const duration=height/peak+ramp,n=Math.ceil(duration*30);
 return Array.from({length:n+1},(_,i)=>{
  const t=i/n*duration,y=t<ramp?.5*acceleration*t*t:t>duration-ramp?height-.5*acceleration*(duration-t)**2:peak*(t-ramp/2);
  return{x:t,y};
 });
}

export function multiStopLift({id,origin,stops}){
 assert(stops.length>=2&&stops.length<=16&&stops[0].height===0);
 assert.equal(new Set(stops.map(s=>s.id)).size,stops.length);
 for(const [i,s]of stops.entries())assert(typeof s.id==='string'&&s.id.length&&s.id.length<=64&&typeof s.label==='string'&&s.label.length&&Number.isFinite(s.height)&&(!i||s.height>stops[i-1].height));
 const spec=subwayLift({id,origin,height:stops.at(-1).height});
 const door=spec.parts.filter(p=>p.motion==='lower');
 spec.parts=spec.parts.filter(p=>p.motion==='car');
 for(const [floor,s]of stops.entries())for(const p of door)spec.parts.push({...p,id:id+'-landing-'+s.id+'-door-'+p.doorSide,motion:'landing',floor});
 delete spec.travel;spec.stops=stops;spec.trips=[];
 for(let from=0;from<stops.length;from++)for(let to=from+1;to<stops.length;to++)spec.trips.push({from,to,travel:liftTravel(stops[to].height-stops[from].height)});
 return spec;
}
