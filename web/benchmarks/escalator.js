import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),variant=params.get('variant')||'baseline';
$('variant').value=variant;$('variant').onchange=()=>{params.set('variant',$('variant').value);params.set('lane',$('lane').value);params.set('end',$('end').value);location.search=params;};
const renderer=new T.WebGLRenderer({canvas:$('game'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0x233543);const camera=new T.PerspectiveCamera(55,1,.05,250),controls=new OrbitControls(camera,renderer.domElement);
scene.add(new T.HemisphereLight(0xe1eeff,0x79715f,1.5));const sun=new T.DirectionalLight(0xfff0d5,3);sun.position.set(30,60,-15);scene.add(sun);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.02).texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const [data,detail,station,hardware,{createEscalators}]=await Promise.all([fetch('/assets/source/station.json').then(r=>r.json()),fetch('/assets/source/atrium-detail.json').then(r=>r.json()),loader.loadAsync('/assets/runtime/atrium.glb'),loader.loadAsync('/assets/runtime/atrium-detail.glb'),import('/'+variant+'/escalators.js')]);
scene.add(station.scene,hardware.scene);const motion=createEscalators(scene,data.escalators,detail.combSupports);
for(const spec of data.escalators){const o=document.createElement('option');o.value=spec.id;o.textContent=spec.id+(spec.speed>0?' ↑':' ↓');$('lane').append(o);}
$('lane').value=params.get('lane')||'east-concourse-upper-escalator-1';$('end').value=params.get('end')||'lower';
function focus(){const s=data.escalators.find(s=>s.id===$('lane').value),upper=$('end').value==='upper',u=new T.Vector3(s.uphill.x,0,-s.uphill.z),right=new T.Vector3(u.z,0,-u.x),root=new T.Vector3(s.lowerCenter.x,s.lowerCenter.y,-s.lowerCenter.z),along=upper?s.run:0,h=upper?s.height:0;controls.target.copy(root).addScaledVector(u,along+(upper?.2:-.2)).add(new T.Vector3(0,h+.07,0));camera.position.copy(root).addScaledVector(u,along+(upper?2.25:-2.25)).addScaledVector(right,.30).add(new T.Vector3(0,h+1.30,0));controls.update();}
$('lane').onchange=$('end').onchange=$('reset').onclick=focus;focus();let paused=false,time=0,last=performance.now(),reportAt=0;
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Play':'Pause';};$('phase').oninput=()=>{paused=true;$('pause').textContent='Play';const s=data.escalators.find(s=>s.id===$('lane').value);time=Number($('phase').value)*s.pitchM/Math.abs(s.speed);};
function frame(now){requestAnimationFrame(frame);if(!paused)time+=Math.min(.05,(now-last)/1000);last=now;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();motion(time);controls.update();renderer.render(scene,camera);if(now-reportAt>250){reportAt=now;$('status').textContent=`${variant} · ${$('lane').value} · ${$('end').value}\nTime ${time.toFixed(3)} s · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles\nDrag to orbit · wheel to zoom`;}}
requestAnimationFrame(frame);
