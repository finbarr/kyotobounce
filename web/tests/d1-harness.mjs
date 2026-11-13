import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export async function d1Harness(options={}){
 const directory=await mkdtemp(join(tmpdir(),'kyoto-d1-'));
 const source=await build({entryPoints:['web/tests/d1-worker.mjs'],bundle:true,write:false,platform:'node',format:'esm',target:'es2022',external:['node:*']});
 let mf,db;const config={now:1800000000000,...options},assets={};
 if(config.station){
  const directory='.local/verification/world',manifest=JSON.parse(await readFile(directory+'/manifest.json'));
  const allowed=new Set(['manifest.json',...manifest.metadata.parts.map(p=>p.name),...Object.values(manifest.arrays).flatMap(a=>a.parts.map(p=>p.name))]);
  assets.ASSETS={type:'fetcher',handler:async request=>{const name=new URL(request.url).pathname.slice(1);return allowed.has(name)?new Response(await readFile(directory+'/'+name)):new Response('Not found',{status:404});}};
 }
 async function start(){
  mf=new Miniflare({telemetry:{enabled:false},resourcePersistencePath:directory,workers:[{config:{name:'kyoto-d1-test',compatibilityDate:'2026-11-12',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:source.outputFiles[0].text}}},env:{...assets,DB:{type:'d1',id:'kyoto-test'},CONFIG:{type:'json',value:config}}}}]});
  db=await mf.getD1Database('DB');
 }
 await start();
 for(const sql of (await readFile('web/online/d1-schema.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(sql).run();
 return {config,get db(){return db;},fetch:(path,options)=>mf.dispatchFetch('https://game.example'+path,options),restart:async patch=>{await mf.dispose();Object.assign(config,patch);await start();},close:async()=>{try{await mf.dispose();}finally{await rm(directory,{recursive:true,force:true});}}};
}
