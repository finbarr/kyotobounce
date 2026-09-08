// Original-score evidence renderer; no game records or external audio assets.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source=process.argv[2]||'web/public/arcade-audio.js',out=process.argv[3]||'.local/fleet/evidence/after';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage();page.on('console',m=>console.log(m.text()));await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://127.0.0.1:4173');
 const code=await readFile(source,'utf8');
 const result=await page.evaluate(async code=>{
  document.body.innerHTML='<button id="sound-toggle"></button><button id="music-toggle"></button>';
  localStorage.removeItem('kyoto-audio');
  const seconds=192,rate=22050,ctx=new OfflineAudioContext(1,seconds*rate,rate);let now=0,scheduler,created=0,ended=0;
  Object.defineProperty(ctx,'currentTime',{configurable:true,get:()=>now});Object.defineProperty(ctx,'state',{get:()=> 'running'});
  for(const name of ['createOscillator','createBufferSource']){const original=ctx[name].bind(ctx);ctx[name]=()=>{created++;const node=original();node.addEventListener('ended',()=>ended++);return node;};}
  window.AudioContext=function(){return ctx;};window.setInterval=fn=>{scheduler=fn;return 1;};
  const {arcadeAudio}=await import(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));const audio=arcadeAudio();await audio.unlock();
  console.log('scheduling');for(now=0;now<seconds-.2;now+=.06){scheduler();}console.log('scheduled',created);
  const state=audio.state;delete ctx.currentTime;
  const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);console.log('rendered');let peak=0,sum=0;
  const pcm=new Uint8Array(44+data.length*2),view=new DataView(pcm.buffer),str=(o,s)=>[...s].forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');view.setUint32(4,36+data.length*2,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,data.length*2,true);
  for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));sum+=data[i]**2;view.setInt16(44+i*2,Math.max(-1,Math.min(1,data[i]))*32767,true);}
  let binary='';for(let i=0;i<pcm.length;i+=8192)binary+=String.fromCharCode(...pcm.subarray(i,i+8192));
  return {wav:btoa(binary),seconds,peak,rms:Math.sqrt(sum/data.length),created,ended,state};
 },code);
 await writeFile(`${out}/music.wav`,Buffer.from(result.wav,'base64'));delete result.wav;await writeFile(`${out}/render.json`,JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
