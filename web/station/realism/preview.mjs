// Read-only local inspection of a candidate; maintained assets are not replaced.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=process.cwd(),candidate=resolve(process.argv[2]||''),port=Number(process.argv[3]||4394);
if(!candidate.startsWith(resolve('.local')+'/'))throw Error('Preview a local candidate directory');
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const p=new URL(req.url,'http://localhost').pathname;let file;
  if(/^\/assets\/(source|runtime)\/(atrium\.glb|station\.json)$/.test(p))file=resolve(candidate,p.endsWith('/atrium.glb')&&p.includes('/runtime/')?'atrium.runtime.glb':p.split('/').at(-1));
  else if(p==='/')file=resolve('web/benchmarks/index.html');
  else if(p.startsWith('/bench/'))file=resolve('web/benchmarks',p.slice(7));
  else if(p.startsWith('/current/'))file=resolve('web/public',p.slice(9));
  else if(p.startsWith('/assets/source/'))file=resolve('web/public/assets',p.slice(15));
  else if(p.startsWith('/assets/runtime/'))file=resolve('web/public/assets/runtime',p.slice(16));
  else if(p.startsWith('/vendor/three/'))file=resolve('node_modules/three',p.slice(14));
  else if(p.startsWith('/vendor/bvh/'))file=resolve('node_modules/three-mesh-bvh',p.slice(12));
  else throw Error('Not found');
  if(!file.startsWith(root+'/'))throw Error('Outside workspace');
  let data=await readFile(file);
  if(p==='/bench/render.js')data=Buffer.from(data.toString().replace('drawing buffer, every triangle and original texture resolution. No adaptive resolution.','drawing buffer; local exterior candidate with municipal maps capped at 1024 px. Static visual inspection; gameplay acceptance remains pending.')+'\nwindow.__candidate={renderer,scene,camera,station,look,data,setView(value){view=value;render();}};\n');
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Candidate preview http://127.0.0.1:${port}/?variant=optimized&inspect`));
