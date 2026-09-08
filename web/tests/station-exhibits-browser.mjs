import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const mode=process.argv[2]||'baseline',out=`.local/station-detail/${mode}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.route('**/game.js',async route=>{let s=await readFile(mode==='baseline'?'web/public/game.js':'.local/station-detail/app/web/public/game.js','utf8');s=s.replaceAll('renderer.render(scene,camera);','if(window.k029Draw){renderer.render(scene,camera);window.k029Draw=false;}');s=s.replace('requestAnimationFrame(animate);const rawDt','setTimeout(()=>requestAnimationFrame(animate),500);const rawDt');s=s.replace('  if(window.k029Draw){renderer.render(scene,camera);window.k029Draw=false;}','  if(!window.k029Sized){renderer.setPixelRatio(0.75);window.k029Sized=true;} if(window.k029View){camera.position.set(window.k029View.position[0],window.k029View.position[1],-window.k029View.position[2]);camera.lookAt(window.k029View.target[0],window.k029View.target[1],-window.k029View.target[2]);camera.updateMatrixWorld();} window.k029Scene=scene;\n  if(window.k029Draw){renderer.render(scene,camera);window.k029Draw=false;}');await route.fulfill({body:s,contentType:'text/javascript'});});
await page.goto('http://127.0.0.1:4285');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:120000});
console.log('ready'); await page.getByRole('button',{name:'Free exploration',exact:true}).click();
await page.locator('canvas').click({position:{x:480,y:300}});
const views=mode==='inspection'?[['grand-legs',[93.8,35.2,-13.9],[92.5,35,-15.8]],['upright-legs',[-46.1,7.9,-16.6],[-46.4,7.85,-18.7]]]:mode==='baseline'?[['east-wide',[100,36.27,-12],[101,35.3,-2]],['east-south',[99,36.27,-10],[100,35.4,-15]],['west',[-42,9,-10],[-45,8,-17]]]:[
 ['grand-wide',[95.5,36.27,-12.8],[92.5,35.2,-16]],['grand-close',[93.8,35.85,-13.85],[92.5,35.4,-15.7]],
 ['upright-wide',[-46.2,9,-15.3],[-46.4,8.1,-19]],['upright-close',[-46.1,8.95,-16.4],[-46.4,8.2,-19]],
 ['miniature-wide',[102.3,36.27,-13.8],[99,35.5,-16.7]],['miniature-close',[100.1,36.20,-15],[99,35.75,-16.7]]
];
const evidence=[];if(mode==='inspection')await page.addStyleTag({content:'#throw-panel,#power-control,#competition,#shot-details,#notice {visibility:hidden !important}'});
for(const [name,position,target] of views){await page.evaluate(v=>{window.k029View=v;window.k029Draw=true;},{position,target});await page.waitForTimeout(1200);console.log(name);await page.screenshot({path:`${out}/${name}.png`,timeout:120000});evidence.push({name,state:await page.evaluate(()=>window.kyotoState)});}
if(mode!=='baseline'){const manifest=JSON.parse(await readFile('.local/station-detail/candidate/manifest.json'));assert.equal(await page.evaluate(()=>window.k029Layout),manifest.layoutSha256);assert.equal(await page.evaluate(()=>window.kyotoArt.sourceLayout),manifest.layoutSha256);}
if(mode==='inspection'){
 await mkdir(`${out}/frames`,{recursive:true});let frame=0;const motion=[];
 for(const [id,target,from,to] of [
 ['grand',[92.5,35.3,-16],[94.6,36.27,-13.5],[90.6,36.27,-13.5]],
 ['upright',[-46.4,8.15,-19],[-46.1,9,-15.8],[-47.3,9,-16.1]],
 ['miniature',[99,35.65,-16.7],[101.6,36.27,-14.5],[97,36.27,-14.5]]
 ])for(let i=0;i<8;i++){
  const position=from.map((v,k)=>v+(to[k]-v)*i/7);await page.evaluate(v=>{window.k029View=v;window.k029Draw=true;},{position,target});await page.waitForTimeout(650);await page.screenshot({path:`${out}/frames/${String(frame++).padStart(3,'0')}.png`,timeout:120000});motion.push({id,position,target,state:await page.evaluate(()=>window.kyotoState)});
 }
 await writeFile(`${out}/motion.json`,JSON.stringify({note:'Pose-stepped real full-game camera inspection, Linux software GPU; output cadence is not runtime performance.',motion},null,2));
 // Matched render-only cost comparison: same candidate camera, props hidden/visible.
 const costs=[];for(const [name,position,target] of [
 ['east',[96,36.27,-12.5],[96,35.4,-16]],['west',[-46.2,9,-15.3],[-46.4,8.1,-19]]
 ]){const samples=[];for(const visible of [false,true]){await page.evaluate(({visible,position,target})=>{window.k029Scene.traverse(o=>{if(o.isMesh&&o.name.startsWith('k029-'))o.visible=visible;});window.k029View={position,target};window.k029Draw=true;},{visible,position,target});await page.waitForTimeout(900);samples.push(await page.evaluate(()=>window.kyotoState.render));}costs.push({name,withoutExhibits:samples[0],withExhibits:samples[1],callsAdded:samples[1].calls-samples[0].calls,trianglesAdded:samples[1].triangles-samples[0].triangles});}
 await writeFile(`${out}/costs.json`,JSON.stringify({note:'Render-only visibility A/B on one candidate. Cadence throttled; no hardware frame-time claim.',costs},null,2));
}
assert.deepEqual(errors,[]);
await writeFile(`${out}/browser.json`,JSON.stringify({errors,evidence},null,2));}finally{await browser.close();}
