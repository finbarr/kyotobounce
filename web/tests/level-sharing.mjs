import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Store} from '../store.ts';
import {serveLevel} from '../level-http.ts';
import {levelIdFromPath,levelURL} from '../public/level-links.js';
const shell=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const store=new Store(':memory:');
const server=createServer((req,res)=>{if(!serveLevel(req,res,new URL(req.url,'http://localhost').pathname,store,shell)){res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
try{
 const guest=store.guest(),disk={center:{x:0,y:0,z:0},radius:1,surface:'floor'};
 const c={id:'shared-level',revision:1,name:'A <script>alert("x")</script> & B',creator:guest.id,layout:'layout',physics:'physics',start:disk,goal:disk};store.saveChallenge(c);
 assert.equal(levelIdFromPath('/level/shared-level/'),c.id);assert.equal(levelIdFromPath('/level/a/b'),null);assert.equal(levelIdFromPath('/level/%2e%2e'),null);assert.equal(levelURL(c.id,origin),`${origin}/level/shared-level`);
 let response=await fetch(levelURL(c.id,origin));assert.equal(response.status,200);let html=await response.text();assert.ok(html.includes('A &lt;script&gt;'));assert.ok(!html.includes('<script>alert'));assert.ok(html.includes('property="og:title"'));assert.ok(html.includes('src="/game.js"'));
 const snapshot=store.db.prepare('SELECT count(*) n FROM guests').get().n;
 const api=await(await fetch(`${origin}/api/level/${c.id}`)).json();assert.equal(api.challenge.name,c.name);assert.deepEqual(api.entries,[]);assert.equal(JSON.stringify(api).includes(guest.token),false);
 store.saveChallenge({...c,revision:2,name:'Revised line'});response=await fetch(levelURL(c.id,origin));assert.match(await response.text(),/Revised line — Kyoto Bounce/);
 response=await fetch(levelURL(c.id,origin),{method:'HEAD'});assert.equal(response.status,200);assert.equal(await response.text(),'');
 for(const path of ['/api/level/missing','/level/missing']){response=await fetch(origin+path);assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');}
 assert.equal(store.db.prepare('SELECT count(*) n FROM guests').get().n,snapshot);assert.equal(store.db.prepare('SELECT count(*) n FROM attempts').get().n,0,'Public reads do not create guest or score records');
 console.log('PASS public level URLs, latest revision, escaped social metadata, missing levels, HEAD and read-only access');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();}
