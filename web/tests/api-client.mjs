import WebSocket from 'ws';
import {ShotPlayback} from '../public/shot-playback.js';
export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class Client{
 constructor(url='ws://127.0.0.1:4173'){
  this.socket=new WebSocket(url,{origin:url.replace(/^ws/,'http').replace(/\/$/,'')});this.messages=[];this.waiters=[];this.state=null;
  this.playback=new ShotPlayback();this.chunks=[];
  const deliver=m=>{this.messages.push(m);if(this.messages.length>10000)this.messages.shift();if(m.type==='welcome'){this.guestId=m.id;this.id=m.sessionId||m.id;this.token=m.token;}if(m.type==='state'){this.state=m;this.stateReceived=performance.now();}for(const w of [...this.waiters])if(w.predicate(m)){this.waiters.splice(this.waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(m);}};
  this.socket.on('message',data=>{const m=JSON.parse(data.toString());
   if(m.type==='shot-resume'){this.playback.resume(m);return;}
   if(m.type==='shot-chunk'){this.chunks.push({...m,received:performance.now()});this.playback.accept(m,performance.now());return;}
   if(m.type==='result'&&this.playback.result(m))return;
   if(m.type==='state'){if(['Aim','Charging'].includes(m.phase))this.playback.clear(true);else if(this.playback.active)return;}
   deliver(m);
  });
  this.ticker=setInterval(()=>{const frame=this.playback.sample(performance.now());if(frame)for(const message of frame.messages)deliver(message);},10);
 }
 next(predicate,timeout=15000){return new Promise((resolve,reject)=>{const w={predicate,resolve,timer:setTimeout(()=>{this.waiters=this.waiters.filter(x=>x!==w);reject(new Error('Timed out waiting for '+predicate.toString()+'; phase='+this.state?.phase+'; recent='+this.messages.slice(-8).map(m=>m.type+':'+(m.phase||m.message||'')).join(',')));},timeout)};this.waiters.push(w);});}
 send(type,extra={}){this.socket.send(JSON.stringify({type,...(type==='hello'?{protocol:'shot-stream-v2'}:{}),...extra}));}
 async request(type,extra={},expected){const next=this.next(m=>m.type===expected||m.type==='error');this.send(type,extra);const m=await next;if(m.type==='error')throw new Error(m.message);return m;}
 async join(token){if(this.socket.readyState!==WebSocket.OPEN)await new Promise((resolve,reject)=>{if(this.socket.readyState!==WebSocket.CONNECTING){reject(new Error('Connection closed before joining'));return;}this.socket.once('open',resolve);this.socket.once('error',reject);this.socket.once('close',()=>reject(new Error('Connection closed before joining')));});const m=await this.request('hello',{token},'welcome');if(!this.state?.players.some(p=>p.id===this.id))await this.next(s=>s.type==='state'&&s.players.some(p=>p.id===this.id));return m;}
 input(extra={}){this.send('input',{x:0,z:0,yaw:90,pitch:15,top:0,kick:0,fast:false,...extra});}
 async throw(holdMs,settings={},timeout=40000){
  this.input(settings);await delay(120);const result=this.next(m=>m.type==='result'||m.type==='error'||m.type==='notice',timeout);
  this.send('charge',{challengeId:this.state.challenge?.id||null,revision:this.state.challenge?.revision||null,layout:this.state.layout,physics:this.state.physics,powerRange:settings.powerRange||'full',...(settings.character?{character:settings.character}:{})});await delay(holdMs);this.send('release');
  const end=await result;if(end.type!=='result')throw new Error(end.message);await delay(80);return {result:end,final:this.state.ball,contacts:this.messages.filter(m=>m.type==='impact'),state:this.state};
 }
 async place(center,radius,slot='goal'){return (await this.request('place',{slot,radius,origin:{x:center.x,y:center.y+3,z:center.z},direction:{x:0,y:-1,z:0}},'placement')).disk;}
 close(){clearInterval(this.ticker);if(this.socket.readyState===WebSocket.OPEN)this.send('leave');this.socket.close();for(const w of this.waiters)clearTimeout(w.timer);this.waiters=[];}
}
