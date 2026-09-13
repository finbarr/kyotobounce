import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Store} from './store.ts';

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Public links resolve the current stored level, including its current board.
// Reads neither allocate a physics session nor create a guest or score.
export function serveLevel(request:IncomingMessage,response:ServerResponse,path:string,store:Store,shell:string):boolean{
 const route=path.match(/^\/(api\/)?level\/([a-zA-Z0-9_-]{1,64})\/?$/);if(!route)return false;
 const challenge=store.challenge(route[2]!);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 let body:string;
 if(route[1])body=JSON.stringify(challenge?{challenge,entries:store.leaderboard(challenge)}:{error:'Level not found. It may have been removed.'});
 else{
  const title=challenge?`${challenge.name} — Kyoto Bounce`:'Level unavailable — Kyoto Bounce';
  const description=challenge?`Play ${challenge.name}. ${challenge.waypoints?.length||0} waypoints${challenge.goal?' and a destination bonus':''}. Find your line and compete on this level’s scoreboard.`:'This level could not be found.';
  body=shell.replace('<title>Kyoto Bounce — Station Arcade</title>',`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website">`);
 }
 response.writeHead(challenge?200:404,{...headers,'Content-Type':route[1]?'application/json':'text/html; charset=utf-8','Content-Length':String(Buffer.byteLength(body))});
 response.end(request.method==='HEAD'?undefined:body);return true;
}
