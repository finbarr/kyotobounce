import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {Store} from '../store.ts';
import {serveLevel} from '../level-http.ts';
import {serveReplay} from '../replay-http.ts';
import {socialPage,SOCIAL_ORIGIN} from '../social-metadata.ts';
const shell=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const tags=html=>{const pairs=[...html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)">/g)].map(m=>[m[1],m[2]]);assert.equal(new Set(pairs.map(p=>p[0])).size,pairs.length,'No duplicate metadata');return Object.fromEntries(pairs);};
function inspect(html,path,title){const meta=tags(html);assert.equal((html.match(/<title>/g)||[]).length,1);assert.equal(meta['og:title'],title);assert.equal(meta['twitter:title'],title);assert.equal(meta['og:description'],meta['twitter:description']);assert.equal(meta.description,meta['og:description']);assert.equal(meta['twitter:card'],'summary_large_image');assert.equal(meta['og:url'],SOCIAL_ORIGIN+path);assert.ok(html.includes(`<link rel="canonical" href="${SOCIAL_ORIGIN+path}">`));assert.equal(meta['og:image'],`${SOCIAL_ORIGIN}/brand/kyoto-bounce-social.jpg`);assert.equal(meta['twitter:image'],meta['og:image']);assert.equal(meta['og:image:width'],'1200');assert.equal(meta['og:image:height'],'600');assert.ok(meta['twitter:image:alt'].length>20);return meta;}
inspect(shell,'/','Kyoto Bounce — Station Arcade');
const raw='A "<script>alert(1)</script>" & $&';const escaped='A &quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot; &amp; $&amp;';
const custom=socialPage(shell,{title:raw,description:raw,path:'/level/custom'});inspect(custom,'/level/custom',escaped);assert.ok(!custom.includes('<script>alert'));
assert.throws(()=>socialPage('<title>Missing block</title>',{}),/Missing social metadata/);
const store=new Store(':memory:'),disk={center:{x:0,y:0,z:0},radius:1,surface:'floor'},guest=store.guest();
const challenge={id:'social-level',revision:1,creator:guest.id,name:raw,layout:'layout',physics:'physics',start:disk,goal:disk};store.saveChallenge(challenge);
store.saveResult({type:'result',attempt:'social-shot',id:guest.id,challenge,score:123456,success:true,surfaces:1,duration:10,poses:[],playerName:'Arcade <Ace>'},'animation');
const counts=()=>['guests','attempts'].map(t=>store.db.prepare(`SELECT count(*) n FROM ${t}`).get().n),before=counts();
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(await serveReplay(req,res,path,store,shell)||serveLevel(req,res,path,store,shell))return;res.writeHead(404);res.end();});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
try{
 for(const [path,title]of [['/level/social-level',`${escaped} — Kyoto Bounce`],['/replay/social-shot','Arcade &lt;Ace&gt; · 123,456 PTS — Kyoto Bounce']]){const response=await fetch(origin+path,{headers:{'user-agent':'Twitterbot/1.0'}});assert.equal(response.status,200);inspect(await response.text(),path,title);const head=await fetch(origin+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');}
 for(const path of ['/level/missing','/replay/missing']){const response=await fetch(origin+path);assert.equal(response.status,404);assert.equal(tags(await response.text()).robots,'noindex');}
 assert.deepEqual(counts(),before,'Social crawls never create players or scores');
 const jpg=await readFile(new URL('../public/brand/kyoto-bounce-social.jpg',import.meta.url));assert.ok(jpg.length<5_000_000);assert.equal(jpg.readUInt16BE(0),0xffd8);let dimensions;
 for(let i=2;i<jpg.length;){if(jpg[i++]!==255)continue;let marker=jpg[i++];while(marker===255)marker=jpg[i++];if(marker===0xda||marker===0xd9)break;const length=jpg.readUInt16BE(i);if([0xc0,0xc1,0xc2].includes(marker)){dimensions=[jpg.readUInt16BE(i+5),jpg.readUInt16BE(i+3)];break;}i+=length;}
 assert.deepEqual(dimensions,[1200,600],'Metadata matches the shipped JPEG');
 const icon=await readFile(new URL('../public/favicon.ico',import.meta.url));assert.equal(icon.readUInt16LE(2),1);assert.equal(icon.readUInt16LE(4),3);assert.deepEqual([0,1,2].map(i=>icon[6+i*16]),[16,32,48]);
 const apple=await readFile(new URL('../public/apple-touch-icon.png',import.meta.url));assert.deepEqual([apple.readUInt32BE(16),apple.readUInt32BE(20)],[180,180]);assert.ok(shell.includes('href="/favicon.svg"'));assert.ok(shell.includes('href="/favicon.ico"'));assert.ok(shell.includes('href="/apple-touch-icon.png"'));
 console.log('PASS crawler-ready home, level and replay cards; unique escaped tags; canonical URLs; HEAD/404; JPEG dimensions; favicon formats; read-only crawls');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();}
