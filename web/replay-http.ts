import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Store} from './store.ts';

function acceptsEncoding(value:string|undefined,name:string){
 const encodings=new Map((value||'').split(',').map(part=>{const [name,...params]=part.trim().toLowerCase().split(';'),q=params.find(p=>p.trim().startsWith('q='));return [name, q?Number(q.trim().slice(2)):1] as const;}));
 return (encodings.get(name)??(name==='identity'?(encodings.get('*')===0?0:1):encodings.get('*')??0))>0;
}
function matchesETag(header:string|undefined,etag:string){return (header||'').split(',').some(tag=>tag.trim()==='*'||tag.trim().replace(/^W\//,'')===etag.replace(/^W\//,''));}
const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

// Public replay routes deliberately have no worker/session dependency.
export async function serveReplay(request:IncomingMessage,response:ServerResponse,path:string,store:Store,htmlShell:string):Promise<boolean>{
 const route=path.match(/^\/(api\/)?replay\/([a-zA-Z0-9_-]{1,64})\/?$/);if(!route)return false;
 const {entry,status}=store.replayResponse(route[2]!);
 if(route[1]){
  const headers:Record<string,string>={'Content-Type':'application/json','X-Content-Type-Options':'nosniff','Cache-Control':entry?'public, max-age=0, must-revalidate':'no-store','Vary':'Accept-Encoding','X-Replay-Cache':status};
  if(!entry){const body=JSON.stringify({error:'Replay not found. This shot may no longer be available.'});response.writeHead(404,{...headers,'Content-Length':String(Buffer.byteLength(body))});response.end(request.method==='HEAD'?undefined:body);return true;}
  headers.ETag=entry.etag;
  // Revalidations still count as reads: lookup already extended the sliding TTL.
  if(matchesETag(request.headers['if-none-match'],entry.etag)){response.writeHead(304,headers);response.end();return true;}
  const acceptsCompressed=acceptsEncoding(request.headers['accept-encoding'],'gzip');
  if(acceptsCompressed)await entry.ready;
  const compressed=acceptsCompressed&&entry.gzip;
  if(!compressed&&!acceptsEncoding(request.headers['accept-encoding'],'identity')){response.writeHead(406,{'Cache-Control':'no-store','Vary':'Accept-Encoding'});response.end();return true;}
  const body=compressed||entry.body;if(compressed)headers['Content-Encoding']='gzip';
  headers['Content-Length']=String(body.byteLength);response.writeHead(200,headers);response.end(request.method==='HEAD'?undefined:body);return true;
 }
 const title=entry?.title||'Replay unavailable — Kyoto Bounce',description=entry?.description||'This replay could not be found.';
 const html=htmlShell.replace('<title>Kyoto Bounce — Station Arcade</title>',`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website">`);
 response.writeHead(entry?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Replay-Cache':status});response.end(request.method==='HEAD'?undefined:html);return true;
}
