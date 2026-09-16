// Local-only full-game instrumentation. The app served to production has no
// test hooks; this proxy appends them while preserving real rendering/physics.
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const port=Number(process.argv[2]||4388),backend=Number(process.argv[3]||4386),label=process.argv[4]||'current';
if(!/^[a-z-]+$/.test(label)||![port,backend].every(p=>Number.isInteger(p)&&p>=1024&&p<=65535))throw Error('Invalid local benchmark arguments');
const out=resolve('.local/gameplay-benchmark');await mkdir(out,{recursive:true});
const hook=`\nimport('/__gameplay/runner.js').then(({install})=>install({renderer,scene,ui,briefing,startup,startCharge,release,recall,setFastForward,handleMessage,shotPlayback,chargeMeter,reviewCamera:(p,t)=>{briefing.dismiss();ui.closeLevels();if(!fly.active)setFly(true);fly.camera.position.fromArray(p);fly.camera.lookAt(new THREE.Vector3(...t));fly.camera.rotation.z=0;},getSnapshot:()=>snapshot,getView:()=>({yaw,pitch,azimuth,elevation,ballCameraActive,returnRequested,recallPending:typeof recallPending==='undefined'?false:recallPending}),hint:()=>window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:ui.state.selected.hint}))}));\n`;
const server=http.createServer(async(req,res)=>{
 if(['/__gameplay/robot-lab.html','/__gameplay/robot-lab.js'].includes(req.url)){res.setHeader('Content-Type',req.url.endsWith('.html')?'text/html':'text/javascript');res.end(await readFile('web/benchmarks/'+req.url.split('/').at(-1)));return;}
 if(req.url==='/__gameplay/runner.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile('web/benchmarks/gameplay-runner.js'));return;}
 if(req.url==='/__gameplay/report'&&req.method==='POST'){
  const chunks=[];for await(const c of req)chunks.push(c);const report=JSON.parse(Buffer.concat(chunks));
  if(!/^[a-z0-9-]+$/.test(report.stage))throw Error('Invalid report stage');
  report.processes=execFileSync('ps',['-Ao','pid,ppid,rss,etime,command'],{encoding:'utf8'}).split('\n').filter(l=>/node web\/server.ts|Kyoto Physics Worker.app\/Contents\/MacOS/.test(l));
  await writeFile(resolve(out,label+'-'+report.stage+'.json'),JSON.stringify(report,null,2));res.end('saved');return;
 }
 const proxied=http.request({hostname:'127.0.0.1',port:backend,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:'+backend}},reply=>{
  if(req.url.split('?')[0]==='/game.js'){
   const chunks=[];reply.on('data',c=>chunks.push(c));reply.on('end',()=>{res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(Buffer.concat(chunks).toString()+hook);});
  }else{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);}
 });proxied.on('error',()=>{res.writeHead(502);res.end('Local backend unavailable');});req.pipe(proxied);
});
server.on('upgrade',(req,socket,head)=>{
 const proxy=http.request({hostname:'127.0.0.1',port:backend,path:req.url,headers:{...req.headers,host:'127.0.0.1:'+backend,origin:'http://127.0.0.1:'+backend}});
 proxy.on('upgrade',(reply,upstream,extra)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(reply.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)upstream.write(head);if(extra.length)socket.write(extra);socket.pipe(upstream);upstream.pipe(socket);upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());});proxy.on('error',()=>socket.destroy());proxy.end();
});
server.listen(port,'127.0.0.1',()=>console.log(`Gameplay ${label}: http://127.0.0.1:${port} -> ${backend}`));
