// Isolated proposed waypoint-v1 payloads. This is NOT native waypoint verification.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.local/fleet/evidence/waypoint-fixtures';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out,size:{width:1280,height:800}}}),page=await context.newPage();
try{
 await page.addInitScript(()=>{const Original=AudioContext;window.AudioContext=class extends Original{constructor(){super();window.frequencies=[];const create=this.createOscillator.bind(this);this.createOscillator=()=>{const o=create(),set=o.frequency.setValueAtTime.bind(o.frequency);o.frequency.setValueAtTime=(value,time)=>{frequencies.push(value);return set(value,time);};return o;};const dest=this.createMediaStreamDestination(),connect=AudioNode.prototype.connect,ctx=this;AudioNode.prototype.connect=function(target,...args){if(target===ctx.destination)connect.call(this,dest);return connect.call(this,target,...args);};window.chunks=[];window.recorder=new MediaRecorder(dest.stream);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();}};});
 await page.route('**/waypoint-fixture',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<link rel="stylesheet" href="/arcade.css"><body style="background:#101c2c"><p style="color:white;margin:30px">ISOLATED WAYPOINT CONTRACT FIXTURE · NOT NATIVE GAMEPLAY</p><button id="sound-toggle">Sound</button><button id="music-toggle">Music</button></body>'}));await page.goto((process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4173')+'/waypoint-fixture');
 await page.evaluate(async()=>{
  window.calls=[];window.sound=(await import('/arcade-audio.js')).arcadeAudio();window.feedback=(await import('/arcade-feedback.js')).arcadeFeedback({cue(...args){calls.push(args);sound.cue(...args);}});
  window.score=n=>({version:'waypoint-v1',waypointCount:n,waypointIds:Array.from({length:n},(_,i)=>`target-${i+1}`),waypointHits:Array.from({length:n},(_,i)=>({waypointId:`target-${i+1}`,time:i,point:{x:i,y:1,z:0},normal:{x:0,y:1,z:0},surface:'floor'})),waypointBase:10000*(2**n-1),waypointMultiplier:2**n,destinationReached:false,destinationBonus:0,bankMultiplier:1,timeMultiplier:1,activeSeconds:n,total:10000*(2**n-1),potential:10000*(2**n-1),styleBanks:0,landingMultiplier:0});
  window.tick=setInterval(()=>feedback.update(.016,'Flight','play'),16);
 });
 await page.locator('#music-toggle').click();await page.evaluate(()=>sound.unlock());
 const shown=[];
 for(let n=1;n<=5;n++){
  await page.evaluate(n=>feedback.accept(score(n),'fixture-shot'),n);await page.waitForTimeout(1400);
  shown.push(await page.locator('#combo-mult').textContent());assert.equal(shown.at(-1),`×${2**(n-1)}`);
  await page.screenshot({path:`${out}/chain-${n}.png`});
 }
 assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='waypoint').length),5);
 await page.evaluate(()=>{for(let i=0;i<500;i++)feedback.accept(score(5),'fixture-shot');});await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='waypoint').length),5);
 // Queue a future hit, scrub backwards before the next rendered frame, and wait beyond the cooldown.
 await page.evaluate(()=>{clearInterval(tick);feedback.accept(score(6),'fixture-shot');feedback.accept(score(2),'fixture-shot');feedback.update(.016,'Flight','replay');});await page.waitForTimeout(1500);await page.evaluate(()=>feedback.update(.016,'Flight','replay'));
 assert.equal(await page.locator('#combo-spectacle').isVisible(),false);assert.equal(await page.locator('#combo-total').textContent(),'30,000');assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='waypoint').length),5);
 await page.evaluate(()=>{feedback.accept(score(6),'fixture-shot');feedback.update(.016,'Flight','replay');});assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='waypoint').length),5,'Already seen IDs remain quiet after rewind');
 await page.evaluate(()=>feedback.result({attempt:'fixture-shot',breakdown:{...score(6),outcome:'miss'}}));assert.equal(await page.locator('#combo-mult').textContent(),'630,000');assert.match(await page.locator('#combo-sub').textContent(),/POINTS KEPT/);assert.ok(await page.evaluate(()=>{frequencies.length=0;sound.cue('result','miss');return frequencies.includes(440);}), 'Earned waypoint miss uses positive result phrase');await page.screenshot({path:`${out}/destination-missed-points-kept.png`});
 await page.evaluate(()=>{feedback.reset();feedback.accept(score(0),'destination');feedback.accept({...score(2),destinationReached:true,destinationBonus:50000,total:80000},'destination');feedback.update(.016,'Flight','play');});assert.equal(await page.locator('#combo-mult').textContent(),'+50,000');assert.equal(await page.locator('#combo-call').textContent(),'DESTINATION BONUS');await page.waitForTimeout(500);await page.screenshot({path:`${out}/destination-bonus.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{feedback.reset();feedback.accept(score(4),'reduced');feedback.update(.016,'Flight','play');});assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.equal(await page.locator('#combo-mult').textContent(),'×8');
 await page.evaluate(()=>feedback.result({attempt:'reduced',breakdown:{...score(4),outcome:'forfeit',total:0}}));assert.equal(await page.locator('#combo-spectacle').isVisible(),false,'Recall does not celebrate forfeited points');
 await page.evaluate(()=>{feedback.reset();feedback.accept(score(4),'route-miss');feedback.update(.016,'Flight','play');feedback.result({attempt:'route-miss',breakdown:{...score(4),outcome:'route-missed',total:0}});frequencies.length=0;sound.cue('result','route-missed');});
 assert.equal(await page.locator('#combo-spectacle').isVisible(),false,'Missing a required route does not celebrate zero points');assert.equal(await page.evaluate(()=>frequencies.includes(440)),false,'Required-route miss retains the unsuccessful result phrase');
 const audio=await page.evaluate(async()=>{await new Promise(r=>{recorder.onstop=r;recorder.stop();});const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);});await writeFile(`${out}/fixture-audio.webm`,Buffer.from(audio,'base64'));
 await writeFile(`${out}/result.json`,JSON.stringify({status:'pass',scope:'Isolated browser fixtures; compatible native waypoint worker not supplied',shown,calls:await page.evaluate(()=>calls)},null,2));console.log('PASS earned x1/x2/x4/x8/x16, duplicate IDs, rewind, retained score, destination bonus and reduced motion');
}finally{await context.close();await browser.close();}
