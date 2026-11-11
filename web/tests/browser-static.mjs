import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {staticPreview} from '../static-preview.mjs';
import {inventory,STATIC_FILE_LIMIT} from '../../deploy/browser-package.mjs';
import {browserEngines,testBrowserName} from './browser-engine.mjs';
const matrix=process.argv.includes('--engines'),out='.local/browser-release-test',results=[];
await mkdir(out,{recursive:true});if(matrix)await rm(out+'/browser-matrix.json',{force:true});
const directory='.local/browser-release',files=await inventory(directory);
assert(Object.keys(files).length<20000);assert(Object.values(files).every(f=>f.bytes<=STATIC_FILE_LIMIT));
assert(!Object.keys(files).some(f=>/\.(sqlite|cs|ts|env|pem|key)$/.test(f)||/^(node_modules|research|Builds|runtime)\//.test(f)));
const manifest=JSON.parse(await readFile(directory+'/browser-build.json','utf8'));
for(const [name,entry]of Object.entries(manifest.files)){
 if(entry.parts){assert(!files[name.replace('web/public/','')]);for(const part of entry.parts)assert.deepEqual(files[part.url.slice(1)],{bytes:part.bytes,sha256:part.sha256});}
 else assert.deepEqual(files[name.replace('web/public/','')],entry);
}
assert(manifest.files['web/public/assets/runtime/atrium.glb'].parts.length>1);assert(manifest.files['web/public/station.collision.bin'].parts.length>1);
const server=await staticPreview(directory);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
try{
 for(const path of ['/','/level/atrium-welcome','/replay/12345678-1234-4234-8234-123456789012']){
  const response=await fetch(origin+path);assert.equal(response.status,200);const html=await response.text();assert(html.includes('name="kyoto-runtime" content="browser"'));assert(html.includes('name="kyoto-assets"'));assert(!html.includes('name="kyoto-verifier"'),'Offline-only acceptance bundle');
 }
 for(const path of ['/api/health','/unknown','/station.collision.bin','/assets/runtime/atrium.glb','/_headers','/_redirects','/web/server.ts'])assert.equal((await fetch(origin+path)).status,404,path);
 const html=await readFile(directory+'/index.html','utf8'),imports=JSON.parse(/<script type="importmap">(.*?)<\/script>/.exec(html)[1]).imports;
 for(const path of Object.values(imports).filter(p=>!p.endsWith('/'))){const response=await fetch(origin+path,{method:'HEAD'});assert.equal(response.status,200,'Import-map entry must be packaged: '+path);assert.equal(response.headers.get('content-type'),'text/javascript');}
 assert.equal((await fetch(origin+'/credits.html')).status,200);
 const part=manifest.files['web/public/station.collision.bin'].parts[0],response=await fetch(origin+part.url,{method:'HEAD'});assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),String(part.bytes));assert.match(response.headers.get('cache-control'),/immutable/);
 console.log('PASS static-only release inventory, checksums, size limits, deep links, missing routes and attribution');
 for(const engine of matrix&&!process.env.KYOTO_TEST_BROWSER?browserEngines:[testBrowserName]){
  const receipts={engine};
  for(const [name,script]of [['game','browser-local-game'],...(matrix?[['designer','browser-designer-ui']]:[])]){
   const output=`${out}/${engine}/${name}`;
   await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[`web/tests/${script}.mjs`],{stdio:'inherit',env:{...process.env,KYOTO_TEST_BROWSER:engine,KYOTO_TEST_ORIGIN:origin,KYOTO_TEST_STATIC:'1',KYOTO_TEST_OUTPUT:output}});
    child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error(`Packaged ${engine} ${name} acceptance failed: ${code??signal}`)));
   });
   const receipt=JSON.parse(await readFile(output+'/receipt.json'));assert.equal(receipt.passed,true);assert.equal(receipt.engine,engine);assert.deepEqual(receipt.errors,[]);
   receipts[name]=name==='game'?{browser:receipt.browser,shots:receipt.results.length,mobileInputKind:receipt.mobileInputKind,frameClock:receipt.frameClock,benchmark:receipt.benchmark}:{revisions:receipt.revision,mobileInputKind:receipt.mobileInputKind};
  }
  results.push(receipts);
 }
 if(matrix){await writeFile(out+'/browser-matrix.json',JSON.stringify({layout:manifest.layoutSha256,physics:manifest.physics,results},null,2)+'\n');console.log('PASS packaged rendered game and creator: '+results.map(r=>r.engine).join(', '));}
}finally{await new Promise(resolve=>server.close(resolve));}
