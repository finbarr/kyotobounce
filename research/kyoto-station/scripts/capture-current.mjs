import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
const out='research/kyoto-station/current-model';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),headless:false,args:['--enable-webgl',...(process.platform==='darwin'?['--use-angle=metal']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'])]});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:4352/?variant=optimized&inspect',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Ready'),{timeout:180000});
 const options=await page.locator('#station-view option').evaluateAll(os=>os.map(o=>({label:o.textContent,value:o.value})));
 await writeFile(out+'/available-views.json',JSON.stringify(options,null,2));
 const terms=['add-heart1f-hall','add-central-gate-arrival','add-hall-soffit-approach','add-passage2f-north-arrival','add-westsquare-approach','add-promenade3f-west','add-wood4f-turf','add-garden-arrival','add-garden-edge','add-eastsquare-reverse','add-facade-long-west','add-skyway-outward','add-stonemuseum-outside','installation-grand-stair'];
 const selected=[];
 for(const term of terms){const o=options.find(o=>o.label.toLowerCase().includes(term));if(o&&!selected.includes(o))selected.push(o);}
 const results=[];
 for(const o of selected){await page.selectOption('#station-view',o.value);await page.waitForTimeout(500);await page.locator('canvas').first().screenshot({path:out+'/'+o.label+'.png'});results.push({name:o.label,evidence:await page.locator('#view-evidence').textContent()});}
 for(const v of [{name:'north-exterior',p:'0, 9, -110',t:'0, 28, 0'},{name:'south-exterior',p:'0, 14, 145',t:'0, 22, 20'},{name:'north-city-from-station',p:'0, 30, -5',t:'0, 14, -160'}]){await page.fill('#view-position',v.p);await page.fill('#view-target',v.t);await page.click('#apply-view');await page.waitForTimeout(500);await page.locator('canvas').first().screenshot({path:out+'/'+v.name+'.png'});results.push({name:v.name,position:v.p,target:v.t});}
 await writeFile(out+'/capture.json',JSON.stringify({capturedAt:new Date().toISOString(),commit:'47f98c63b83006bc718f20e8eb1c8927a72e92fd',viewer:'Static benchmark viewer, optimized scene; no physics service',errors,views:results},null,2));
 console.log(JSON.stringify({views:results.length,errors}));
}finally{await browser.close();}
