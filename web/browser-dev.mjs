// Static-only preview: no Unity process, WebSocket, database or gameplay API.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,extname} from 'node:path';
import {buildBrowser} from './build-browser.mjs';
import {BROWSER_PHYSICS} from './public/physics/shot.js';
import {verificationEndpoint} from './public/online-scores.js';
const portText=process.argv[2]||process.env.KYOTO_PORT||'4173',port=Number(portText);
if(!/^\d+$/.test(portText)||!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local port from 1024 to 65535');
const verifier=verificationEndpoint(process.env.KYOTO_VERIFY_URL);
const release=await buildBrowser();
const catalog=JSON.parse(await readFile('web/starter-challenges.json','utf8')).map(c=>({...c,physics:BROWSER_PHYSICS}));
const verificationMeta=verifier?`<meta name="kyoto-verifier" content="${verifier}">`:'';
const html=(await readFile('web/public/index.html','utf8')).replace('</head>',verificationMeta+'</head>');
const memory={'/':html,'/assets/station.json':release.stationBytes,'/campaign.json':JSON.stringify(catalog),'/browser-build.json':JSON.stringify(release.manifest)};
const files={'/physics-worker.js':'.local/browser-physics/worker.js','/station.collision.bin':'.local/browser-physics/station.collision.bin',...Object.fromEntries(Object.entries(release.files).map(([name,file])=>['/'+name,file]))};
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),home=path==='/'||path==='/index.html'||/^\/(level|replay)\/[\w-]+\/?$/.test(path);
  res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
  if(home||memory[path]){const body=home?html:memory[path];res.setHeader('Content-Type',home?'text/html':'application/json');res.setHeader('Content-Length',Buffer.byteLength(body));res.end(req.method==='HEAD'?undefined:body);return;}
  if(path.startsWith('/api/')||(path.startsWith('/assets/')&&!files[path])){res.writeHead(404);res.end();return;}
  const root=path.startsWith('/vendor/three/')?'node_modules/three':path.startsWith('/vendor/bvh/')?'node_modules/three-mesh-bvh':'web/public';
  const name=path.startsWith('/vendor/three/')?path.slice(14):path.startsWith('/vendor/bvh/')?path.slice(12):path.slice(1);
  const file=files[path]?resolve(files[path]):resolve(root,name);
  if(!files[path]&&!file.startsWith(resolve(root)+'/'))throw Error('Outside static root');
  const info=await stat(file);if(!info.isFile())throw Error('Not a file');res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Content-Length',info.size);
  if(req.method==='HEAD'){res.end();return;}createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Browser-only Kyoto Bounce: http://127.0.0.1:${port}`));
