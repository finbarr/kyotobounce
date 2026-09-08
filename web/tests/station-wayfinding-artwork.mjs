import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.local/station-detail/artwork';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:750}});
 await page.route('**/wayfinding-fixture',route=>route.fulfill({contentType:'text/html',body:`<style>body{background:#d7d3c9;margin:20px}canvas{display:block;margin:15px 0;max-width:1160px}</style><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script><script type="module">
 import * as THREE from 'three';import {addStationDetails,wayfindingRegistrations,paintWayfinding,wayfindingFont} from '/station-details.js';
 try {
 const meta=await fetch('/assets/atrium-detail.json').then(r=>r.json());
 const scene=new THREE.Scene(),first=addStationDetails(scene,meta);
 const historical=addStationDetails(new THREE.Scene(),{...meta,sourceLayoutSha256:'historical'});
 const duplicate=addStationDetails(new THREE.Scene(),{...meta,signs:[...meta.signs,...meta.signs]});
 await document.fonts.ready;
 for(const mesh of first.group.children.filter(o=>o.userData.wayfinding)){const original=mesh.material.map.image;const canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;canvas.style.width='1160px';canvas.getContext('2d').drawImage(original,0,0);document.body.append(canvas);}
 window.result={faces:first.stats.signFaces,historical:historical.group.children.length,duplicate:duplicate.stats.signFaces,noto:document.fonts.check('16px "Noto Sans CJK JP"'),font:wayfindingFont,planes:first.group.children.filter(o=>o.userData.wayfinding).map(o=>({id:o.userData.wayfinding.id,position:o.position.toArray(),rotation:o.rotation.y}))};
 }catch(e){window.result={error:String(e)}}
 </script>`}));
 await page.goto('http://127.0.0.1:4286/wayfinding-fixture');await page.waitForFunction(()=>window.result);
 const result=await page.evaluate(()=>window.result);assert.equal(result.error,undefined);assert.equal(result.faces,5);assert.equal(result.duplicate,5);assert.equal(result.historical,0);assert.ok(result.noto);
 await page.screenshot({path:`${out}/labels.png`});await writeFile(`${out}/checks.json`,JSON.stringify(result,null,2));console.log('PASS exact face counts, archived early-out, duplicate IDs, Noto and original artwork');
}finally{await browser.close();}
