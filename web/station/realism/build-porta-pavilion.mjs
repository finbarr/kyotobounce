// Restore the retained municipal Porta entrance's connection to the mall.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(out+'/spec.json'),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
function mat(name,rgb,r=.6,metal=0){const i=mats.length;mats.push({name:'Porta pavilion | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});return i;}
const stone=mat('stone',[.55,.52,.45],.4),steel=mat('stainless',[.48,.51,.52],.32,.8),wall=mat('tiled wall',[.67,.65,.59]),dark=mat('trim',[.035,.04,.043]),glass=mat('glazing',[.65,.79,.83],.15,.05),tactile=mat('warning',[.7,.48,.04]),light=mat('diffuser',[1,.94,.8]),printed=mat('directions',[1,1,1]);mats[glass].pbrMetallicRoughness.baseColorFactor[3]=.19;mats[glass].alphaMode='BLEND';mats[glass].doubleSided=true;mats[light].emissiveFactor=[1,.94,.8];
const c=construction(mats,{flatNormals:true}),prefix='porta-pavilion-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],L=s.lower,H=s.upper,C=-2.8,O=s.opening;
const slab=(id,poly,y,depth,mi=stone,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=wall,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);slab(id,rect(a,b,d,e),top,top-bottom,mi,role);};
const beam=(id,a,b,w,h,mi=steel,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
const steps=34,first=17,landing=1.6,going=(O.maxZ-O.minZ-landing)/steps,rise=(H-L)/steps,a=O.minZ+first*going,b=a+landing,mid=H-first*rise;
for(let i=0;i<steps;i++){
 const z=O.minZ+i*going+(i>=first?landing:0),y=H-(i+1)*rise;
 box('step-'+i,O.minX,O.maxX,z,z+going,y,L-.25,stone,'stair-tread');box('nosing-'+i,O.minX+.15,O.maxX-.15,z+.005,z+.04,y+.003,y+.0005,dark,'stair-nosing');c.panels.at(-1).collision=false;
}
box('mid-landing',O.minX,O.maxX,a,b,mid,L-.25,stone,'stair-landing');
c.slab(prefix+'upper-sill',[[O.minX,s.frontEdge[0],-s.frontZ],[O.maxX,s.frontEdge[1],-s.frontZ],[O.maxX,H,-O.minZ],[O.minX,H,-O.minZ]],[],.12,stone,'stair-landing');
for(const x of[O.minX-.075,O.maxX+.075])box('well-side-'+x,x-.075,x+.075,O.minZ,O.maxZ,H+1.05,L-.25);
box('rear-spandrel',O.minX,O.maxX,O.maxZ,O.maxZ+.35,H+1.05,C);
// The existing entrance's central post is retained inside the divided stair.
for(const[id,z0,z1,y0,y1]of[['upper',O.minZ,a,H,mid],['landing',a,b,mid,mid],['lower',b,O.maxZ,mid,L]]){
 for(const x of[O.minX+.25,43.15,O.maxX-.25]){
  beam(id+'-rail-'+x,[x,y0+1,z0],[x,y1+1,z1],.05,.05);
  const n=Math.ceil((z1-z0)/1.2);for(let i=0;i<=n;i++){const t=i/n,z=z0+(z1-z0)*t,y=y0+(y1-y0)*t;beam(id+'-post-'+x+'-'+i,[x,y,z],[x,y+.98,z],.045,.045);}
 }
}
// Rebuild the four affected shop bays around the actual entrance core.
function shop(id,a,b,d,e,face){const z=face>0?e:d,back=face>0?d:e,mid=(a+b)/2;box(id+'-back',a,b,back-.06,back+.06,C,L);for(const x of[a,b])box(id+'-side-'+x,x-.06,x+.06,d,e,C,L);
 for(const[x0,x1,side]of[[a,mid-1.1,'left'],[mid+1.1,b,'right']]){box(id+'-glass-'+side,x0,x1,z-.018,z+.018,L+2.7,L+.12,glass,'shop-glazing');box(id+'-sill-'+side,x0,x1,z-.075,z+.075,L+.12,L,steel,'shop-sill');}
 box(id+'-fascia',a,b,z-.12,z+.12,C,L+2.7);for(const x of[a,mid-1.1,mid+1.1,b])box(id+'-post-'+x,x-.045,x+.045,z-.075,z+.075,L+2.7,L,steel,'shop-portal');
 for(const x of[a+1.8,b-1.8])box(id+'-display-'+x,x-.65,x+.65,(d+e)/2-.45,(d+e)/2+.45,L+.8,L,stone,'display');beam(id+'-light',[a+.4,C-.12,z+face*.17],[b-.4,C-.12,z+face*.17],.09,.06,light,'fixture');}
for(const[a,b,id]of[[24,37.2,'west'],[49.3,60,'east']]){shop(id+'-south',a,b,39,44,-1);shop(id+'-north',a,b,44,49,1);}
for(const z of[O.minZ-.5,O.maxZ+.4]){box('warning-'+z,O.minX+.3,O.maxX-.3,z-.18,z+.18,z<O.minZ?H+.003:L+.004,z<O.minZ?H+.001:L+.001,tactile,'tactile');c.panels.at(-1).collision=false;}
const lights=[];for(const[z,y]of [[42.8,-.5],[a+.8,-1.0],[49.7,-2.7]])for(const x of[O.minX+.16,O.maxX-.16]){box('fixture-'+x+'-'+z,x-.06,x+.06,z-.38,z+.38,y+.18,y,light,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+x+'-'+z,position:{x:x<43?x+.22:x-.22,y:y+.05,z},direction:{x:(x<43?.45:-.45)/Math.hypot(1,.45),y:-1/Math.hypot(1,.45),z:0},linearColor:{r:1,g:.94,b:.8},intensity:10,range:10,spotAngle:120,innerSpotAngle:80});}
const faces=[];function sign(id,x,z,y,w,row,back){box(id,x-w/2,x+w/2,z-.025,z+.025,y+.5,y,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,x,z,y,w,h:.5,row,back});}
sign('lower-directions',43.25,52.8,L+2.4,5,0,1);sign('upper-directions',40.5,38.7,H+2.5,4,1,0);
for(const p of c.panels)if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===steel?'steel':p.browserMaterial===glass?'glass':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Pavilion stair to North Street',[...s.forecourtRoute,point(40.5,H,O.minZ),point(40.5,mid,a),point(40.5,mid,b),point(40.5,L,O.maxZ),point(40.5,L,53),point(28,L,53),point(18,L,53)]);
pair('Pavilion eastern stair lane',[point(46,H,38.7),point(46,H,O.minZ),point(46,mid,a),point(46,mid,b),point(46,L,O.maxZ),point(46,L,53),point(63,L,53)]);
pair('Retained west cross passage and lift',[point(18,L,53),point(18,L,42),point(22,L,42),point(18,L,42),point(18,L,35),point(40,L,35)]);
pair('Rebuilt western shop entry',[point(30.6,L,35),point(30.6,L,42)]);
const blocked=[{label:'Pavilion middle landing west wall',start:point(39,mid,(a+b)/2),yaw:-90,axis:'x',limit:37.7,sign:1}];
const report=await c.save(out,'porta-pavilion.glb',{componentPrefix:prefix,sourceCollection:'Porta retained pavilion stair',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Open the retained forecourt pavilion and connect both stair lanes to Porta North Street, rebuilding adjacent shop bays around the core.',geometry:{lower:L,upper:H,opening:O,stair:{steps,first,landing,going,rise,mid,firstEnd:a,secondStart:b},routes,blocked,spawn:routes[0].points[0],retiredIds:s.retiredIds,retiredLights:s.retiredLights,modifiedPaving:s.modifiedPaving},references:['https://www.porta.co.jp/navigation','research/kyoto-station/maps/porta-shopguide-2026.pdf','research/kyoto-station/maps/porta-west-east-evacuation-2024.pdf'],limits:['The retained municipal pavilion fixes the surface entrance. Its exact numbered exit remains unconfirmed. The independent C2 photograph is not used to replace this facade.','The stair, shop bays and mall registration are fitted approximations, not measured as-built dimensions.']});
const labels=[['京都駅前広場','Station Forecourt'],['ポルタ・地下鉄','Porta / Subway'],['','']];let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="768"><rect width="2048" height="768" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries())svg+=`<g transform="translate(1024,${i*256})" fill="#fffbea" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="44">${en}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/pavilion-signs.png',png);const{json:j,bin}=readGLB(await readFile(out+'/porta-pavilion.glb')),parts=[bin];let offset=bin.length;
function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z),row=flat?(side>0?f.row:f.back):2,u=flat?.5-side*(v.x-f.x)/f.w:.5,t=(row+1-(v.y-f.y)/f.h)/3;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Porta pavilion directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/porta-pavilion.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'pavilion-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
