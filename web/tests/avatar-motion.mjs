// Actual asset, rendered from three angles, driven by browser keyboard input.
// Fixture movement is deterministic; avatar-runtime.mjs checks native input separately.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseline=process.argv.includes('--baseline');
const out=`artifacts/robot/${baseline?'baseline':process.argv.includes('--gaze')?'gaze-motion':process.argv.includes('--style')?'mascot':'improved'}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1200,height:650},recordVideo:{dir:out,size:{width:1200,height:650}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/robot-lab',route=>route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><style>body{margin:0;background:#202830;color:white;font:18px sans-serif}p{position:absolute;left:20px}</style><p>Robot motion: front / side / rear • W/S forward/back • A/D strafe • B ball • X wall</p><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>'}));
 await page.goto('http://127.0.0.1:4173/robot-lab');
 await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{createAvatar,poseAvatar}=await import('/avatar.js');
  const asset=await new GLTFLoader().loadAsync('/assets/ori.glb'),a=createAvatar(asset),scene=new T.Scene();scene.background=new T.Color('#303d48');scene.add(a.group,new T.HemisphereLight(0xffffff,0x4a5360,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
  const grid=new T.GridHelper(100,200,0x8697a0,0x53636d);scene.add(grid);const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x46515a}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);a.model.traverse(o=>{if(o.isMesh)o.castShadow=true;});light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.camera.left=-3;light.shadow.camera.right=3;light.shadow.camera.top=3;light.shadow.camera.bottom=-3;scene.add(light.target);
  const ball=new T.Mesh(new T.SphereGeometry(.08),new T.MeshStandardMaterial({color:0xff6633}));scene.add(ball);
  const renderer=new T.WebGLRenderer({antialias:false});renderer.shadowMap.enabled=true;renderer.setPixelRatio(.65);renderer.setSize(1200,650);document.body.appendChild(renderer.domElement);
  const cameras=[[2,1.8,3],[3,1.5,0],[-2,1.8,-3]].map(v=>{const c=new T.PerspectiveCamera(40,400/650,.01,200);c.userData.offset=new T.Vector3(...v);return c;});
  const p={id:'robot',feet:{x:0,y:0,z:0},yaw:180,pitch:15,top:0,kick:0,power:0,grounded:true,walked:0,movement:{x:0,z:0},release:{x:0,y:1.5,z:0}};
  const keys=new Set();window.addEventListener('keydown',e=>keys.add(e.code));window.addEventListener('keyup',e=>keys.delete(e.code));let last=performance.now(),time=0;
  window.lab={a,p,poseAvatar,T,rows:[],setYaw(yaw){p.yaw=yaw;},rig:Object.fromEntries(['head','hips','thigh.L','shin.L','foot.L'].map(n=>[n,{position:a.bones[n].getWorldPosition(new T.Vector3()).toArray(),rotation:a.bones[n].getWorldQuaternion(new T.Quaternion()).toArray()}]))};
  function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;time+=dt;
   const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),speed=keys.has('ShiftLeft')?4.2:1.4,wall=keys.has('KeyX');
   p.movement={x:wall?0:x*speed,z:wall?0:-z*speed};p.feet.x+=p.movement.x*dt;p.feet.z+=p.movement.z*dt;p.walked+=Math.hypot(p.movement.x,p.movement.z)*dt;
   a.group.position.set(p.feet.x,0,-p.feet.z);a.group.rotation.y=Math.PI-p.yaw*Math.PI/180;light.position.copy(a.group.position).add(new T.Vector3(3,5,4));light.target.position.copy(a.group.position);
   const b={x:p.feet.x+Math.sin(time*1.3)*2,y:.12+Math.abs(Math.sin(time*2.6))*2,z:p.feet.z-2};ball.position.set(b.x,b.y,-b.z);ball.visible=keys.has('KeyB')||keys.has('KeyR');p.power=keys.has('KeyC')?.8:0;
   poseAvatar(a,p,keys.has('KeyC')?'Charging':keys.has('KeyR')?'Result':ball.visible?'Flight':'Aim',{owner:'robot',releaseTime:0,ball:b},time);
   const feet=['L','R'].map(s=>a.bones[`foot.${s}`].getWorldPosition(new T.Vector3()).toArray());
   window.lab.rows.push({time,keys:[...keys],feet,root:a.group.position.toArray(),blend:a.walkBlend,head:a.head.getWorldQuaternion(new T.Quaternion()).toArray()});
   renderer.setScissorTest(true);cameras.forEach((c,i)=>{c.position.copy(a.group.position).add(c.userData.offset);c.lookAt(a.group.position.clone().add(new T.Vector3(0,.95,0)));renderer.setViewport(i*400,0,400,650);renderer.setScissor(i*400,0,400,650);renderer.render(scene,c);});requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
 });
 console.log('Rig',await page.evaluate(()=>window.lab.rig));
 for(const [name,keys,duration] of [['idle',[],600],['forward',['KeyW'],2400],['wall',['KeyW','KeyX'],1000],['backward',['KeyS'],2000],['stop',[],900],['strafe',['KeyD'],2000],['diagonal',['KeyW','KeyA'],1700],['fast',['KeyW','ShiftLeft'],1700],['ball',['KeyB'],3000],['return',[],1200],['charging',['KeyC'],1000],['result',['KeyR'],1200]]){
  for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(duration);await page.screenshot({path:`${out}/${name}.png`});for(const k of keys)await page.keyboard.up(k);
 }
 const results=await page.evaluate(()=>{
  const {a,p,T,poseAvatar,rows}=window.lab;const tracking=[];
  for(const yaw of [-150,0,45,90,180]){
   a.group.rotation.y=Math.PI-yaw*Math.PI/180;p.yaw=yaw;
   const target=a.group.position.clone().add(new T.Vector3(.9,.8,2).applyAxisAngle(new T.Vector3(0,1,0),a.group.rotation.y));
   const state={owner:p.id,releaseTime:0,ball:{x:target.x,y:target.y,z:-target.z}};
   for(let i=0;i<180;i++)poseAvatar(a,p,'Flight',state,100+i/60);
   const forward=new T.Vector3(0,0,1).applyQuaternion(a.head.getWorldQuaternion(new T.Quaternion()));const direction=target.clone().sub(a.head.getWorldPosition(new T.Vector3())).normalize();
   tracking.push({yaw,error:forward.angleTo(direction)});
  }
  return {rows,tracking};
 });
 await writeFile(`${out}/result.json`,JSON.stringify({baseline,errors,...results},null,2));
 assert.deepEqual(errors,[]);
 if(!baseline)assert.ok(results.tracking.every(r=>r.error<.06),'Head points at reachable ball across avatar headings');
 console.log(JSON.stringify({frames:results.rows.length,tracking:results.tracking}));
}finally{await context.close();await browser.close();}
