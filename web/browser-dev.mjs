// Static-only preview: no Unity process, WebSocket, database or gameplay API.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,extname} from 'node:path';
import {stationRelease} from '../deploy/station.mjs';
import {buildBrowserPhysics} from './build-physics.mjs';
import {BROWSER_PHYSICS} from './public/physics/shot.js';
const port=Number(process.argv[2]||4430);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local port from 1024 to 65535');
await buildBrowserPhysics();const release=await stationRelease();
delete release.layoutBytes;
const receipt=JSON.parse(await readFile('.local/browser-physics/station.collision.bin.json','utf8'));
if(receipt.layoutSha256!==release.layoutSha256)throw Error('Regenerate the browser collision pack for this station');
const catalog=JSON.parse(await readFile('web/starter-challenges.json','utf8')).map(c=>({...c,physics:BROWSER_PHYSICS}));
const html=(await readFile('web/public/index.html','utf8')).replace('</head>','<meta name="kyoto-runtime" content="browser"></head>');
const memory={'/':html,'/assets/station.json':release.stationBytes,'/campaign.json':JSON.stringify(catalog)};
const files={'/physics-worker.js':'.local/browser-physics/worker.js','/station.collision.bin':'.local/browser-physics/station.collision.bin',...Object.fromEntries(Object.entries(release.files).map(([name,file])=>['/'+name,file]))};
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname,home=path==='/'||/^\/(level|replay)\/[\w-]+\/?$/.test(path);
  if(home||memory[path]){const body=home?html:memory[path];res.setHeader('Content-Type',home?'text/html':'application/json');res.end(body);return;}
  if(path.startsWith('/api/')||path==='/browser-build.json'){res.writeHead(404);res.end();return;}
  const root=path.startsWith('/vendor/three/')?'node_modules/three':path.startsWith('/vendor/bvh/')?'node_modules/three-mesh-bvh':'web/public';
  const name=path.startsWith('/vendor/three/')?path.slice(14):path.startsWith('/vendor/bvh/')?path.slice(12):path.slice(1);
  const file=files[path]?resolve(files[path]):resolve(root,name);
  if(!files[path]&&!file.startsWith(resolve(root)+'/'))throw Error('Outside static root');
  const info=await stat(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Content-Length',info.size);createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Browser-only Kyoto Bounce: http://127.0.0.1:${port}`));
