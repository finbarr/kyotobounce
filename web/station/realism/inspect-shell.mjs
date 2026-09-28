// Inspect the retained municipal station shell separately from playable geometry.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='.local/station-realism/station-shell';await mkdir(out,{recursive:true});
const source=await readFile('web/benchmarks/render.js','utf8'),bytes=await readFile(out+'/municipal-station.glb');
const views=[{id:'north',position:[-40,24,-280],target:[-45,25,0],fov:75},{id:'west-facade',position:[-190,8,-100],target:[-205,24,-12],fov:65},{id:'east-facade',position:[115,6,-100],target:[145,24,-10],fov:65},{id:'south',position:[-30,32,170],target:[-40,24,0],fov:90},{id:'west-roof',position:[-205,85,45],target:[-180,35,-15],fov:65}];
const report={sourceSha256:createHash('sha256').update(bytes).digest('hex'),views,errors:[]};let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:false,args:['--enable-webgl',...(process.platform==='darwin'?['--use-angle=metal']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'])]});
 const p=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});p.on('pageerror',e=>report.errors.push(String(e)));
 await p.route('**/evidence/municipal-station.glb',r=>r.fulfill({body:bytes,contentType:'model/gltf-binary'}));
 await p.route('**/bench/render.js',r=>r.fulfill({contentType:'text/javascript',body:source+`\nconst shell=await loader.loadAsync('/evidence/municipal-station.glb');\nfor(const o of scene.children)if(!o.isLight)o.visible=false;\nscene.add(shell.scene);shell.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});\nrenderer.shadowMap.needsUpdate=true;\nwindow.__shell={setView(value){view=value;render();},stats(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}}};\n`}));
 await p.goto('http://127.0.0.1:4394/?variant=optimized&inspect');await p.waitForFunction(()=>window.__shell,null,{timeout:180000});
 for(const v of views){await p.evaluate(v=>__shell.setView(v),v);await p.waitForTimeout(800);await p.locator('#game').screenshot({path:out+'/'+v.id+'.png'});console.log(v.id,JSON.stringify(await p.evaluate(()=>__shell.stats())));}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2)+'\n');
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{await browser?.close();}
