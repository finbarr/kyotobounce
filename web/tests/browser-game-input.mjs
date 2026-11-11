import {testBrowserName} from './browser-engine.mjs';

// Keep real audio scheduling, voices and clocks, but silence the final output
// of headless tests so they do not play music through the user's speakers.
export async function silentOutput(context){
 await context.addInitScript(()=>{
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
