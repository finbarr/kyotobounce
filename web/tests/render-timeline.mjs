import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
const baseline=process.env.BASELINE==='1';
const source=await readFile(process.env.TIMELINE_SOURCE||new URL('../public/game.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function renderTimeline(now){'),source.indexOf('\nbriefing=challengeBriefing'));
const make=new Function('THREE',`let snapshot=null,received=0,history=[],renderClock=null;${body};return {receive(frame,now){snapshot=frame;received=now;history.push(frame);if(history.length>30)history.shift();},render:renderTimeline};`);
function run(jitter){const clock=make(THREE),queue=[];for(let i=0;i<300;i++)queue.push({time:i/30,arrival:i*1000/30+jitter(i)});let index=0,last=null;const deltas=[];for(let now=0;now<9500;now+=1000/120){while(queue[index]?.arrival<=now){const f=queue[index++];clock.receive({stationTime:f.time,phase:'Aim'},f.arrival);}const r=clock.render(now);if(last&&now>1000)deltas.push(r.time-last.time);last=r;}return {backwards:deltas.filter(d=>d< -1e-6).length,stalls:deltas.filter(d=>Math.abs(d)<1e-6).length,min:Math.min(...deltas),max:Math.max(...deltas)};}
const normal=run(()=>0),jitter=run(i=>i%3===0?20:0);console.log({normal,jitter});
if(baseline)assert(jitter.backwards>0,'Baseline reproduces shared clock reversal under 20ms packet jitter');else{assert.equal(jitter.backwards,0);assert.equal(jitter.stalls,0);assert(jitter.max<.012);assert.equal(normal.backwards,0);}

if(!baseline){
 const clock=make(THREE);for(let i=0;i<10;i++)clock.receive({stationTime:i/30,phase:'Aim'},i*1000/30);
 let last=clock.render(300).time;for(let now=310;now<3000;now+=10){const r=clock.render(now);assert(r.time>=last);assert(r.time<=.3,'Never extrapolate beyond authoritative feet/collision samples');last=r.time;}
 assert.equal(last,.3);clock.receive({stationTime:.3333333333333333,phase:'Aim'},3000);assert(clock.render(3010).time>=last);
 console.log('PASS shared clock jitter, starvation freeze, bounded correction and authoritative sample bounds');
}
