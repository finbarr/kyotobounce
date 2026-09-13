import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { computeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
const params = new URLSearchParams(location.search),
  height = params.get("height") === "1080" ? 1080 : 720,
  width = (height * 16) / 9,
  variant = params.get("variant") || "baseline",
  prefix = variant === "baseline" ? "/baseline/" : "/current/";
const [
  { dressStation, contactShadow },
  { addStationDetails },
  { addConcourseDetails },
  { createEscalators },
  { createAvatar, poseAvatar },
  { CameraObstacles },
] = await Promise.all(
  [
    "station-look.js",
    "station-details.js",
    "concourse-details.js",
    "escalators.js",
    "avatar.js",
    "camera-obstacles.js",
  ].map((name) => import(prefix + name)),
);
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
const $ = (id) => document.getElementById(id);
document.querySelector("p").textContent =
  "Identical " +
  width +
  " × " +
  height +
  " drawing buffer, every triangle and original texture resolution. No adaptive resolution.";
const renderer = new THREE.WebGLRenderer({
  canvas: $("game"),
  antialias: true,
  powerPreference: "high-performance",
});
window.addEventListener("pagehide", () => {
  renderer.dispose();
  renderer.forceContextLoss();
});
renderer.setPixelRatio(1);
renderer.setSize(width, height, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(),
  sun = new THREE.DirectionalLight(0xfff0d5, 3.1),
  camera = new THREE.PerspectiveCamera(55, width / height, 0.035, 450);
scene.add(new THREE.HemisphereLight(0xe1eeff, 0x79715f, 1.1), sun);
const pmrem = new THREE.PMREMGenerator(renderer),
  room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.02).texture;
scene.environmentIntensity = 0.55;
room.dispose();
pmrem.dispose();
const started = performance.now(),
  loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
  asset = variant === "baseline" ? "/assets/source/" : "/assets/runtime/";
loader.manager.onProgress = (url, done, total) => {
  $("status").textContent = "Loading " + done + "/" + total;
};
window.addEventListener("unhandledrejection", (e) => {
  $("status").textContent = "ERROR " + e.reason;
});
const [data, detailData, atrium, robot, hardware] = await Promise.all([
  fetch("/assets/source/station.json").then((r) => r.json()),
  fetch("/assets/source/atrium-detail.json").then((r) => r.json()),
  ...["atrium.glb", "ori.glb", "atrium-detail.glb"].map((name) =>
    fetch(asset + name).then(async (response) => {
      const bytes = await response.arrayBuffer();
      $("status").textContent =
        "Decoding " +
        name +
        " · " +
        Math.round(bytes.byteLength / 1048576) +
        " MiB";
      return loader.parseAsync(bytes, asset);
    }),
  ),
]);
$("status").textContent = "Building surfaces and collision trees";
const station = atrium.scene;
scene.add(hardware.scene);
hardware.scene.traverse((o) => {
  if (o.isMesh) o.receiveShadow = true;
});
addStationDetails(scene, detailData);
addConcourseDetails(scene, data, renderer.capabilities.getMaxAnisotropy());
station.traverse((o) => {
  if (o.isMesh) {
    o.geometry.computeBoundsTree();
    o.matrixAutoUpdate = false;
    o.updateMatrix();
  }
});
station.updateMatrixWorld(true);
scene.add(station);
const obstacles = new CameraObstacles(station),
  motion = createEscalators(scene, data.escalators);
motion(0);
const look = dressStation(renderer, scene, sun, station, data);
look.updateLights(camera.position, 0);
$("status").textContent = "Capturing fixed reflections";
look.captureEnvironment();
if (variant !== "baseline") {
  const { freezeStaticTransforms } = await import(
    "/current/static-transforms.js"
  );
  for (const root of [
    station,
    hardware.scene,
    ...scene.children.filter(
      (o) => o.name === "Atrium signs and flush floor finishes",
    ),
  ])
    freezeStaticTransforms(root);
}
const avatar = createAvatar(robot, { character: "ori" });
scene.add(avatar.group);
const shadow = contactShadow(scene, station);
avatar.group.position.set(0, 0, -20);
const player = {
    id: "bench",
    feet: { x: 0, y: 0, z: 20 },
    release: { x: -0.22, y: 1.5, z: 19.58 },
    yaw: 180,
    pitch: 12,
    top: 0,
    kick: 0,
    power: 0,
    powerRange: "full",
    grounded: true,
    walked: 0,
    movement: { x: 0, y: 0, z: 0 },
  },
  state = {
    owner: "bench",
    attempt: "bench",
    releaseTime: -5,
    velocity: { x: 0, y: 0, z: 0 },
    spin: { x: 0, y: 0, z: 0 },
    ball: { x: 0, y: 1, z: 20 },
    diagnostics: { sleeping: true },
  };
const views = [
  { name: "central-hall", position: [0, 2.5, -25], target: [0, 13, 2] },
  { name: "west-escalators", position: [-47, 10, 14], target: [-90, 22, 16] },
  { name: "sky-garden", position: [-156, 58, 24], target: [-142, 57, 18] },
  { name: "east-concourse", position: [32, 2.5, 0], target: [26, 3, 14] },
];
const inspecting=params.has('inspect');
if(inspecting&&data.stationAdditions?.views){
  const point=p=>[p.x,p.y,-p.z];
  views.push(...data.stationAdditions.views.map(v=>({...v,name:v.id,position:point(v.position),target:point(v.target)})));
  // Keep the reverse retail inspection outside the retained escalator casing.
  const retailReturn=views.find(v=>v.name==='add-yojiya1f-retail-return');
  if(retailReturn)retailReturn.position=[17.75,1.7,-8.4];
  views.push(
    {name:'installation-grand-stair',position:[-72.35,21.17,-4.45],target:[-113.12,33.12,21.92],fov:66,anchors:['Grand Staircase lower plaza','existing staircase riser contours','west upper landings']},
    {name:'installation-east-wall',position:[98,36.4,10],target:[112.46,43.5,5.4],fov:65,anchors:['East Square floor','east wall installation face','retained tree and gazebo']},
    {name:'installation-skyway',position:[-60,46.85,-2.326],target:[55,46.85,-2.326],fov:65,anchors:['retained Skyway floor','continuous ceiling ribbons','frosted south panels']},
  );
}
let running = false,
  view = views[0];
const gl = renderer.getContext(),
  ext = params.has("gpu")
    ? gl.getExtension("EXT_disjoint_timer_query_webgl2")
    : null,
  pending = [];
let gpu = [];
function render(time = 12, move = 0) {
  camera.position.fromArray(view.position);
  camera.fov=view.fov||55;camera.updateProjectionMatrix();
  camera.position.x += move;
  camera.lookAt(new THREE.Vector3().fromArray(view.target));
  camera.updateMatrixWorld();
  motion(time);
  poseAvatar(avatar, player, "Aim", state, time);
  look.updateLights(camera.position, time);
  const anchor = camera.position
    .clone()
    .addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 3.8);
  avatar.group.position.copy(anchor).add(new THREE.Vector3(0, -1.3, 0));
  avatar.group.visible=!inspecting;
  shadow(avatar.group.position, 1.15, !inspecting);
  obstacles.clearance(anchor, camera.position, 0.16);
  renderer.render(scene, camera);
}
$("status").textContent = "Compiling exact shaders";
await renderer.compileAsync(scene, camera);
for (let i = 0; i < 20; i++) render(10 + i * 0.1);
await document.fonts.ready;
render();
const startupMs = performance.now() - started;
let last = performance.now(),inspectionTime=12;
function idle(now) {
  if (!running) render(inspecting?(inspectionTime+=Math.min(.1,(now-last)/1000)):12);
  last = now;
  requestAnimationFrame(idle);
}
requestAnimationFrame(idle);
const percentile = (a, p) => {
  const sorted = a.slice().sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0
  );
};
const summary = (a) => ({
  p50: percentile(a, 0.5),
  p95: percentile(a, 0.95),
  mean: a.reduce((s, v) => s + v, 0) / a.length,
});
function pollGPU() {
  for (let i = pending.length - 1; i >= 0; i--) {
    const q = pending[i];
    if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) {
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT))
        gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
      pending.splice(i, 1);
    }
  }
}
$("run").disabled = false;
$("status").textContent =
  "Ready · " + variant + " · " + Math.round(startupMs) + " ms startup";
