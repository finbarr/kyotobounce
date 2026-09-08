// Small GPU contract test; full-game acceptance is station-pbr-browser.mjs.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:320}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/k026-shader-test',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script>'}));
try{
 await page.goto('http://127.0.0.1:4282/k026-shader-test');
 const evidence=await page.evaluate(async()=>{
  const THREE=await import('three'),M=await import('/station-materials.js'),L=await import('/station-lighting.js');
  const renderer=new THREE.WebGLRenderer();renderer.setSize(640,320);document.body.append(renderer.domElement);
  const scene=new THREE.Scene(),sun=new THREE.DirectionalLight(),group=new THREE.Group();scene.add(sun,new THREE.HemisphereLight(),group);L.configureStationDaylight(renderer,scene,sun);
  const tex=M.createStationTextures(renderer),refs=L.createStationReflections(renderer,scene,new Set([group]));
  const families=['floor','wall','stone','paving','stair','stainless','paint','guard','facade'];
  families.forEach((family,i)=>{const mat=new THREE.MeshStandardMaterial();M.applyStationMaterial(mat,family,tex,refs);const mesh=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),mat);mesh.position.x=i-4;group.add(mesh);});
  refs.capture();refs.capture();const camera=new THREE.PerspectiveCamera(50,2,.1,100);camera.position.set(0,2,9);camera.lookAt(0,0,0);await renderer.compileAsync(scene,camera);
  renderer.render(scene,camera);const initial={...renderer.info.memory};for(let i=0;i<20;i++){camera.position.x=i*.01;renderer.render(scene,camera);}
  const final={...renderer.info.memory},pixels=new Uint8Array(4);renderer.getContext().readPixels(320,160,1,1,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);
  const result={initial,final,programs:renderer.info.programs.length,probes:refs.stats,pixel:[...pixels]};tex.dispose();refs.dispose();renderer.dispose();return result;
 });
 assert.deepEqual(errors,[]);assert.deepEqual(evidence.initial,evidence.final);assert.equal(evidence.probes.captures,3);assert(evidence.programs>=9);
 await writeFile('artifacts/station-detail/photorealism/shaders.json',JSON.stringify({status:'pass',errors,...evidence},null,2));console.log('PASS nine material families compile/render, three idempotent PMREM captures and stable resources');
}finally{await browser.close();}
