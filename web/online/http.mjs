import http from 'node:http';
import {HttpError,insist,uuid,fields,playerName,credential} from './protocol.mjs';
import {requestGate} from './resource-policy.mjs';
const MAX_BODY=65536;
function body(req){
 insist((req.headers['content-type']||'').split(';')[0]==='application/json',415,'Send JSON');
 return new Promise((resolve,reject)=>{
  let bytes=0,ended=false;const chunks=[];
  req.on('data',chunk=>{if(ended)return;bytes+=chunk.length;if(bytes>MAX_BODY){ended=true;chunks.length=0;reject(new HttpError(413,'Request body is too large'));}else chunks.push(chunk);});
  req.on('end',()=>{if(ended)return;ended=true;try{resolve(bytes?JSON.parse(Buffer.concat(chunks).toString('utf8')):{});}catch{reject(new HttpError(400,'Invalid JSON'));}});
  req.on('error',()=>{if(!ended){ended=true;reject(new HttpError(400,'Request interrupted'));}});
 });
}
export function verificationHttp(service,{origins=[],gate=requestGate()}={}){
 const allowed=new Set(origins),active=new Set();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const controller=new AbortController();active.add(controller);res.on('close',()=>{active.delete(controller);if(!res.writableEnded)controller.abort();});
  const respond=(value,status=200)=>{if(!res.destroyed){res.writeHead(status);res.end(JSON.stringify(value));}};
  try{
   const release=gate();res.once('finish',release);res.once('close',release);
   const origin=req.headers.origin;if(origin){insist(allowed.has(origin),403,'Origin is not allowed');res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
   if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Max-Age','600');respond({},204);return;}
   const {pathname,searchParams}=new URL(req.url,'http://localhost');
   insist(!searchParams.size||req.method==='GET'&&['/v1/courses','/v1/progress'].includes(pathname)&&searchParams.size===1&&searchParams.has('after'),400,'Unsupported query parameters');
   if(req.method==='GET'&&pathname==='/health'){respond({status:'ready',layout:service.layout,physics:[...service.catalog.values()][0].physics});return;}
   if(req.method==='GET'&&pathname==='/v1/courses'){respond(await service.listCourses(searchParams.get('after')??undefined));return;}
   if(req.method==='POST'&&pathname==='/v1/identity'){const c=credential(req.headers.authorization),m=fields(await body(req),['name']);respond(await service.identity(c,playerName(m.name)));return;}
   const publicReplay=/^\/v1\/replays\/([^/]+)(?:\/inputs\/(\d+))?$/.exec(pathname);
   if(req.method==='GET'&&publicReplay){insist(uuid(publicReplay[1]),404,'Replay not found');const sequence=Number(publicReplay[2]);insist(publicReplay[2]===undefined||Number.isSafeInteger(sequence),400,'Invalid input sequence');respond(publicReplay[2]===undefined?await service.replay(publicReplay[1]):await service.replayInputs(publicReplay[1],sequence));return;}
   const board=/^\/v1\/courses\/([\w-]+)\/leaderboard$/.exec(pathname);
   if(req.method==='GET'&&board){const player=req.headers.authorization?await service.authenticate(credential(req.headers.authorization)):null;respond(await service.board(board[1],player?.id));return;}
   const player=await service.authenticate(credential(req.headers.authorization));
   const publication=/^\/v1\/publications\/([^/]+)$/.exec(pathname);
   if(req.method==='POST'&&publication){const m=fields(await body(req),['course','baseRevision','header']);respond(await service.publish(player,publication[1],m.course,m.baseRevision,m.header),201);return;}
   if(req.method==='GET'&&pathname==='/v1/progress'){respond(await service.progress(player.id,searchParams.get('after')??undefined));return;}
   const match=/^\/v1\/attempts\/([^/]+)(?:\/(seal|advance|cancel|inputs)(?:\/(\d+))?)?$/.exec(pathname);
   insist(match&&uuid(match[1]),404,'Route not found');const [,id,action,rawSequence]=match;
   if(req.method==='GET'&&!action){respond(await service.status(player.id,id));return;}
   if(req.method==='POST'&&!action){const m=fields(await body(req),['header']);respond(await service.create(player,id,m.header),201);return;}
   if(req.method==='PUT'&&action==='inputs'&&rawSequence!==undefined){const m=fields(await body(req),['runs']);respond(await service.upload(player.id,id,Number(rawSequence),m.runs));return;}
   insist(req.method==='POST'&&['seal','advance','cancel'].includes(action)&&rawSequence===undefined,404,'Route not found');fields(await body(req),[]);
   const reply=action==='advance'?await service.advance(player.id,id,controller.signal):await service[action](player.id,id);
   respond(reply,action==='advance'&&['pending','verifying'].includes(reply.state)?202:200);
  }catch(error){
   if(!(error instanceof HttpError))console.error(JSON.stringify({event:'verification-error',code:String(error.code||'internal')}));
   if(error.retryAfter)res.setHeader('Retry-After',String(error.retryAfter));req.resume();
   respond({error:error instanceof HttpError?error.message:'Verification is temporarily unavailable',...(error.retryAfter?{retryAfter:error.retryAfter}:{})},error instanceof HttpError?error.status:503);
  }
 });
 server.headersTimeout=10000;server.requestTimeout=30000;server.keepAliveTimeout=5000;
 server.drain=()=>{for(const controller of active)controller.abort();return new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});};
 return server;
}
