import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'notes/b1-corridors');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    let path=resolve(root,'.'+decodeURIComponent(url.pathname));
    assert(path.startsWith(root+'/'));
    if((await stat(path)).isDirectory())path+='/index.html';
    const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:true});
  const checks=[];
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1}),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('requestfailed',r=>failed.push(r.url()));
    page.on('response',r=>{if(r.status()>=400)failed.push(r.url()+': '+r.status());});
    await page.goto(`http://127.0.0.1:${server.address().port}/notes/b1-corridors/index.html`,{waitUntil:'networkidle'});
    const result=await page.evaluate(()=>({images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),overflow:document.documentElement.scrollWidth>innerWidth,localLinks:[...document.querySelectorAll('a[href]')].filter(a=>a.origin===location.origin).map(a=>a.href)}));
    assert.equal(result.images.length,3);assert(result.images.every(i=>i.loaded));assert.equal(result.overflow,false);
    for(const url of new Set(result.localLinks)){const r=await page.request.get(url);assert.equal(r.status(),200,url);}
    await page.screenshot({path:`${out}/qa-${width}.png`});
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    checks.push({width,...result,errors,failed});await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('article').count(),249);
  await page.locator('#category').selectOption('videos');assert.equal(await page.locator('article:not([hidden])').count(),8);
  await page.locator('#category').selectOption('panoramas');assert.equal(await page.locator('article:not([hidden])').count(),6);
  await page.locator('#category').selectOption('all');await page.locator('#search').fill('official-basement');
  assert.equal(await page.locator('article:not([hidden])').count(),4);
  await page.close();
  await writeFile(`${out}/browser-qa.json`,JSON.stringify({browser:await browser.version(),checks,library:{cards:249,videoFilter:8,panoramaFilter:6,basementSearch:4},pass:true},null,2)+'\n');
  console.log(JSON.stringify({pass:true,viewports:checks.map(c=>c.width),images:3,libraryCards:249}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
