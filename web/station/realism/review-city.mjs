import { chromeGraphicsArgs } from '../../../tools/remote/chrome-graphics.mjs';
// Static visual review. Timing here is diagnostic, not full-game acceptance.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin=process.env.KYOTO_CITY_PREVIEW||'http://127.0.0.1:4394';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Local inspection only');
const output=process.argv[2]||'.local/station-realism/city-review-03';await mkdir(output,{recursive:true});
const views=process.env.KYOTO_CITY_VIEWS?JSON.parse(await readFile(process.env.KYOTO_CITY_VIEWS)):[
 {id:'hall-entrance',position:[0,1.7,-20],target:[0,8,-75],fov:65},
 {id:'tower-street',position:[0,1.7,-50],target:[-10,22,-180],fov:65},
 {id:'forecourt-west',position:[-90,1.7,-60],target:[20,4,-90],fov:65},
 {id:'north-facade',position:[10,22,-120],target:[-10,25,0],fov:57},
 {id:'garden-context',position:[-155,58,24],target:[-100,8,-160],fov:65},
];
const report={date:new Date().toISOString(),kind:'Static candidate inspection, not full-game benchmark',views:[],errors:[],warnings:[]};
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:false,args:['--enable-webgl',...chromeGraphicsArgs()]});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(['warning','error'].includes(m.type()))report.warnings.push(m.text());});
 await page.goto(origin+'/?variant=optimized&inspect',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__candidate,null,{timeout:240000});
 report.initial=await page.evaluate(()=>{const {renderer,data,station}=__candidate;let municipal=0;station.traverse(o=>{if(o.isMesh&&o.name.startsWith('Municipal'))municipal++;});return {layout:data.layoutSha256,buffer:[renderer.domElement.width,renderer.domElement.height],memory:renderer.info.memory,municipalMeshes:municipal,status:document.querySelector('#status').textContent};});
 for(const v of views){
  await page.evaluate(v=>__candidate.setView(v),v);await page.waitForTimeout(2500);
  const data=await page.evaluate(async()=>{let last=null,samples=[];await new Promise(resolve=>{const end=performance.now()+4000;function frame(t){if(last!==null)samples.push(t-last);last=t;if(t>=end)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});samples.sort((a,b)=>a-b);const r=__candidate.renderer;return {calls:r.info.render.calls,triangles:r.info.render.triangles,frameP95:samples[Math.floor(samples.length*.95)],samples:samples.length,memory:{...r.info.memory}};});
  const image=await page.locator('#game').screenshot();await writeFile(output+'/'+v.id+'.png',image);
  report.views.push({...v,...data,imageSha256:createHash('sha256').update(image).digest('hex')});console.log(v.id,JSON.stringify(data));
 }
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
 if(report.errors.length)throw Error('Browser errors: '+report.errors.join('\n'));
}finally{await browser?.close();}
