// Preview only the exported files; no source-tree fallbacks or game services.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function staticPreview(directory){
 const root=resolve(directory),release=JSON.parse(await readFile(root+'/release.json','utf8'));
 if(release.kind!=='kyoto-static-v1'||!release.complete)throw Error('Build the static release before previewing it');
 const routes=(await readFile(root+'/_redirects','utf8')).trim().split('\n').map(line=>{
  const [path,target,status]=line.split(/\s+/);if(!path.endsWith('/*')||status!=='200')throw Error('Unsupported preview route');return {prefix:path.slice(0,-1),target};
 });
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
 return http.createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(path.startsWith('/_')||path.includes('\0'))throw Error('Private hosting metadata');
   const route=routes.find(r=>path.startsWith(r.prefix));if(route)path=route.target;
   if(path==='/')path='/index.html';
   const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw Error('Outside release');
   const info=await stat(file);if(!info.isFile())throw Error('Not a file');
   res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Content-Length',info.size);
   res.setHeader('Cache-Control',path.startsWith('/assets/chunks/')?'public, max-age=31536000, immutable':'no-cache');res.setHeader('X-Content-Type-Options','nosniff');
   if(req.method==='HEAD'){res.end();return;}createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.argv[2]||4431);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local port from 1024 to 65535');
 const server=await staticPreview('.local/browser-release');server.listen(port,'127.0.0.1',()=>console.log(`Packaged browser game: http://127.0.0.1:${port}`));
}
