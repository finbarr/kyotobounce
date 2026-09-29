// Kyoto opening-day interior reference: extractor, service shelf and counter equipment.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));
const cfg=JSON.parse(await readFile(manifest)),frame=JSON.parse(await readFile('.local/v2/current/components/daruma-frontage/report.json')).geometry,{origin:C,across:A,inward:N}=frame,sha=b=>createHash('sha256').update(b).digest('hex');
const mat=(name,color,metal=0,rough=.6,extra={})=>({name:'Daruma kitchen | '+name,pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:metal,roughnessFactor:rough},...extra});
const mats=[mat('brushed stainless',[.48,.51,.52,1],.72,.36),mat('dark metal',[.021,.024,.024,1],.35,.6),mat('brown pitcher',[.065,.038,.019,1],0,.4),mat('ivory ceramic',[.78,.76,.68,1],0,.36),mat('bamboo utensils',[.5,.33,.14,1]),mat('wine red enamel',[.26,.009,.014,1],0,.38),mat('white appliance',[.73,.72,.64,1],0,.5),mat('counter notices',[1,1,1,1]),mat('task strip surface',[.63,.72,.78,1],0,.4,{emissiveFactor:[.18,.22,.25]})];
const c=construction(mats),printed=[],counts={};let sideCluster=null;const point=(w,h,t)=>{if(sideCluster){const [sw,st]=sideCluster;[w,t]=[sw+t-st,st-(w-sw)];}return[C[0]+A[0]*w+N[0]*t,C[1]+h,C[2]+A[2]*w+N[2]*t];};
function shape(id,g,w,h,t,m,collision=false){const p=g.attributes.position,n=g.attributes.normal,normal=[];for(let i=0;i<p.count;i++){const nx=sideCluster?n.getZ(i):n.getX(i),nz=sideCluster?-n.getX(i):n.getZ(i);normal.push(A[0]*nx+N[0]*nz,n.getY(i),A[2]*nx+N[2]*nz);};c.add('daruma-detail-'+id,Array.from({length:p.count},(_,i)=>point(w+p.getX(i),h+p.getY(i),t+p.getZ(i))),Array.from(g.index.array),m,'restaurant-fitting',normal);const panel=c.panels.at(-1);panel.material=m===3?'stone':m===4?'wood':'steel';panel.collision=collision;panel.normals=Array.from({length:p.count},(_,i)=>({x:normal[i*3],y:normal[i*3+1],z:-normal[i*3+2]}));g.dispose();return panel;}
const box=(id,w,h,t,x,y,z,m,collision=false,rx=0)=>shape(id,new T.BoxGeometry(x,y,z).rotateX(rx),w,h,t,m,collision);
const cyl=(id,w,h,t,r,height,m,rBottom=r)=>shape(id,new T.CylinderGeometry(r,rBottom,height,24),w,h,t,m);
const ring=(id,w,h,t,r,tube,m)=>shape(id,new T.TorusGeometry(r,tube,6,24).rotateX(Math.PI/2),w,h,t,m);
// The hood fills the upper part of the existing hatch. Individual baffles create real depth.
box('extractor-case',.15,2.15,4.0,4.75,.22,.69,0,true);
box('extractor-recess',.15,2.04,3.65,4.55,.14,.025,1);
for(let i=0;i<22;i++)box('extractor-baffle-'+i,-2.02+i*.207,2.05,3.63,.13,.15,.023,0,false,-.4);
box('extractor-lower-lip',.15,1.95,3.71,4.8,.035,.25,0);
for(const w of[-2.28,2.58])box('extractor-side-'+w,w,2.04,3.96,.035,.25,.56,0);
// Stacked metal trays and containers on the existing shelf, supported by visible brackets.
for(const w of[-2.25,-.65,.95,2.45]){box('shelf-bracket-'+w,w,1.69,4.39,.03,.22,.05,0);box('shelf-arm-'+w,w,1.79,4.27,.03,.025,.24,0);}
for(let i=0;i<5;i++){box('tray-stack-'+i,1.65,1.865+i*.029,4.29,.37,.025,.24,0);box('tray-inset-'+i,1.65,1.879+i*.029,4.29,.31,.004,.18,1);}
for(const [i,w]of[.8,.46,.12].entries()){cyl('shelf-pot-'+i,w,1.94,4.29,.10,.18,0);ring('shelf-pot-rim-'+i,w,2.032,4.29,.10,.008,0);}
box('towel-stack',-1.35,1.91,4.26,.35,.12,.23,5);
// White upright cupboard seen at the right of the Kyoto hatch.
box('upright-appliance',-2.43,1.61,4.16,.67,1.08,.52,6,true);
box('appliance-door-seam',-2.43,1.64,3.891,.008,.96,.009,1);
for(const w of[-2.52,-2.34])box('appliance-handle-'+w,w,1.62,3.87,.018,.23,.03,0);
// Small worktop fittings remain below and behind the serving opening.
for(const [i,w]of[1.9,1.05,-.2].entries()){cyl('stockpot-'+i,w,1.23,4.02,.18,.34,0);ring('stockpot-rim-'+i,w,1.405,4.02,.18,.012,0);cyl('stockpot-lid-'+i,w,1.414,4.02,.174,.012,0);cyl('stockpot-knob-'+i,w,1.436,4.02,.028,.03,1);for(const side of[-1,1])box('stockpot-handle-'+i+'-'+side,w+side*.207,1.32,4.02,.075,.023,.04,0);}
for(let i=0;i<4;i++)box('backsplash-joint-'+i,-2+i*1.05,1.55,4.458,.008,.54,.008,1);
box('task-strip-body',-.4,2.015,4.14,2.8,.045,.10,1);box('task-strip-lens',-.4,1.988,4.14,2.72,.01,.085,8);
// Counter clusters: brown water pitchers, stainless pots, chopsticks and simple notices.
function card(id,w,t,width=.09,height=.16){const p=box(id,w,.99+height/2,t,width,height,.012,7);printed.push({id:p.id,w,t,width,height,bottom:.99,side:sideCluster});}
const locations=[[-2.12,3.05],[-.53,3.05],[1.06,3.05],[3.55,1.0],[3.55,2.30]];
for(const [i,[w,t]]of locations.entries()){
 sideCluster=i>=3?[w,t]:null;const jug=w-.32;cyl('pitcher-body-'+i,jug,1.145,t,.081,.30,2,.074);cyl('pitcher-lid-'+i,jug,1.304,t,.087,.026,2);cyl('pitcher-cap-'+i,jug,1.324,t,.037,.018,2);
 shape('pitcher-handle-'+i,new T.TorusGeometry(.072,.012,6,24).scale(.75,1.35,1),jug+.086,1.16,t,2);box('pitcher-spout-'+i,jug-.078,1.285,t,.049,.038,.06,2);
 cyl('chopstick-pot-'+i,w,1.063,t,.042,.146,0);ring('chopstick-rim-'+i,w,1.137,t,.042,.004,0);
 for(let k=0;k<9;k++){const a=k*2.399;cyl('bamboo-'+i+'-'+k,w+Math.cos(a)*.026,1.20+(.003*(k%3)),t+Math.sin(a)*.026,.003,.24,4);}
 for(const [k,dx]of[.12,.22].entries()){cyl('condiment-tin-'+i+'-'+k,w+dx,1.046,t,.044,.108,0);cyl('condiment-lid-'+i+'-'+k,w+dx,1.105,t,.047,.01,0);cyl('condiment-knob-'+i+'-'+k,w+dx,1.116,t,.012,.018,1);}
 cyl('seasoning-can-'+i,w+.32,1.04,t,.026,.095,3);cyl('seasoning-cap-'+i,w+.32,1.09,t,.027,.01,1);
 cyl('sauce-bottle-'+i,w+.41,1.065,t,.028,.15,1);cyl('sauce-cap-'+i,w+.41,1.148,t,.021,.018,5);card('notice-'+i,w+.52,t-.055);
 counts.counterClusters=(counts.counterClusters||0)+1;
}
sideCluster=null;
await c.save(out,'daruma-kitchen.glb',{sourceLayoutSha256:cfg.layoutSha256,geometry:{...frame,...counts},scope:'Kyoto-photo-guided serving hatch equipment, cream counter and condiment clusters.'});
// A small original notice, with no copied photography, logos or stale price list.
const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="512"><rect width="256" height="512" fill="#a92422"/><rect x="15" y="15" width="226" height="482" fill="#eee5cf"/><g font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text x="128" y="70" font-size="30" fill="#a92422">博多だるま</text><text x="128" y="147" font-size="42" fill="#292720">替玉</text><g font-size="24" fill="#292720"><text x="128" y="220">お好みの硬さを</text><text x="128" y="258">お申し付け</text><text x="128" y="296">ください</text><text x="128" y="375">卓上のタレで</text><text x="128" y="413">味を調整できます</text></g></g></svg>`);
await writeFile(out+'/daruma-counter-notice.svg',svg);const atlas=await sharp(svg).png().toBuffer();await writeFile(out+'/daruma-counter-notice.png',atlas);
const {json:j,bin}=readGLB(await readFile(out+'/daruma-kitchen.glb')),parts=[bin];let offset=bin.length;function append(data){const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length});parts.push(data);offset+=data.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return id;}
const uv=(v,f)=>{const localW=(v[0]-C[0])*A[0]+(v[2]-C[2])*A[2],localT=(v[0]-C[0])*N[0]+(v[2]-C[2])*N[2],q=f.side?f.side[0]+f.side[1]-localT:localW,h=v[1]-C[1];return[.5-(q-f.w)/f.width,1-(h-f.bottom)/f.height];};
const p=j.meshes[7].primitives[0],acc=j.accessors[p.attributes.POSITION],view=j.bufferViews[acc.bufferView],data=Buffer.alloc(acc.count*8);assert.equal(acc.count,printed.length*24);
for(let i=0;i<acc.count;i++){const v=[0,1,2].map(k=>bin.readFloatLE(view.byteOffset+i*12+k*4)),q=uv(v,printed[Math.floor(i/24)]);data.writeFloatLE(q[0],i*8);data.writeFloatLE(q[1],i*8+4);}
p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(data),componentType:5126,type:'VEC2',count:acc.count});j.images=[{bufferView:append(atlas),mimeType:'image/png'}];j.textures=[{source:0,sampler:0}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
const glb=writeGLB(j,Buffer.concat(parts)),native=JSON.parse(await readFile(out+'/native-panels.json'));for(const panel of native.panels){const f=printed.find(f=>f.id===panel.id);if(f)panel.uv=panel.vertices.map(v=>{const[u,t]=uv([Math.fround(v.x),Math.fround(v.y),Math.fround(-v.z)],f);return{x:u,y:1-t};});}
const lamp=point(0,1.99,3.95);native.authoredLights=[{id:'restaurant-practical-daruma-kitchen-strip',position:{x:lamp[0],y:lamp[1],z:-lamp[2]},direction:{x:0,y:-1,z:0},linearColor:{r:.8,g:.9,b:1,a:1},intensity:1.4,range:4,spotAngle:110,innerSpotAngle:65,source:'https://kyotopi.jp/articles/hakatadaruma',note:'Cool hood illumination is visible in the Kyoto opening photo; output and dimensions are fitted estimates.'}];
const nb=Buffer.from(JSON.stringify(native)+'\n');await writeFile(out+'/daruma-kitchen.glb',glb);await writeFile(out+'/native-panels.json',nb);const report=JSON.parse(await readFile(out+'/report.json'));Object.assign(report,{builder:'web/station/realism/build-daruma-kitchen.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),reference:'https://kyotopi.jp/articles/hakatadaruma',texture:{file:'daruma-counter-notice.png',sha256:sha(atlas),material:mats[7].name},limits:['Dimensions and exact equipment positions are fitted estimates.','The central communal table and framed historical photographs remain future work.','The first-person Kyoto photograph takes precedence over the owner reference collage.']});report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.geometry));
