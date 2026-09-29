// Small local component viewer; no full station bundle or service database is copied.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const [directory,portArg='4430']=process.argv.slice(2),root=resolve(directory),port=Number(portArg);
if(!root.startsWith(resolve('.local')+'/'))throw Error('Private component directory required');
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const html=`<!doctype html><meta charset="utf-8"><title>Subway component inspection</title>
<style>body{margin:0;background:#c4cbd1}canvas{display:block}#status{position:fixed;left:12px;top:10px;font:13px system-ui;background:#ffffffe0;padding:8px 12px}</style>
<div id="status">Loading replacement component…</div>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createEscalators} from '/public/escalators.js';
import {createLifts} from '/public/lifts.js';
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#c4cbd1');const camera=new T.PerspectiveCamera(63,innerWidth/innerHeight,.035,600);
scene.add(new T.HemisphereLight(0xe9efff,0x777266,2));const sun=new T.DirectionalLight(0xfff2de,2.1);sun.position.set(80,100,-100);scene.add(sun);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();
const [layout,motion,asset]=await Promise.all([fetch('/data/isolated-layout.json').then(r=>r.json()),fetch('/data/motion.json').then(r=>r.json()),new GLTFLoader().loadAsync('/data/subway-refit.glb')]);
scene.add(asset.scene);const moving=createEscalators(scene,layout.escalators,motion.combSupports);createLifts(scene,layout.lifts,layout.authoredMaterials);
const ceilings=[];asset.scene.traverse(o=>{if(o.isMesh&&o.material.name==='Subway refit | ceiling')ceilings.push(o);});
window.__component={renderer,scene,camera,layout,setView({p,t,cutaway=false}){camera.position.set(p[0],p[1],-p[2]);camera.lookAt(t[0],t[1],-t[2]);for(const o of ceilings)o.visible=!cutaway;},stats(){return{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,materials:renderer.info.memory.textures};}};
__component.setView({p:[74,-4.5,118],t:[83,-4.5,108]});
document.querySelector('#status').textContent='Replacement component · whole-station integration pending';
renderer.setAnimationLoop(time=>{moving(time/1000,camera);renderer.render(scene,camera);});
addEventListener('pagehide',()=>{renderer.dispose();renderer.forceContextLoss();});
</script>`;
const server=http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const p=new URL(req.url,'http://localhost').pathname;let file;
  if(p==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(req.method==='HEAD'?undefined:html);return;}
  if(p.startsWith('/three/'))file=resolve('node_modules/three',p.slice(7));
  else if(['/public/escalators.js','/public/lifts.js'].includes(p))file=resolve('web',p.slice(1));
  else if(['/data/isolated-layout.json','/data/motion.json','/data/subway-refit.glb'].includes(p))file=resolve(root,p.slice(6));
  else throw Error('Not found');
  if(!file.startsWith(process.cwd()+'/'))throw Error('Outside workspace');
  const b=await readFile(file);res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'}[extname(file)],'Cache-Control':'no-store','Content-Length':b.length});res.end(req.method==='HEAD'?undefined:b);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log('Component inspection http://127.0.0.1:'+port));
