import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{chromium}from'playwright';
const [origin,out]=process.argv.slice(2);assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));assert(out.startsWith('.local/'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']}),errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('web/public/game.js','utf8')+`
window.__verifyLiftReplay=()=>{
 const prior={...ui.state},spec=lifts.specs[0],pose=h=>({id:spec.id,height:h,carDoor:0,lowerDoor:0,upperDoor:0,moving:true,blocked:false}),feet={...spec.origin,y:spec.origin.y+2.525};
 try{
  ui.state.mode='replay';ui.state.replay={attempt:'lift-fixture',releaseTime:10,chargeTime:8,duration:6,thrower:{feet,power:.1},challenge:{},poses:[{t:0,p:{x:177,y:-7,z:6},q:{x:0,y:0,z:0,w:1}},{t:6,p:{x:177,y:-6,z:6},q:{x:0,y:0,z:0,w:1}}],liftFrames:[{t:-2,poses:[pose(0)]},{t:0,poses:[pose(2.5)]},{t:4,poses:[pose(5)]}]};
  const values=[];for(const t of[0,2,4,-2,0]){ui.state.replayTime=t;const frame=ui.timeline();lifts.update(frame.before.lifts,frame.after.lifts,frame.alpha);values.push({t,feet:frame.after.players[0].feet,height:frame.after.lifts[0].height});}return values;
 }finally{Object.assign(ui.state,prior);}
};`}));
 await page.goto(origin);await page.locator('#loading-name input[name="player"]').fill('Lift replay check',{timeout:120000});await page.getByRole('button',{name:'LET’S PLAY →'}).click();await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 const samples=await page.evaluate(()=>__verifyLiftReplay());for(const s of samples)assert(Math.abs(s.feet.y-(-11.2+s.height+.025))<1e-8,'Replay rider stays aligned with the native lift pose');assert.deepEqual(errors,[]);
 await writeFile(out,JSON.stringify({pass:true,samples,errors},null,2)+'\n');console.log('PASS Chrome saved lift replay: release, midpoint, arrival, backward seek and release again');
}finally{await browser.close();}
