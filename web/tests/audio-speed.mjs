import assert from 'node:assert/strict';
import {arcadeAudio} from '../public/arcade-audio.js';
const original={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,AudioContext:globalThis.AudioContext,setInterval:globalThis.setInterval};
let scheduler,context;
class Param{value=0;events=[];setValueAtTime(value,time){this.value=value;this.events.push({value,time});}exponentialRampToValueAtTime(value,time){this.events.push({value,time});}linearRampToValueAtTime(value,time){this.events.push({value,time});}setTargetAtTime(value,time){this.value=value;this.events.push({value,time});}cancelScheduledValues(){}}
class Node{gain=new Param();frequency=new Param();playbackRate=new Param();Q=new Param();connect(node){return node;}disconnect(){}start(time=0,offset=0){this.startTime=time;this.offset=offset;}stop(time){this.endTime=time;}}
class Context{currentTime=0;sampleRate=48000;state='running';destination=new Node();sources=[];constructor(){context=this;}createGain(){return new Node();}createBiquadFilter(){return new Node();}createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}createBuffer(_,length){return {getChannelData:()=>new Float32Array(length)};}createDynamicsCompressor(){return Object.assign(new Node(),{threshold:new Param(),knee:new Param(),ratio:new Param()});}resume(){}suspend(){this.state='suspended';}close(){} }
const controls=new Map();
try{
 globalThis.AudioContext=Context;globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.document={hidden:false,addEventListener(){},getElementById(id){if(!controls.has(id))controls.set(id,{setAttribute(){}});return controls.get(id);}};globalThis.window={addEventListener(){}};globalThis.setInterval=fn=>{scheduler=fn;return 0;};
 const sound=arcadeAudio();await sound.unlock();
 const advance=seconds=>{for(let i=0;i<seconds*100;i++){context.currentTime+=.01;for(const source of context.sources)if(source.onended&&source.endTime<=context.currentTime){const end=source.onended;source.onended=null;end();}scheduler();}};
 scheduler();const initial=sound.state.step;advance(2);const normal=sound.state.step-initial;
 sound.setPlaybackRate(2);assert.equal(sound.state.bpm,224);const start=sound.state.step;advance(2);const doubled=sound.state.step-start;
 assert.ok(Math.abs(doubled-2*normal)<=1,`${normal} normal beats vs ${doubled} fast beats`);
 sound.cue('menu');let source=context.sources.at(-1);assert.equal(source.frequency.value,1320);assert.ok(Math.abs(source.endTime-source.startTime-.0375)<1e-6,'Cue envelope and tail run at 2x');
 sound.motion(10,true,true);source=context.sources.at(-1);assert.equal(source.playbackRate.value,2,'Rolling audio speeds up too');
 sound.setPlaybackRate(1);assert.equal(sound.state.bpm,112);assert.equal(source.playbackRate.value,1);
 sound.cue('menu');assert.equal(context.sources.at(-1).frequency.value,660);assert.equal(sound.state.cues.menu,2,'Rate switches do not retrigger scoring cues');
 controls.get('sound-toggle').onclick();sound.setPlaybackRate(2);assert.equal(sound.state.muted,true,'Fast-forward preserves mute preference');
 console.log('PASS 112/224 BPM music, retimed voices, doubled SFX pitch/envelopes, rolling playback and mute preservation');
}finally{Object.assign(globalThis,original);}
