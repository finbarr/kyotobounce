import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,cp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {packageBrowser,inventory,STATIC_FILE_LIMIT} from '../browser-package.mjs';
import {buildVerificationWorld} from '../../web/verification-world-build.mjs';

export async function buildSite(){
 const hosting=JSON.parse(await readFile('.openai/hosting.json','utf8'));
 assert(hosting.project_id&&hosting.d1==='DB'&&!hosting.r2&&!hosting.static,'Use the registered Worker Site and DB binding');
 // One disposable deployment output. Refuse to erase an unrelated directory.
 const entries=await readdir('dist').catch(error=>{if(error.code!=='ENOENT')throw error;return [];});
 if(entries.length){assert.equal(JSON.parse(await readFile('dist/.openai/kyoto-build.json','utf8')).kind,'kyoto-site-v1');await rm('dist',{recursive:true});}
 await mkdir('dist/.openai',{recursive:true});
 const receipt={kind:'kyoto-site-v1',complete:false};
 await writeFile('dist/.openai/kyoto-build.json',JSON.stringify(receipt)+'\n');
 const browser=await packageBrowser({output:resolve('dist/client'),verifier:'same-origin'});
 const world=await buildVerificationWorld();assert.equal(world.layoutSha256,browser.identity.layoutSha256);
 const assetPath='dist/client/verification-world/'+world.sourceSha256;await mkdir(assetPath,{recursive:true});
 const parts=[...world.metadata.parts,...Object.values(world.arrays).flatMap(a=>a.parts)];
 for(const part of parts)await cp('.local/verification/world/'+part.name,assetPath+'/'+part.name);
 // Framework-free Worker bundle; deployment data stays in static assets, never
 // embedded in JS or rebuilt during a score request.
 const bundled=await build({entryPoints:['deploy/sites/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'node',target:'es2022',external:['node:*'],minify:true,metafile:true});
 const modules=Object.keys(bundled.metafile.inputs);assert(!modules.some(m=>m.includes('@google-cloud')||m.includes('online/service.mjs')),'Do not ship the retired reference backend');
 const imports=Object.values(bundled.metafile.outputs).flatMap(o=>o.imports.map(i=>i.path));assert(imports.every(p=>['node:crypto','node:zlib'].includes(p)),'Unexpected server dependency');
 await writeFile('dist/server/wrangler.json',JSON.stringify({name:'kyoto-bounce',main:'index.js',compatibility_date:'2026-11-12',compatibility_flags:['nodejs_compat'],assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/v1','/v1/*','/health','/level/*','/replay/*'],html_handling:'auto-trailing-slash',not_found_handling:'404-page'},d1_databases:[{binding:'DB',database_name:'kyoto-scores',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'../.openai/drizzle'}]},null,2)+'\n');
 await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/.openai/drizzle',{recursive:true});
 const assets=await inventory('dist/client');for(const [name,file]of Object.entries(assets))assert(file.bytes<=STATIC_FILE_LIMIT,'Oversize static asset: '+name);
 Object.assign(receipt,{complete:true,layout:world.layoutSha256,physics:world.physics,collision:world.sourceSha256,assets:Object.keys(assets).length,bytes:Object.values(assets).reduce((n,f)=>n+f.bytes,0),workerBytes:Object.values(bundled.metafile.outputs).reduce((n,f)=>n+f.bytes,0)});
 await writeFile('dist/.openai/kyoto-build.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));return receipt;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildSite();
