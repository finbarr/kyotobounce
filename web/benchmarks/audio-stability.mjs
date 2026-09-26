// Actual Web Audio clock, with controlled main-thread stalls. No game connection.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out='.local/stability',revision=process.argv[2]||'HEAD';
await mkdir(out,{recursive:true});
const before=execFileSync('git',['show',`${revision}:web/public/arcade-audio.js`],{encoding:'utf8'});
const after=await readFile('web/public/arcade-audio.js','utf8');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const stallMs of [250,500])for(const [variant,source]of [['baseline',before],['fixed',after]]){
  const page=await browser.newPage();
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<button id="sound-toggle">Sound</button><button id="music-toggle">Music</button>'}));
  await page.goto('http://127.0.0.1:4391/');
  const data=await page.evaluate(async({source,stallMs})=>{
   const ticks=[];
   const code=source.replace('step++;next+=beat;','ticks.push({step,time:next,now:scoreTime()});step++;next+=beat;').replace('export function arcadeAudio(){','export function arcadeAudio(){const ticks=window.__audioTicks;');
   window.__audioTicks=ticks;
   const {arcadeAudio}=await import(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
   const sound=arcadeAudio();await sound.unlock();
   const start=performance.now();let stalls=0;
   const timer=setInterval(()=>{const end=performance.now()+stallMs;while(performance.now()<end){}stalls++;},1000);
   await new Promise(r=>setTimeout(r,12000));clearInterval(timer);
   const beat=60/112/2,origin=ticks[0].time-ticks[0].step*beat;
   const drift=ticks.map(t=>(t.time-t.step*beat-origin)*1000);
   return {durationMs:performance.now()-start,stalls,hidden:document.hidden,state:sound.state,ticks,maxGridDriftMs:Math.max(...drift.map(Math.abs)),effectiveBpm:(ticks.at(-1).step-ticks[0].step)*30/(ticks.at(-1).time-ticks[0].time),lateScheduledNotes:ticks.filter(t=>t.time<t.now-.001).length};
  },{source,stallMs});
  assert.equal(data.hidden,false,'Keep the audio benchmark visible');
  if(variant==='fixed'){assert.ok(data.maxGridDriftMs<.001,'The score stays on its original beat grid');if(stallMs===250)assert.equal(data.state.skippedMusicSteps,0,'The queue covers 250 ms stalls');}
  results.push({variant,stallMs,...data});await writeFile(`${out}/audio-stability.json`,JSON.stringify({date:new Date().toISOString(),browser:browser.version(),revision,results},null,2));
  console.log(JSON.stringify({variant,stallMs,maxGridDriftMs:data.maxGridDriftMs,effectiveBpm:data.effectiveBpm,skippedMusicSteps:data.state.skippedMusicSteps,hidden:data.hidden}));
  await page.close();
 }
}finally{await browser.close();}
