import {HttpError,insist,uuid,fields,playerName,credential} from './protocol.mjs';
import {requestGate} from './resource-policy.mjs';

async function body(request){
 insist((request.headers.get('content-type')||'').split(';')[0]==='application/json',415,'Send JSON');
 const reader=request.body?.getReader(),chunks=[];let length=0;
 try{
  if(reader)for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;insist(length<=65536,413,'Request body is too large');chunks.push(value);}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  try{return length?JSON.parse(new TextDecoder().decode(bytes)):{};}catch{throw new HttpError(400,'Invalid JSON');}
 }finally{await reader?.cancel().catch(()=>{});}
}
// Fetch-native routing keeps the existing browser protocol and never accepts a
// score, trajectory or server checkpoint from an HTTP client.
export function verificationFetch(service,{origins=[],gate=requestGate({concurrency:4})}={}){
 const allowed=new Set(origins);
 return async request=>{
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});let release;
  const respond=(value,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers});
  try{
   release=gate();const url=new URL(request.url),{pathname,searchParams}=url,method=request.method,authorization=request.headers.get('authorization'),origin=request.headers.get('origin');
   if(origin){insist(origin===url.origin||allowed.has(origin),403,'Origin is not allowed');headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');}
   if(method==='OPTIONS'){headers.set('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Max-Age','600');return respond(null,204);}
   insist(!searchParams.size||method==='GET'&&['/v1/courses','/v1/progress'].includes(pathname)&&searchParams.size===1&&searchParams.has('after'),400,'Unsupported query parameters');
   if(method==='GET'&&pathname==='/health')return respond({status:'ready',layout:service.layout,physics:[...service.catalog.values()][0].physics});
   if(method==='GET'&&pathname==='/v1/courses')return respond(await service.listCourses(searchParams.get('after')??undefined));
   if(method==='POST'&&pathname==='/v1/identity'){const c=credential(authorization),m=fields(await body(request),['name']);return respond(await service.identity(c,playerName(m.name)));}
   const replay=/^\/v1\/replays\/([^/]+)(?:\/inputs\/(\d+))?$/.exec(pathname);
   if(method==='GET'&&replay){insist(uuid(replay[1]),404,'Replay not found');const sequence=Number(replay[2]);insist(replay[2]===undefined||Number.isSafeInteger(sequence),400,'Invalid input sequence');return respond(replay[2]===undefined?await service.replay(replay[1]):await service.replayInputs(replay[1],sequence));}
   const board=/^\/v1\/courses\/([\w-]+)\/leaderboard$/.exec(pathname);
   if(method==='GET'&&board){const player=authorization?await service.authenticate(credential(authorization)):null;return respond(await service.board(board[1],player?.id));}
   const player=await service.authenticate(credential(authorization)),publication=/^\/v1\/publications\/([^/]+)$/.exec(pathname);
   if(method==='POST'&&publication){const m=fields(await body(request),['course','baseRevision','header']);return respond(await service.publish(player,publication[1],m.course,m.baseRevision,m.header),201);}
   if(method==='GET'&&pathname==='/v1/progress')return respond(await service.progress(player.id,searchParams.get('after')??undefined));
   const match=/^\/v1\/attempts\/([^/]+)(?:\/(seal|advance|cancel|inputs)(?:\/(\d+))?)?$/.exec(pathname);
   insist(match&&uuid(match[1]),404,'Route not found');const [,id,action,rawSequence]=match;
   if(method==='GET'&&!action)return respond(await service.status(player.id,id));
   if(method==='POST'&&!action){const m=fields(await body(request),['header']);return respond(await service.create(player,id,m.header),201);}
   if(method==='PUT'&&action==='inputs'&&rawSequence!==undefined){const m=fields(await body(request),['runs']);return respond(await service.upload(player.id,id,Number(rawSequence),m.runs));}
   insist(method==='POST'&&['seal','advance','cancel'].includes(action)&&rawSequence===undefined,404,'Route not found');fields(await body(request),[]);
   const reply=action==='advance'?await service.advance(player.id,id,request.signal):await service[action](player.id,id);
   return respond(reply,action==='advance'&&['pending','verifying'].includes(reply.state)?202:200);
  }catch(error){
   if(!(error instanceof HttpError))console.error(JSON.stringify({event:'verification-error',code:String(error.code||'internal')}));
   if(error.retryAfter)headers.set('Retry-After',String(error.retryAfter));
   return respond({error:error instanceof HttpError?error.message:'Verification is temporarily unavailable',...(error.retryAfter?{retryAfter:error.retryAfter}:{})},error instanceof HttpError?error.status:503);
  }finally{release?.();}
 };
}
