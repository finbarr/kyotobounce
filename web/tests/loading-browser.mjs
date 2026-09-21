// Exercise the actual game loader through a slow compressed HTTP response with
// no Content-Length, as served by a streaming reverse proxy in production.
import {createServer,request} from 'node:http';
import {connect} from 'node:net';
import {gzipSync} from 'node:zlib';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const backend=new URL(process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4186');assert.ok(['localhost','127.0.0.1'].includes(backend.hostname));
const body=gzipSync(await readFile('web/public/assets/runtime/atrium.glb')),sockets=new Set();let finished=false;
const proxy=createServer(async(req,res)=>{
 if(req.url==='/assets/runtime/atrium.glb'){
  res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Encoding':'gzip'});
  for(let offset=0;offset<body.length&&!res.destroyed;offset+=32768){res.write(body.subarray(offset,offset+32768));await delay(35);}
  if(!res.destroyed){finished=true;res.end();}return;
 }
 const upstream=request(new URL(req.url,backend),{headers:{...req.headers,host:backend.host}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});upstream.on('error',()=>res.destroy());req.pipe(upstream);
});
proxy.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
proxy.on('upgrade',(req,socket,head)=>{
 const upstream=connect(Number(backend.port),backend.hostname,()=>{const headers={...req.headers,host:backend.host,origin:backend.origin};upstream.write(`GET ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());
});
await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${proxy.address().port}`);
 await page.locator('#loading-name input').waitFor({state:'visible',timeout:120000});await page.locator('#loading-name input').fill('Still typing');
 const samples=[];
 for(let i=0;i<12&&!finished;i++){samples.push(await page.evaluate(()=>({value:Number(document.querySelector('#loading-meter').getAttribute('aria-valuenow')),message:document.querySelector('#loading-message').textContent,name:document.querySelector('#loading-name input').value})));await delay(450);}
 assert.ok(!finished,'Observed progress while the large model is still downloading');assert.ok(samples.at(-1).value>samples[0].value,'Progress increases before the response finishes');assert.ok(samples.every(s=>s.value>0&&s.value<76&&s.name==='Still typing'));
 await mkdir('.local/loading-browser',{recursive:true});await page.screenshot({path:'.local/loading-browser/progress.png'});await writeFile('.local/loading-browser/receipt.json',JSON.stringify({samples,encodedBytes:body.length,finished,errors},null,2));
 await page.waitForFunction(()=>document.querySelector('#loading-message').textContent.includes('Station ready'),null,{timeout:180000});assert.equal(await page.locator('#loading-name input').inputValue(),'Still typing');assert.ok(await page.locator('#loading').isVisible(),'Finishing the download does not dismiss name entry');
 assert.deepEqual(errors,[]);console.log('PASS real compressed/chunked download advances before EOF and preserves name entry',samples.map(s=>s.value));
}finally{await browser.close();for(const s of sockets)s.destroy();await new Promise(r=>proxy.close(r));}
