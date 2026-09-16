import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../public/game.js',import.meta.url),'utf8');
// Exercise the real camera switch and pointer-lock handlers with the browser's
// asynchronous grant/release boundary controlled by the test.
const switchCode=source.slice(source.indexOf('function setFly('),source.indexOf("$('toggle-fly').onclick"));
const lockCode=source.slice(source.indexOf('function pointerLocked()'),source.indexOf('function recall()'));
function setup({locked=false,flying=false,mode='play',touch=false}={}){
 const events={},pending=[],elements=new Map(),calls={capture:0,release:0,cancel:0,menu:0};
 const noop=()=>{},canvas={focus:noop,requestPointerLock(){calls.capture++;pending.push(()=>{document.pointerLockElement=canvas;events.pointerlockchange();});}};
 const document={pointerLockElement:locked?canvas:null,hidden:false,hasFocus:()=>true,body:{classList:{toggle:noop}},addEventListener:(name,callback)=>events[name]=callback,exitPointerLock(){calls.release++;pending.push(()=>{document.pointerLockElement=null;events.pointerlockchange();});}};
 const state={document,canvas,lockRequested:false,explicitMouseRelease:false,resultMouseRelease:false,
  names:null,briefing:null,loaded:true,workerReady:true,ui:{state:{mode}},mobile:{active:touch,reset:noop},
  fly:{active:flying,enter(){this.active=true;},leave(){this.active=false;}},camera:{},keys:new Set(['KeyW']),
  liveThrow:{mode:'aim'},shotTimeline:{phase:'Aim'},snapshot:{phase:'Aim'},rightDrag:true,lastPointer:{x:1,y:1},
  yaw:0,pitch:0,top:0,kick:0,robotChargeTimer:null,robotRetryTimer:null,chargeMeter:{reset:noop},
  clearTimeout:noop,stopChargeSound:noop,setFastForward:noop,discardThrowMotion:noop,notice:noop,
  flightControls:()=>false,centerOnAim:noop,openLevelMenu:()=>calls.menu++,send:type=>{if(type==='cancel')calls.cancel++;},
  $:id=>{if(!elements.has(id))elements.set(id,{setAttribute:noop});return elements.get(id);}};
 runInNewContext(switchCode+'\n'+lockCode,state);
 return {state,calls,flush(){while(pending.length)pending.shift()();},escape(){document.pointerLockElement=null;events.pointerlockchange();}};
}
for(const mode of ['play','replay']){
 const t=setup({locked:true,mode});t.state.setFly(true,true);t.state.setFly(false,true);t.flush();
 assert.equal(t.state.document.pointerLockElement,t.state.canvas,'Both switches retain mouse capture in '+mode);
 assert.equal(t.calls.release,0);assert.equal(t.calls.capture,0,'No release/reacquire race');
 assert.equal(t.state.keys.size,0,'Movement is still reset when cameras switch');
 t.escape();assert.equal(t.state.document.pointerLockElement,null);assert.equal(t.calls.menu,1,'Escape still releases the camera');
}
for(const flying of [false,true]){
 const t=setup({flying});t.state.setFly(!flying,true);t.flush();
 assert.equal(t.calls.capture,1,'An explicit camera toggle captures in either direction');
 assert.equal(t.state.document.pointerLockElement,t.state.canvas);
}
const pending=setup();pending.state.captureMouse();pending.state.setFly(true,true);pending.state.setFly(false,true);pending.flush();
assert.equal(pending.calls.capture,1);assert.equal(pending.calls.release,0);assert.equal(pending.state.document.pointerLockElement,pending.state.canvas,'A capture still in flight survives both camera switches');
pending.state.cancel();pending.flush();assert.equal(pending.state.document.pointerLockElement,null,'Menus still release capture');
const interrupted=setup();interrupted.state.captureMouse();interrupted.state.cancel();interrupted.flush();
assert.equal(interrupted.state.document.pointerLockElement,null,'A menu or blur still cancels a pending capture');
const programmatic=setup();programmatic.state.setFly(true);programmatic.state.setFly(false);assert.equal(programmatic.calls.capture,0,'Programmatic camera changes do not capture an unlocked cursor');
const touch=setup({touch:true});touch.state.setFly(true,true);touch.state.setFly(false,true);assert.equal(touch.calls.capture,0,'Touch controls never request pointer lock');
console.log('PASS camera switches preserve active/pending mouse capture, explicit toggles capture both ways, menus/Escape release, and touch stays unlocked');
