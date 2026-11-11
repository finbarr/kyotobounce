import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {staticPreview} from '../static-preview.mjs';
import {inventory,STATIC_FILE_LIMIT} from '../../deploy/browser-package.mjs';
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
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['web/tests/browser-local-game.mjs'],{stdio:'inherit',env:{...process.env,KYOTO_TEST_ORIGIN:origin,KYOTO_TEST_STATIC:'1',KYOTO_TEST_OUTPUT:'.local/browser-release-test'}});
  child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error(`Packaged browser acceptance failed: ${code??signal}`)));
 });
}finally{await new Promise(resolve=>server.close(resolve));}
