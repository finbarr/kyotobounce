import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QUICK?'.local/fleet/evidence/contracts-timing':'.local/fleet/evidence/contracts';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.route('http://127.0.0.1:4173/feedback-test',r=>r.fulfill({contentType:'text/html',body:'<button id="sound-toggle">Sound</button><button id="music-toggle">Music</button>'}));await page.goto('http://127.0.0.1:4173/feedback-test');
 await page.evaluate(async()=>{
  const Original=AudioContext;window.probe={active:0,max:0,created:0,gains:[]};window.AudioContext=class extends Original{constructor(){super();probe.ctx=this;for(const name of ['createOscillator','createBufferSource']){const f=this[name].bind(this);this[name]=()=>{const n=f();probe.active++;probe.created++;probe.max=Math.max(probe.max,probe.active);n.addEventListener('ended',()=>probe.active--);return n;};}const gain=this.createGain.bind(this);this.createGain=()=>{const g=gain();probe.gains.push(g);return g;};}};
  window.sound=(await import('/arcade-audio.js')).arcadeAudio();window.feedback=(await import('/arcade-feedback.js')).arcadeFeedback({cue(...args){window.feedbackCues=(window.feedbackCues||0)+1;if(!window.stress)sound.cue(...args);}});
  window.fixture=(mult=1,version='combo-v7')=>({version,potential:10000*mult,total:2500*mult,bankMultiplier:mult,styleBanks:Math.floor(mult),goalVisited:false,landingMultiplier:.25,lastBank:'STEEL BANK'});
 });
 assert.equal(await page.evaluate(()=>sound.state.initialized),false);await page.locator('#sound-toggle').click();await page.locator('#sound-toggle').click();await page.waitForTimeout(200);
 const checks=await page.evaluate(()=>{
  feedback.accept(fixture(2),'five');feedback.update(.016,'Flight','play');const five=document.getElementById('combo-mult').textContent;
  feedback.reset();feedback.accept(fixture(3),'four');feedback.update(.016,'Flight','play');const four=document.getElementById('combo-mult').textContent;
  const cuesBefore=window.feedbackCues;const nodes=document.querySelectorAll('#combo-spectacle *').length;let maxAnimations=0;
  const realNow=performance.now.bind(performance);let virtualNow=realNow();performance.now=()=>virtualNow;window.stress=true;for(let i=0;i<10000;i++){virtualNow+=1000/60;feedback.accept({...fixture(3+i*.003),styleBanks:3},'four');feedback.update(1/60,'Flight','play');maxAnimations=Math.max(maxAnimations,document.getAnimations().length);}
  performance.now=realNow;window.stress=false;const bounded=nodes===document.querySelectorAll('#combo-spectacle *').length;
  feedback.reset();return {five,four,bounded,maxAnimations,cues:window.feedbackCues,idleCues:window.feedbackCues-cuesBefore};
 });
 assert.equal(checks.five,'×2');assert.equal(checks.four,'×3');assert.ok(checks.bounded);assert.equal(checks.idleCues,0);assert.ok(checks.maxAnimations<=26);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{feedback.accept(fixture(32),'reduced');feedback.update(.016,'Flight','play');});assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 await page.screenshot({path:`${out}/reduced-motion.png`});await page.evaluate(()=>feedback.reset());await page.emulateMedia({reducedMotion:'no-preference'});
 // Real-time WebAudio endurance, with music and bounded cues for over two minutes.
 await page.evaluate(()=>{window.endurance=setInterval(()=>{sound.cue('bank',{multiplier:8});sound.motion(10,true,true);sound.startCharge(.4);setTimeout(()=>sound.stopCharge(),150);},1800);});
 for(let i=0;i<(process.env.QUICK?0:5);i++){await page.waitForTimeout(25000);console.log('Endurance seconds',(i+1)*25,await page.evaluate(()=>({active:probe.active,max:probe.max,created:probe.created})));}
 await page.evaluate(()=>{clearInterval(endurance);sound.stopCharge();sound.motion(0,true,false);sound.cue('goal');});await page.locator('#music-toggle').click();
 // Keep the otherwise inactive music branch processing while checking AudioParam decay.
 await page.evaluate(()=>{const o=probe.ctx.createOscillator(),g=probe.ctx.createGain();g.gain.value=0;o.connect(g).connect(probe.gains[1]);o.start();o.stop(probe.ctx.currentTime+1.5);o.addEventListener('ended',()=>{o.disconnect();g.disconnect();});});await page.waitForFunction(()=>probe.active<=1&&probe.gains[1].gain.value<.001,null,{timeout:15000});
 const idle=await page.evaluate(()=>({active:probe.active,max:probe.max,created:probe.created,musicGain:probe.gains[1].gain.value}));console.log('IDLE',idle);assert.ok(idle.active<=1);assert.ok(idle.musicGain<.001,'Music stays off through duck recovery');
 await page.locator('#sound-toggle').click();await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>probe.gains[0].gain.value<.001));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>sound.state.status),'suspended');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>sound.state.status),'running');
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',checks,idle,visibility:'Browser WebAudio with injected visibility events',enduranceSeconds:process.env.QUICK?0:125},null,2));console.log('PASS',checks,idle);
}finally{await browser.close();}
