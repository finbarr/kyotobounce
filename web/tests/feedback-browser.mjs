// Real input and authoritative events, on an isolated local worker only.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.KYOTO_URL||'http://127.0.0.1:4174';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname)||origin===process.env.BOXHAVEN_PREVIEW_URL,'Use an isolated local server or this machine preview only');
const out=process.env.KYOTO_EVIDENCE||'.local/fleet/evidence/browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],events=[],bursts=[];
if(process.env.BASELINE){for(const module of ['audio','feedback'])await page.route(`**/arcade-${module}.js`,async r=>r.fulfill({contentType:'text/javascript',body:await readFile(`.local/fleet/evidence/before-${module}.js`,'utf8')}));}
await page.addInitScript(()=>{
 Object.defineProperty(window,'devicePixelRatio',{get:()=>.35}); // Software-rendered 3D; full-resolution DOM/video.
 const Original=window.AudioContext;window.audioProbe={active:0,max:0,created:0,contexts:0,chunks:[]};
 window.AudioContext=class extends Original{constructor(...args){super(...args);const p=window.audioProbe;p.contexts++;p.ctx=this;const dest=this.createMediaStreamDestination();p.recorder=new MediaRecorder(dest.stream);p.recorder.ondataavailable=e=>p.chunks.push(e.data);p.recorder.start();
 const original=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...rest){if(target===p.ctx.destination)original.call(this,dest);return original.call(this,target,...rest);};
 for(const name of ['createOscillator','createBufferSource']){const fn=this[name].bind(this);this[name]=()=>{const node=fn();p.created++;p.active++;p.max=Math.max(p.max,p.active);node.addEventListener('ended',()=>p.active--);return node;};}
 }};
});
page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});page.on('websocket',ws=>ws.on('framereceived',f=>{const m=JSON.parse(String(f.payload));if(m.liveScore||m.type==='result'||m.type==='error')events.push(m);if(m.type==='error')console.log('SERVER',m);}));
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});console.log('Loaded');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:240000});
 if(await page.evaluate(()=>window.kyotoState.briefing)){await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);}
 await page.getByRole('button',{name:'First Bank',exact:true}).click();await page.waitForFunction(()=>window.kyotoState.briefing);await page.locator('#briefing-play').click();await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition);
 // The UI's own aim hint, then a strong actual keyboard throw for a long chain.
 await page.locator('canvas').focus();await page.keyboard.press('KeyH');await page.waitForTimeout(500);await page.keyboard.press('KeyP');console.log('Aimed',await page.evaluate(()=>({yaw:kyotoState.yaw,pitch:kyotoState.pitch})));
 for(let retry=0;retry<3;retry++){await page.locator('canvas').focus();await page.keyboard.down('Space');try{await page.waitForFunction(()=>window.kyotoState.charging,null,{timeout:8000});break;}catch(error){await page.keyboard.up('Space');if(retry===2)throw error;await page.waitForTimeout(500);}}console.log('Charging');await page.waitForTimeout(1900);await page.keyboard.up('Space');await page.waitForFunction(()=>window.kyotoState.phase==='Flight');
 let previous='';for(let i=0;i<80;i++){
  await page.waitForTimeout(250);const sample=await page.evaluate(()=>({text:document.getElementById('combo-mult')?.textContent,hidden:document.getElementById('combo-spectacle')?.hidden,time:performance.now()/1000,tier:document.getElementById('combo-spectacle')?.dataset.tier,state:window.kyotoState.phase}));
  if(!sample.hidden&&sample.text&&sample.text!==previous){previous=sample.text;bursts.push(sample);console.log('BURST',sample.text,sample.tier);}
  if(sample.state==='Result')break;
 }
 await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.kyotoState.phase==='Aim');await page.keyboard.press('Escape');
 await page.locator('#sound-toggle').click();await page.waitForFunction(()=>window.kyotoState.audio.muted);
 await page.locator('#music-toggle').click();await page.locator('#sound-toggle').click();await page.waitForTimeout(1600);
 const idle=await page.evaluate(()=>({active:audioProbe.active,max:audioProbe.max,created:audioProbe.created,contexts:audioProbe.contexts}));assert.ok(idle.active<=1,JSON.stringify(idle));assert.equal(idle.contexts,1);
 await page.locator('#music-toggle').click();await page.waitForFunction(()=>window.kyotoState.audio.music);
 const live=events.filter(e=>e.liveScore);assert.ok(live.some(e=>e.liveScore.styleBanks>=2),'Actual throw produces multiple banks');if(!process.env.BASELINE)assert.ok(bursts.length>=3,'Several visible multiplier jumps');assert.deepEqual(errors,[]);
 const capture=await page.evaluate(async()=>{const p=audioProbe;await new Promise(r=>{p.recorder.onstop=r;p.recorder.stop();});const bytes=new Uint8Array(await new Blob(p.chunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);});await writeFile(`${out}/play-audio.webm`,Buffer.from(capture,'base64'));
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',idle,bursts,events,errors},null,2));console.log('PASS',JSON.stringify({idle,bursts}));
}catch(e){await page.screenshot({path:`${out}/failure.png`,timeout:5000}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),events,bursts,errors},null,2));throw e;}
finally{await context.close();await browser.close();}
