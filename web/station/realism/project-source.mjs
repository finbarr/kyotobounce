// Exact-camera source geometry inspection for reference registration.
// This viewer does not move the requested camera to avoid obstacles.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const [assetArg,viewArg,outArg]=process.argv.slice(2);assert(assetArg&&viewArg&&outArg);
const asset=resolve(assetArg),out=resolve(outArg),viewBytes=await readFile(viewArg),view=JSON.parse(viewBytes);
assert(asset.startsWith(resolve('.local')+'/'));assert(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const replacement=view.replacement?.asset?resolve(view.replacement.asset):null;if(replacement)assert(replacement.startsWith(resolve('.local')+'/'));const replacementBytes=replacement?await readFile(replacement):null;
const motionFile=view.motion?.nativeFile?resolve(view.motion.nativeFile):null;if(motionFile)assert(motionFile.startsWith(resolve('.local')+'/'));const motionBytes=motionFile?await readFile(motionFile):null,motionData=motionBytes?JSON.parse(motionBytes):null;
const assetBytes=await readFile(asset),sha=b=>createHash('sha256').update(b).digest('hex');
const html=`<!doctype html><html><meta charset="utf-8"><style>body{margin:0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const config=await fetch('/view.json').then(r=>r.json());
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});document.body.appendChild(renderer.domElement);renderer.setPixelRatio(1);renderer.setSize(config.viewport?.width||1280,config.viewport?.height||720);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=config.exposure??1;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc8d8df);scene.add(new THREE.HemisphereLight(0xe4f0ff,0x727269,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(40,100,-70);scene.add(sun);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.02).texture;scene.environmentIntensity=.6;room.dispose();pmrem.dispose();
const root=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/source.glb')).scene;scene.add(root);
if(config.replacement){let matched=0;root.traverse(o=>{if(!o.isMesh||o.name!==config.replacement.object)return;const removed=new Set(config.replacement.faces),old=Array.from(o.geometry.index.array),kept=[];for(let i=0;i<old.length;i+=3)if(!removed.has(i/3))kept.push(...old.slice(i,i+3));if(old.length-kept.length!==removed.size*3)throw Error('Replacement face selection changed');o.geometry.setIndex(kept);matched++;});if(matched!==1)throw Error('Replacement object selection changed');const replacementRoot=(await new GLTFLoader().loadAsync('/replacement.glb')).scene;scene.add(replacementRoot);}
root.updateMatrixWorld(true);
const motion=config.motion?(await import('/escalators.js')).createEscalators(scene,...await fetch('/motion.json').then(r=>r.json()).then(d=>[d.escalators,d.combSupports||[]])):null;
const camera=new THREE.PerspectiveCamera(config.fov,renderer.domElement.width/renderer.domElement.height,.05,1800);camera.position.fromArray(config.position);camera.lookAt(new THREE.Vector3().fromArray(config.target));camera.rotateZ(THREE.MathUtils.degToRad(config.rollDegrees||0));camera.updateMatrixWorld(true);
if(motion)motion(config.motion.time||0,camera);
await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
const width=renderer.domElement.width,height=renderer.domElement.height,points=[],world=new THREE.Vector3();
root.traverse(o=>{if(!o.isMesh||config.pickObjects&&!config.pickObjects.includes(o.name))return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){world.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);const p=world.clone().project(camera);if(p.z<-1||p.z>1)continue;const pixel=[(p.x+1)*width/2,(1-p.y)*height/2];if(pixel[0]<-30||pixel[0]>width+30||pixel[1]<-30||pixel[1]>height+30)continue;points.push({object:o.name,index:i,point:world.toArray(),pixel,depth:world.distanceTo(camera.position)});}});
const ray=new THREE.Raycaster();
function nearest(pixel){
 const rows=points.map(p=>({...p,distancePixels:Math.hypot(p.pixel[0]-pixel[0],p.pixel[1]-pixel[1])})).filter(p=>p.distancePixels<25).sort((a,b)=>a.distancePixels-b.distancePixels),seen=new Set(),result=[];
 for(const r of rows){const key=r.point.map(x=>x.toFixed(3)).join(',');if(seen.has(key))continue;seen.add(key);ray.setFromCamera(new THREE.Vector2(r.pixel[0]/width*2-1,1-r.pixel[1]/height*2),camera);const hit=ray.intersectObject(root,true)[0];if(hit&&hit.distance<r.depth-.3)continue;result.push(r);if(result.length===6)break;}return result;
}
window.__registration={camera:{position:camera.position.toArray(),target:config.target,fov:camera.fov,rollDegrees:config.rollDegrees||0,quaternion:camera.quaternion.toArray(),projectionMatrix:camera.projectionMatrix.toArray()},viewport:{width,height},picks:(config.picks||[]).map(p=>({...p,candidates:nearest(p.pixel)})),landmarks:(config.landmarks||[]).map(a=>{const p=new THREE.Vector3().fromArray(a.worldPoint).project(camera);return {id:a.id,pixel:[(p.x+1)*width/2,(1-p.y)*height/2]};}),surfacePicks:(config.surfacePicks||[]).map(a=>{ray.setFromCamera(new THREE.Vector2(a.pixel[0]/width*2-1,1-a.pixel[1]/height*2),camera);const h=ray.intersectObject(root,true)[0];return {...a,hit:h?{object:h.object.name,face:h.faceIndex,point:h.point.toArray(),normal:h.face.normal.toArray()}:null};}),projectedPoints:points.length,render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}};
</script>`;
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;let body,type;if(p==='/'){body=html;type='text/html';}else if(p==='/source.glb'){body=assetBytes;type='model/gltf-binary';}else if(p==='/replacement.glb'&&replacementBytes){body=replacementBytes;type='model/gltf-binary';}else if(p==='/motion.json'&&motionData){body=JSON.stringify({escalators:motionData.escalators,combSupports:motionData.combSupports});type='application/json';}else if(p==='/escalators.js'){body=await readFile('web/public/escalators.js');type='text/javascript';}else if(p==='/view.json'){body=viewBytes;type='application/json';}else if(p.startsWith('/three/')){const file=resolve('node_modules/three',p.slice(7));assert(file.startsWith(resolve('node_modules/three')+'/'));body=await readFile(file);type='text/javascript';}else throw Error('Not found');res.writeHead(200,{'Content-Type':type});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false,args:['--enable-webgl','--use-angle=metal']});const page=await browser.newPage({viewport:view.viewport||{width:1280,height:720},deviceScaleFactor:1}),errors=[];let failPage;const pageFailure=new Promise((_,reject)=>{failPage=reject;});page.on('pageerror',e=>{errors.push(String(e));failPage(e);});
 await page.goto('http://127.0.0.1:'+server.address().port);await Promise.race([page.waitForFunction(()=>window.__registration,null,{timeout:120000}),pageFailure]);const report=await page.evaluate(()=>__registration);assert.deepEqual(report.camera.position,view.position);assert.equal(errors.length,0);
 await page.locator('canvas').screenshot({path:out+'/source.png'});await writeFile(out+'/projection.json',JSON.stringify({...report,asset,assetSha256:sha(assetBytes),motion:motionFile?{nativeFile:motionFile,sha256:sha(motionBytes),time:view.motion.time||0,lanes:motionData.escalators.length}:null,replacement:replacement?{asset:replacement,sha256:sha(replacementBytes),removedObject:view.replacement.object,removedFaces:view.replacement.faces}:null,inputViewSha256:sha(viewBytes),errors},null,2)+'\n');console.log(out,JSON.stringify(report.camera));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
