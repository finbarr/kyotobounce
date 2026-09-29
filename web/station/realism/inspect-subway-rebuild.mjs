// Inspect the isolated component in real Chrome; acceptance still needs the complete station.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const [origin,directory]=process.argv.slice(2);
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));assert(directory.startsWith('.local/'));
const raw=await readFile(directory+'/spec.json'),s=JSON.parse(raw),proof=JSON.parse(await readFile(directory+'/component-geometry-proof.json'));
const at=(f,w,t,y=s.floor+1.65)=>[f.center[0]+w*f.right[0]+t*f.downhill[0],y,f.center[1]+w*f.right[1]+t*f.downhill[1]],n=s.cores[0],c=s.cores[1],e=s.streetStairs[2];
const views=[
 {id:'north-west-gate',p:at(n,-11,-12.5),t:at(n,3,-12.5)},
 {id:'north-stairs',p:at(n,1,-8),t:at(n,1,6,s.lower+1.65)},
 {id:'north-escalator-exit',p:at(n,-2.15,-8.2),t:at(n,-2.15,-4.7,s.floor+.5)},
 {id:'central-east-gate',p:at(c,10,-12.5),t:at(c,-3,-14)},
 {id:'cross-plaza',p:at(n,0,39),t:at(c,0,-15)},
 {id:'exit-five-stairs',p:at(e,0,-1.2,e.upper+1.65),t:at(e,0,10,s.floor+2)},
 {id:'porta-east-aisle',p:[133,-4.55,107],t:[133,-4.55,77]},
 {id:'central-two-gate',p:at(s.cores[2],10,-12.5),t:at(s.cores[2],0,-12.5)},
 {id:'south-gate',p:at(s.cores[3],-10,-12.5),t:at(s.cores[3],0,-12.5)},
 {id:'south-platform',p:[104.5,s.lower+1.65,-86],t:[103,s.lower+1.65,-45]},
 {id:'north-platform',p:[79,s.lower+1.65,85],t:[96,s.lower+1.65,35]},
 {id:'porta-level-change',p:[58,s.floor+1.65,4.5],t:[51,s.portaStair.lower+1.65,4.5]},
 {id:'hachijo-passage',p:[112,s.floor+1.65,-181],t:[148,s.floor+1.65,-190.5]},
 {id:'overview',p:[167,90,147],t:[97,-3,60],cutaway:true}
];
const report={pass:false,specSha256:createHash('sha256').update(raw).digest('hex'),geometry:proof,views,errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
await mkdir(directory+'/chrome',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>window.__component&&__component.stats().triangles>1000);
 for(const v of views){
  await page.evaluate(v=>__component.setView(v),v);await page.waitForTimeout(200);
  v.stats=await page.evaluate(()=>__component.stats());assert(v.stats.triangles>1000,'Scene must actually render');
  await page.screenshot({path:directory+'/chrome/'+v.id+'.png'});
 }
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS',views.length,'Chrome views; visual inspection still required');
}catch(error){report.error=String(error);throw error;}finally{await browser.close();await writeFile(directory+'/chrome/views.json',JSON.stringify(report,null,2)+'\n');}
