// Reconnect transport only. Commands are never buffered/replayed: in particular,
// a release from an old socket must never become a throw on a new session.
export function gameConnection({url,hello,onMessage,onStatus,onTraffic=()=>{},WebSocketImpl=WebSocket,
  now=()=>performance.now(),later=setTimeout,cancelLater=clearTimeout,random=Math.random,
  events=globalThis.window,document=globalThis.document}){
  let socket,stopped=false,welcomed=false,attempts=0,retry,tick,probe,lastTick=now(),sequence=0;
  let generation=0;
  const publish=(status,extra={})=>onStatus(status,extra);
  function send(type,extra={}){
    if(!welcomed||socket?.readyState!==1)return false;
    // Continuous input is expendable under congestion; controls aren't queued.
    if(type==='input'&&socket.bufferedAmount>16384)return false;
    const raw=JSON.stringify({type,...extra});socket.send(raw);onTraffic('send',type,raw.length,null,socket.bufferedAmount);return true;
  }
  function schedule(){
    if(stopped||retry)return;
    const delay=Math.min(8000,500*2**Math.min(attempts++,4))*(.8+random()*.4);
    publish('reconnecting',{retryMs:delay});retry=later(()=>{retry=undefined;connect();},delay);
  }
  function reconnect(){
    if(stopped)return;
    welcomed=false;probe=undefined;generation++;
    const old=socket;socket=undefined;old?.close();schedule();
  }
  function connect(){
    if(stopped)return;
    const current=++generation;welcomed=false;probe=undefined;
    const ws=socket=new WebSocketImpl(url);let openedAt=now();
    publish(attempts?'reconnecting':'connecting');
    ws.addEventListener('open',()=>{if(current!==generation)return;openedAt=now();ws.send(JSON.stringify({type:'hello',...hello()}));});
    ws.addEventListener('message',event=>{
      if(current!==generation||stopped)return;
      let m;try{m=JSON.parse(event.data);}catch{return;}
      onTraffic('receive',m.type,event.data.length,m,ws.bufferedAmount);
      if(m.type==='pong'){
        if(probe&&m.sequence===probe.sequence){publish('latency',{rttMs:Math.max(0,now()-probe.at),server:m.server});probe=undefined;}
        return;
      }
      if(m.type==='welcome'){welcomed=true;attempts=0;probe=undefined;publish('connected',{resumed:m.resumed===true});}
      onMessage(m);
    });
    ws.addEventListener('close',event=>{
      if(current!==generation||stopped)return;
      welcomed=false;probe=undefined;socket=undefined;
      publish('disconnected',{closeCode:event.code});
      if(event.code===4009){stopped=true;cancelLater(tick);publish('replaced');return;}
      schedule();
    });
    ws.addEventListener('error',()=>{}); // close drives one bounded retry chain.
    function poll(){
      if(current!==generation||stopped)return;
      const time=now(),woke=time-lastTick>7000;lastTick=time;
      // Sleep/background throttling isn't proof of a broken network. Give the
      // newly awakened page a fresh probe before evaluating a timeout.
      if(woke){probe=undefined;openedAt=time;}
      if(!welcomed&&time-openedAt>12000){reconnect();return;}
      if(welcomed){
        if(probe&&time-probe.at>12000){reconnect();return;}
        if(!probe){probe={sequence:++sequence,at:time};send('ping',{sequence:probe.sequence});}
      }
      tick=later(poll,5000);
    }
    cancelLater(tick);lastTick=now();tick=later(poll,5000);
  }
  function wake(){
    if(stopped||document?.visibilityState==='hidden')return;
    if(!socket){cancelLater(retry);retry=undefined;connect();}
    else{probe=undefined;lastTick=now();}
  }
  function stop(){
    if(stopped)return;stopped=true;cancelLater(retry);cancelLater(tick);
    send('leave');welcomed=false;generation++;socket?.close();
    events?.removeEventListener('online',wake);events?.removeEventListener('pagehide',stop);
    document?.removeEventListener('visibilitychange',wake);
  }
  events?.addEventListener('online',wake);events?.addEventListener('pagehide',stop);
  document?.addEventListener('visibilitychange',wake);
  // Let the caller finish initializing its UI before the first status callback.
  retry=later(()=>{retry=undefined;connect();},0);
  return {send,stop};
}