if(inspecting){
  $('inspection').hidden=false;
  let evening=false;
  const fields=()=>{
    $('view-position').value=view.position.join(', ');$('view-target').value=view.target.join(', ');
    $('view-evidence').textContent=JSON.stringify({name:view.name,anchors:view.anchors,reference:view.reference,layout:data.layoutSha256,artwork:scene.children.filter(o=>o.name.startsWith('Registered station artwork')).length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
  };
  for(const [i,v]of views.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=v.name;$('station-view').append(option);}
  $('station-view').onchange=()=>{view=views[Number($('station-view').value)];render();fields();};
  $('apply-view').onclick=()=>{const read=id=>$(id).value.split(',').map(Number);const position=read('view-position'),target=read('view-target');if([...position,...target].length!==6||![...position,...target].every(Number.isFinite))return;view={...view,position,target};render();fields();};
  $('evening').onclick=()=>{evening=!evening;look.setNight(evening);$('evening').setAttribute('aria-pressed',String(evening));render();};
  const saveView=async()=>{
    const name=view.name,suffix=evening?'-evening':'';
    for(let i=0;i<20;i++)render(inspectionTime+=.1);
    const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    await fetch('/bench/capture/'+variant+'/'+name+suffix,{method:'POST',body:pixels});$('status').textContent='Saved '+name+(suffix?' · evening':'');fields();
  };
  $('save-view').onclick=saveView;
  $('save-views').onclick=async()=>{
    if(running)return;running=true;$('save-views').disabled=true;
    try{for(const v of views){view=v;$('station-view').value=String(views.indexOf(v));await saveView();}$('status').textContent='Saved all '+views.length+' views';}
    finally{running=false;$('save-views').disabled=false;}
  };
  fields();
}
$("run").onclick = async () => {
  if (running) return;
  running = true;
  $("run").disabled = true;
  const rows = [];
  try {
    for (const v of views) {
      for (const q of pending) gl.deleteQuery(q);
      pending.length = 0;
      view = v;
      $("status").textContent = variant + " · " + v.name + " · warming";
      for (let i = 0; i < 20; i++) render(10 + i * 0.1);
      gpu = [];
      const cpu = [],
        intervals = [],
        calls = [],
        triangles = [];
      let start, previous;
      await new Promise((resolve) => {
        function frame(now) {
          start ??= now;
          const age = (now - start) / 1000,
            measuring = age >= 2;
          let query;
          if (ext && measuring) {
            query = gl.createQuery();
            gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
          }
          const t = performance.now();
          render(12 + age, Math.sin(age * 0.55) * 1.2);
          const cost = performance.now() - t;
          if (query) {
            gl.endQuery(ext.TIME_ELAPSED_EXT);
            pending.push(query);
          }
          if (ext) pollGPU();
          if (measuring) {
            cpu.push(cost);
            intervals.push(now - previous);
            calls.push(renderer.info.render.calls);
            triangles.push(renderer.info.render.triangles);
            $("status").textContent = variant + " · " + v.name + " · measuring";
          }
          previous = now;
          if (age < 6) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      for (let i = 0; i < 20; i++) render(30 + i * 0.1);
      render(32);
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      await fetch("/bench/capture/" + variant + "/" + v.name + "-" + height, {
        method: "POST",
        body: pixels,
      });
      rows.push({
        scene: v.name,
        frames: cpu.length,
        fps: 1000 / summary(intervals).mean,
        frameMs: summary(intervals),
        cpuMs: summary(cpu),
        gpuMs: gpu.length ? summary(gpu) : null,
        drawCalls: summary(calls),
        triangles: summary(triangles),
      });
      $("result").textContent = JSON.stringify(rows, null, 2);
    }
    const debug = gl.getExtension("WEBGL_debug_renderer_info"),
      report = {
        variant,
        benchmarkVersion: 3,
        gpuProfiling: !!ext,
        startupMs,
        resolution: [width, height],
        pixelRatio: 1,
        userAgent: navigator.userAgent,
        gpu: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : "unavailable",
        resources: performance
          .getEntriesByType("resource")
          .filter((r) => r.name.includes("/assets/"))
          .map((r) => ({
            name: r.name,
            transferBytes: r.transferSize,
            encodedBytes: r.encodedBodySize,
            decodedBytes: r.decodedBodySize,
            duration: r.duration,
          })),
        rows,
      };
    await fetch("/bench/report/" + variant, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    $("result").textContent = JSON.stringify(report, null, 2);
    $("status").textContent = "Complete · " + variant;
  } catch (error) {
    $("status").textContent = "ERROR " + error.message;
    console.error(error);
  } finally {
    running = false;
    $("run").disabled = false;
  }
};
