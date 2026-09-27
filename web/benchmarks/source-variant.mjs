import http from 'node:http';
// Complete tracked browser sources, with local additions, pinned for one run.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function browserVariant(ref){
 const revision=execFileSync('git',['rev-parse','--verify',ref||'HEAD'],{encoding:'utf8'}).trim();
 const args=ref?['ls-tree','-rz','--name-only',revision,'web/public']:['ls-files','-z','--cached','--others','--exclude-standard','web/public'];
 const names=[...new Set(execFileSync('git',args,{encoding:'utf8'}).split('\0').filter(Boolean))];
 const files=new Map(),hashes={};
 for(const file of names){
  const bytes=ref?execFileSync('git',['show',`${revision}:${file}`],{maxBuffer:20_000_000}):await readFile(file);
  files.set('/'+file.slice('web/public/'.length),bytes);hashes[file]=hash(bytes);
 }
 const pinned={};
 for(const file of ['assets-manifest.json','package-lock.json','runtime/station-layout.json','web/public/assets/runtime/optimization.json'])pinned[file]=hash(await readFile(file));
 // Source variants share the current dependencies and authored assets. Reject
 // comparisons whose pinned inputs differ rather than silently mixing versions.
 for(const file of ['assets-manifest.json','package-lock.json'])if(ref&&hash(execFileSync('git',['show',`${revision}:${file}`]))!==pinned[file])throw Error(`${file} differs: use matching complete checkouts`);
 return {files,receipt:{revision,workingCopy:!ref,hashes,pinned}};
}
// Serve a real loopback document. Mocking the top-level HTML response in
// Chrome can leave local WebSocket handshakes waiting before they reach Node.
export async function serveVariant(backend,variant,transformGame=source=>source){
 const target=new URL(backend),sockets=new Set();
 if(!['127.0.0.1','localhost'].includes(target.hostname))throw Error('Loopback backend required');
 const types={js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',html:'text/html; charset=utf-8',json:'application/json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',ico:'image/x-icon'};
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,backend).pathname;
  const key=path==='/'||/^\/(level|replay)\//.test(path)?'/index.html':path;
  let body=variant.files.get(key);
  if(body){
   if(key==='/game.js')body=Buffer.from(transformGame(body.toString()));
   res.writeHead(200,{'Content-Type':types[key.split('.').at(-1)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store'});res.end(body);return;
  }
  if(/\.(js|css|html)$/.test(key)&&!key.startsWith('/vendor/')){res.writeHead(404);res.end('Absent from selected source variant');return;}
  const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers:{...req.headers,host:target.host,origin:target.origin}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end('Local backend unavailable');});req.pipe(upstream);
 });
 server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 server.on('upgrade',(req,socket,head)=>{
  const proxy=http.request({hostname:target.hostname,port:target.port,path:req.url,headers:{...req.headers,host:target.host,origin:target.origin}});
  proxy.on('upgrade',(reply,upstream,extra)=>{
   socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(reply.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');
   if(head.length)upstream.write(head);if(extra.length)socket.write(extra);
   socket.pipe(upstream);upstream.pipe(socket);upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());
  });proxy.on('error',()=>socket.destroy());proxy.on('response',()=>socket.destroy());proxy.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {origin:'http://127.0.0.1:'+server.address().port,close:async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}
