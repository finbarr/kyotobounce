// Built frontage from the June 2026 visitor photo; counter fittings from the owner's opening reference.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,registration,out]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex');
assert(out?.startsWith('.local/'));
const cfg=JSON.parse(await readFile(manifest)),r=JSON.parse(await readFile(registration)),E=r.entryRenderer,{a,b,entryPixel}=r.mapTransform;
const at=p=>[E[0]+a*(p[0]-entryPixel[0])-b*(p[1]-entryPixel[1]),E[1],E[2]+b*(p[0]-entryPixel[0])+a*(p[1]-entryPixel[1])];
const poly=[[661,119],[719,59],[762,49],[762,160],[661,160]].map(at),P=poly[3],Q=poly[4],L=Math.hypot(Q[0]-P[0],Q[2]-P[2]),A=[(Q[0]-P[0])/L,0,(Q[2]-P[2])/L],N=[-A[2],0,A[0]],C=P.map((v,i)=>(v+Q[i])/2);
assert(poly.reduce((s,p)=>s+(p[0]-C[0])*N[0]+(p[2]-C[2])*N[2],0)>0);
const material=(name,color,metal=0,rough=.6,extra={})=>({name:'Daruma | '+name,pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:metal,roughnessFactor:rough},...extra});
const mats=[material('dark timber',[.038,.025,.018,1]),material('counter maple',[.49,.30,.13,1],0,.42),material('ivory wall',[.68,.62,.50,1]),material('vermilion finish',[.48,.022,.009,1],0,.42),material('clear glazing',[.74,.84,.82,.16],.05,.12,{alphaMode:'BLEND',doubleSided:true}),material('original printed artwork',[1,1,1,1]),material('brushed steel',[.4,.43,.43,1],.8,.28),material('warm fixture lens',[.85,.76,.58,1],0,.3,{emissiveFactor:[1,.8,.5]})];
const c=construction(mats,{flatNormals:true}),printed=[];
const point=(w,h,t)=>[C[0]+A[0]*w+N[0]*t,C[1]+h,C[2]+A[2]*w+N[2]*t];
function geometry(id,g,w,h,t,m,collision=true){const p=g.attributes.position;c.add('daruma-'+id,Array.from({length:p.count},(_,i)=>point(w+p.getX(i),h+p.getY(i),t+p.getZ(i))),Array.from(g.index.array),m,'shopfront');const panel=c.panels.at(-1);panel.material=[0,1].includes(m)?'wood':m===2?'wall':m===4?'glass':'steel';panel.collision=collision;g.dispose();return panel;}
function box(id,w,h,t,width,height,depth,m,collision=true,rect=null,axis='w'){const panel=geometry(id,new T.BoxGeometry(width,height,depth),w,h,t,m,collision);if(rect)printed.push({id:panel.id,w,h,t,width:axis==='w'?width:depth,height,rect,axis});}
function cylinder(id,w,h,t,radius,height,m,collision=true){geometry(id,new T.CylinderGeometry(radius,radius,height,24),w,h,t,m,collision);}
// The west side is glazed above a timber sill. The south side has the entrance and sign/display wall.
for(let i=0;i<3;i++){const p=poly[i],q=poly[i+1];c.beam('daruma-boundary-'+i,[p[0],C[1]+1.46,p[2]],[q[0],C[1]+1.46,q[2]],.14,2.92,2,'shop-boundary');c.panels.at(-1).material='wall';}
const door={center:1.7,width:1.35},lo=door.center-door.width/2,hi=door.center+door.width/2;
for(const[id,left,right]of[['display',-L/2,lo],['return',hi,L/2]])box('front-'+id,(left+right)/2,1.15,0,right-left,2.30,.14,0);
box('front-fascia',0,2.64,0,L,.58,.18,0);
for(const w of[lo-.05,hi+.05,-L/2+.055,L/2-.055])box('front-post-'+w,w,1.17,-.12,.11,2.34,.14,0);
const sideDepth=poly[0].map((v,i)=>v-poly[4][i]).reduce((s,v,i)=>s+v*N[i],0);
box('side-base',L/2,.52,sideDepth/2,.16,1.04,sideDepth,0);
box('side-glass',L/2,1.75,sideDepth/2,.014,1.38,sideDepth-.12,4);
box('side-frosted-band',L/2+.01,1.14,sideDepth/2,.018,.20,sideDepth-.14,2,false);
box('side-header',L/2,2.65,sideDepth/2,.18,.54,sideDepth,0);
for(const t of[.04,sideDepth-.04])box('side-post-'+t,L/2,1.72,t,.11,1.44,.08,0);
for(const h of[1.04,2.45])box('side-trim-'+h,L/2+.04,h,sideDepth/2,.08,.035,sideDepth,6,false);
box('red-side-sign',L/2+.105,2.65,sideDepth/2,.024,.44,sideDepth-.40,5,false,[0,0,2048,256],'t');
box('main-sign',-.9,2.65,-.105,5.7,.44,.016,5,false,[0,256,2048,256]);
box('display-frame',-1.25,1.43,-.105,4.05,1.37,.11,0);
box('display-print',-1.25,1.43,-.169,3.91,1.24,.008,5,false,[0,512,1536,512]);
box('red-side-panel',.73,1.13,-.09,.42,2.13,.03,3);
// Ticket machine beside the doorway; original text avoids stale menu prices and copied photographs.
box('ticket-case',-3.65,.84,-.25,.52,1.68,.37,0);
box('ticket-screen',-3.65,1.23,-.441,.44,.64,.008,5,false,[1536,512,512,512]);
box('ticket-slot',-3.65,.56,-.445,.24,.028,.014,6,false);
box('ticket-shelf',-3.65,.48,-.50,.40,.04,.24,0);
// The visible dining area uses the reference's pale counter, red round stools and chrome stems.
box('counter-side-base',3.67,.47,1.89,.55,.94,2.85,0);
box('counter-side-top',3.61,.96,1.89,.72,.06,2.97,1);
box('counter-back-base',.14,.47,3.03,5.6,.94,.57,0);
box('counter-back-top',.14,.96,3.03,5.74,.06,.73,1);
box('service-low-wall',.14,1.19,3.42,5.9,.38,.10,2);
box('service-upper-wall',.14,2.58,3.42,5.9,.62,.10,2);
for(const w of[-2.85,3.13])box('service-jamb-'+w,w,1.8,3.42,.11,1.3,.10,2);
box('kitchen-back',.14,1.45,4.52,5.9,2.9,.10,6);
box('kitchen-worktop',.14,1.03,4.03,5.65,.07,.68,6);
box('kitchen-shelf',.14,1.82,4.30,5.65,.055,.30,6);
const seats=[...[-2.20,-1.38,-.56,.26,1.08].map(w=>[w,2.19]),...[.80,1.63,2.46].map(t=>[2.84,t])];
for(const[i,[w,t]]of seats.entries()){cylinder('stool-foot-'+i,w,.035,t,.21,.065,6);cylinder('stool-stem-'+i,w,.32,t,.027,.54,6);cylinder('stool-cushion-'+i,w,.615,t,.20,.075,3);}
for(const[i,[w,t]]of [[-2.15,3],[-.55,3],[1.05,3],[3.55,1.0],[3.55,2.3]].entries()){box('utensil-holder-'+i,w,1.09,t,.09,.20,.09,0,false);for(let k=0;k<4;k++)box('chopstick-'+i+'-'+k,w-.025+k*.016,1.25,t,.008,.23,.008,1,false);cylinder('condiment-'+i,w+.13,1.06,t,.028,.14,3,false);}
// Track and pendants are emissive surfaces; the existing fixed light pool supplies illumination from matching metadata.
box('light-track',0,2.89,1.6,6.4,.035,.045,0,false);
for(const w of[-2.4,-.8,.8,2.4]){cylinder('pendant-stem-'+w,w,2.73,1.6,.015,.28,6,false);cylinder('pendant-body-'+w,w,2.52,1.6,.09,.14,0,false);cylinder('pendant-lens-'+w,w,2.446,1.6,.078,.008,7,false);}
for(const w of[-2.4,.4]){box('front-light-arm-'+w,w,2.94,-.35,.035,.035,.70,0,false);cylinder('front-light-body-'+w,w,2.85,-.65,.08,.16,0,false);cylinder('front-light-lens-'+w,w,2.766,-.65,.07,.008,7,false);}
await c.save(out,'daruma-frontage.glb',{sourceLayoutSha256:cfg.layoutSha256,geometry:{origin:C,across:A,inward:N,frontWidthM:L,sideDepthM:sideDepth,door,seats:seats.length},scope:'Photo-guided glazed Daruma frontage, usable doorway and visible counter fittings.'});
// Original typesetting. The visitor photographs remain research references only.
const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><rect width="2048" height="1024" fill="#211b16"/><rect width="2048" height="256" fill="#b91e10"/><g font-family="Hiragino Mincho ProN,serif"><g fill="#f3dfb2"><text x="1024" y="194" text-anchor="middle" font-size="166">元祖 博多だるま</text><text x="120" y="438" font-size="65">博多豚骨</text><text x="1010" y="460" text-anchor="middle" font-size="170">博多だるま</text><text x="1690" y="430" font-size="50">昭和38年創業</text></g><rect x="35" y="548" width="1466" height="440" fill="#34312d" stroke="#bea36d" stroke-width="3"/><g fill="#e6d9ba" text-anchor="middle"><text x="768" y="642" font-size="62">昭和の博多を、すする。</text><text x="768" y="752" font-size="47">スープは、呼び戻し</text><text x="768" y="842" font-size="47">麺は、喉越し</text><text x="768" y="932" font-size="47">カエシは、重ねだし</text></g><rect x="1552" y="530" width="480" height="478" fill="#17242a"/><g fill="#eee5d4" text-anchor="middle" font-family="Hiragino Sans,sans-serif"><text x="1792" y="598" font-size="47">食券</text><text x="1792" y="686" font-size="28">博多豚骨ラーメン</text><text x="1792" y="776" font-size="28">旨辛ラーメン</text><text x="1792" y="866" font-size="28">黒マー油ラーメン</text><text x="1792" y="954" font-size="24">元祖博多だるま</text></g></g></svg>`);
await writeFile(out+'/daruma-artwork.svg',svg);const atlas=await sharp(svg).png().toBuffer();await writeFile(out+'/daruma-artwork.png',atlas);
const{json:j,bin}=readGLB(await readFile(out+'/daruma-frontage.glb')),parts=[bin];let offset=bin.length;
const append=data=>{const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length});parts.push(data);offset+=data.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return id;};
function uv(v,f){const basis=f.axis==='w'?A:N,q=(v[0]-C[0])*basis[0]+(v[2]-C[2])*basis[2],center=f.axis==='w'?f.w:f.t,h=v[1]-C[1],[x,y,width,height]=f.rect;return[(x+(.5-(q-center)/f.width)*width)/2048,(y+(.5-(h-f.h)/f.height)*height)/1024];}
const primitive=j.meshes[5].primitives[0],accessor=j.accessors[primitive.attributes.POSITION],view=j.bufferViews[accessor.bufferView],coords=Buffer.alloc(accessor.count*8);assert.equal(accessor.count,printed.length*36);
for(let i=0;i<accessor.count;i++){const v=[0,1,2].map(k=>bin.readFloatLE(view.byteOffset+i*12+k*4)),t=uv(v,printed[Math.floor(i/36)]);coords.writeFloatLE(t[0],i*8);coords.writeFloatLE(t[1],i*8+4);}
primitive.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(coords),componentType:5126,count:accessor.count,type:'VEC2'});j.images=[{bufferView:append(atlas),mimeType:'image/png',name:'Daruma original typesetting'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[5].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;const glb=writeGLB(j,Buffer.concat(parts));
const native=JSON.parse(await readFile(out+'/native-panels.json'));for(const p of native.panels){const f=printed.find(f=>f.id===p.id);if(f)p.uv=p.vertices.map(v=>{const[u,t]=uv([v.x,v.y,-v.z],f);return{x:u,y:1-t};});}native.authoredLights=native.panels.filter(p=>p.id.includes('pendant-lens')||p.id.includes('front-light-lens')).map(p=>({id:'restaurant-practical-'+p.id,position:Object.fromEntries(['x','y','z'].map(k=>[k,p.vertices.reduce((n,v)=>n+v[k],0)/p.vertices.length])),direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.83,b:.62,a:1},intensity:22,range:7,spotAngle:100,innerSpotAngle:50,source:'https://osumituki.com/kyoto-ramen/225895.html',note:'Fixture placement and output are fitted approximations using the dated visitor photo and owner opening references.'}));const nb=Buffer.from(JSON.stringify(native)+'\n');await writeFile(out+'/daruma-frontage.glb',glb);await writeFile(out+'/native-panels.json',nb);
const report=JSON.parse(await readFile(out+'/report.json'));Object.assign(report,{builder:'web/station/realism/build-daruma-frontage.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),reference:{operator:'https://www.kyoto-station-building.co.jp/restaurant_cafe/122/',visit:'https://osumituki.com/kyoto-ramen/225895.html',opening:'https://prtimes.jp/main/html/rd/p/000000008.000131832.html'},texture:{file:'daruma-artwork.png',sha256:sha(atlas),material:mats[5].name},printed,limits:['Dimensions and doorway position are fitted to the schematic map; not surveyed.','Glazing and red sign follow the dated visitor photograph. Counter fittings use opening reference imagery; only eight of eighteen reported seats are suggested.','Original typesetting substitutes for the photographic history mural. Ticket machine is decorative.']});report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.geometry));
