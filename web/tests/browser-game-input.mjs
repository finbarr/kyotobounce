import {testBrowserName} from './browser-engine.mjs';

// Keep real audio scheduling, voices and clocks, but silence the final output
// of headless tests so they do not play music through the user's speakers.
export async function silentOutput(context){
 await context.addInitScript(()=>{
  const NativeAudioContext=window.AudioContext;
  if('setSinkId' in NativeAudioContext.prototype){
   // Use a real-time silent sink, not the laptop's selected output device.
   // A disconnected/default device can report "running" with a frozen clock.
   // Chrome still processes the real graph and advances currentTime here:
   // https://developer.chrome.com/blog/audiocontext-setsinkid
   window.AudioContext=class extends NativeAudioContext{
    constructor(options={}){super({...options,sinkId:{type:'none'}});}
   };
   return;
  }
  const connect=AudioNode.prototype.connect,outputs=new WeakMap();
  AudioNode.prototype.connect=function(destination,...args){
   if(destination instanceof AudioDestinationNode){
    let output=outputs.get(destination);
    if(!output){output=this.context.createGain();output.gain.value=0;connect.call(output,destination);outputs.set(destination,output);}
    connect.call(this,output,...args);return destination;
   }
   return connect.call(this,destination,...args);
  };
 });
}

export const mobileInputKind=testBrowserName==='chrome'?'native touch':'native DOM pointer';
export async function activateButton(button){
 await button.waitFor({state:'visible'});
 if(!await button.isEnabled())throw new Error('Cannot activate a disabled button');
 // Native keyboard activation avoids the headless driver's intermittently
 // stalled DOM.scrollIntoViewIfNeeded command for already visible controls.
 await button.press('Enter');
}
export async function mobileHold(page,duration){
 const button=page.locator('#mobile-throw');await button.waitFor({state:'visible'});
 // Playwright only exposes native touch tap in Firefox/WebKit. Use the real
 // headless DOM pointer hold there; Chrome retains native touch/capture tests.
 // Neither path sends OS mouse input or captures the desktop pointer.
 if(testBrowserName!=='chrome'){await button.click({delay:duration});return;}
 const touch=await page.context().newCDPSession(page);
 try{
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const box=await button.boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await page.waitForTimeout(duration);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch.detach();}
}
