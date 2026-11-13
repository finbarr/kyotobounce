import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';

// Runs the actual deployable JS, static assets and packaged migrations. This is
// an isolated local D1 database; no hosted score or player record is touched.
export async function sitesHarness(){
 const receipt=JSON.parse(await readFile('dist/.openai/kyoto-build.json','utf8'));assert(receipt.complete);
 const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8')),source=await readFile('dist/server/index.js','utf8');
 const directory=await mkdtemp(join(tmpdir(),'kyoto-site-'));let mf,db;
 async function start(){
  mf=new Miniflare({telemetry:{enabled:false},resourcePersistencePath:directory,workers:[{config:{name:'kyoto-site-test',compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:source}}},env:{DB:{type:'d1',id:'kyoto-site-test'},ASSETS:{type:'assets'}},assets:{directory:resolve('dist/server',config.assets.directory),hasUserWorker:true,htmlHandling:config.assets.html_handling,notFoundHandling:config.assets.not_found_handling,runWorkerFirst:config.assets.run_worker_first}}}]});
  db=await mf.getD1Database('DB');
 }
 try{
  await start();const journal=JSON.parse(await readFile('dist/.openai/drizzle/meta/_journal.json','utf8'));
  for(const entry of journal.entries)for(const sql of (await readFile('dist/.openai/drizzle/'+entry.tag+'.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(sql).run();
 }catch(error){await mf?.dispose();await rm(directory,{recursive:true,force:true});throw error;}
 return {get db(){return db;},url:async()=>(await mf.ready).origin,fetch:(path,options)=>mf.dispatchFetch('https://site.example'+path,options),restart:async()=>{await mf.dispose();await start();},close:async()=>{try{await mf.dispose();}finally{await rm(directory,{recursive:true,force:true});}}};
}
