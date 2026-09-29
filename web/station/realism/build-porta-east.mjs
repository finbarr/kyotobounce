// Connect the public North-gate hall and west Porta aisles to the east area.
import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import sharp from 'sharp';
import{construction}from'./component-mesh.mjs';
import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw),spec=await read(specPath);assert.equal(sha(raw),m.layoutSha256);assert(spec.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,rgb,r=.6,metal=0)=>({name:'Porta connection | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('pale stone',[.60,.57,.49],.4),mat('stainless',[.48,.51,.52],.32,.8),{...mat('glass',[.65,.79,.83]),pbrMetallicRoughness:{baseColorFactor:[.65,.79,.83,.19],roughnessFactor:.15,metallicFactor:.05},alphaMode:'BLEND',doubleSided:true},mat('dark trim',[.035,.04,.043]),mat('warm wall',[.64,.61,.52]),mat('ceiling',[.75,.73,.66]),mat('tactile',[.70,.48,.04]),{...mat('diffuser',[1,.94,.8]),emissiveFactor:[1,.94,.8]},mat('shop fitout',[.36,.23,.13]),{...mat('east signs',[1,1,1]),name:'Porta east | printed signs'},{...mat('stone bands',[.26,.22,.18],.45),name:'Porta plaza | stone bands'}];
const prefix='porta-east-',c=construction(mats,{flatNormals:true}),Y=spec.floor,C=spec.ceiling,P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi=0,role='floor')=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=4,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=1,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
// Open the retained North Street endpoint and continue the public hall north.
for(const[a,b]of[[32,49.2],[54.8,61]])box('west-return-'+a,136.92,137.08,a,b,C,Y);
for(const[a,b]of[[144,147],[155.5,158]])box('public-north-return-'+a,a,b,32,32.15,C,Y);
box('public-extension-floor',147,155.5,32,49.2,Y,Y-.3,0,'public-floor');
box('public-extension-ceiling',147,155.5,32,49.2,C+.18,C,5,'ceiling');
for(const x of[147,155.5])box('public-extension-wall-'+x,x-.075,x+.075,32,49.2,C,Y);
box('north-link-floor',137,162,49.2,54.8,Y,Y-.3,0,'public-floor');
// X162..192 is the retained deck; no duplicate coplanar slab is added there.
box('north-link-ceiling',137,192,49.2,54.8,C+.18,C,5,'ceiling');
box('north-link-north',137,192,54.8,54.95,C,Y);
for(const[a,b]of[[137,147],[155.5,192]])box('north-link-south-'+a,a,b,49.05,49.2,C,Y);
// A complete east-area loop with shop enclosures and level thresholds.
box('east-floor',192,237,25.2,65,Y,Y-.3,0,'public-floor');
box('east-ceiling',192,237,25.2,65,C+.18,C,5,'ceiling');
box('east-wall',236.92,237.08,25.2,65,C,Y);
for(const z of[25.2,65])box('east-end-'+z,192,237,z-.08,z+.08,C,Y);
for(const[a,b]of[[25.2,49.2],[54.8,65]])box('east-west-'+a,191.92,192.08,a,b,C,Y);
function shop(id,a,b,d,e,face){
 const z=face>0?e:d,back=face>0?d:e,mid=(a+b)/2;
 box(id+'-back',a,b,back-.06,back+.06,C,Y);
 for(const x of[a,b])box(id+'-side-'+x,x-.06,x+.06,d,e,C,Y);
 for(const[x0,x1,k]of[[a,mid-1.1,'left'],[mid+1.1,b,'right']]){box(id+'-glass-'+k,x0,x1,z-.018,z+.018,Y+2.7,Y+.12,2,'shop-glazing');box(id+'-sill-'+k,x0,x1,z-.075,z+.075,Y+.12,Y,1,'shop-sill');}
 box(id+'-fascia',a,b,z-.12,z+.12,C,Y+2.7,4,'shop-fascia');
 for(const x of[a,mid-1.1,mid+1.1,b])box(id+'-post-'+x,x-.045,x+.045,z-.075,z+.075,Y+2.7,Y,1,'shop-portal');
 for(const x of[a+1.65,b-1.65]){box(id+'-counter-'+x,x-.65,x+.65,(d+e)/2-.45,(d+e)/2+.45,Y+.80,Y,8,'counter');box(id+'-counter-top-'+x,x-.68,x+.68,(d+e)/2-.48,(d+e)/2+.48,Y+.86,Y+.80,0,'counter-top');}
 beam(id+'-front-light',[a+.25,C-.12,z+face*.17],[b-.25,C-.12,z+face*.17],.09,.06,7,'shop-light');
}
for(const[a,b]of[[192.08,206],[206,220],[220,236.92]])shop('north-shop-'+a,a,b,56,64.92,-1);
for(const[a,b]of[[196,210],[210,224]])shop('south-shop-'+a,a,b,25.28,31,1);
for(const[a,b]of[[199,210],[214,224]]){shop('island-south-'+a,a,b,39,43,-1);shop('island-north-'+a,a,b,43,47,1);}
// East restaurant strip opens onto both aisles, with a connecting public bypass.
shop('east-dining-south',228,236.92,25.28,31,1);shop('east-dining-north',228,236.92,39,47,1);
function inlay(id,a,b,d,e,mi=10){box(id,a,b,d,e,Y+(mi===6?.007:.003),Y+.0005,mi,'floor-inlay');c.panels.at(-1).collision=false;}
for(const[z0,z1]of[[31.3,38.7],[49.3,54.7]]){
 for(let x=194;x<236;x+=4)inlay('band-'+z0+'-'+x,x,x+.5,z0,z1);
 for(let x=194;x<236;x+=2)inlay('joint-'+z0+'-'+x,x-.006,x+.006,z0,z1,3);
 for(let z=z0+1.7;z<z1;z+=2)inlay('joint-z-'+z,192.15,236.85,z-.006,z+.006,3);
}
for(let x=139;x<192;x+=4)inlay('link-band-'+x,x,x+.5,49.4,54.6);
inlay('west-east-guide',136.8,231,51.8,52.2,6);inlay('public-guide',151.05,151.45,31.9,51.8,6);inlay('east-cross-guide',195.8,196.2,34.8,51.8,6);inlay('south-guide',196.2,231,34.8,35.2,6);
const lights=[];
function light(id,x,z,width=2.4){box('fixture-'+id,x-width/2,x+width/2,z-.055,z+.055,C-.08,C-.12,7,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+id,position:{x,y:C-.19,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:12,range:12,spotAngle:120,innerSpotAngle:78,source:'Fitted public-route fixtures guided by Porta operator photographs',note:'Uses the existing two-light pool.'});}
for(const z of[35,52])for(let x=196;x<237;x+=10)light(x+'-'+z,x,z);
for(let x=142;x<192;x+=10)light('link-'+x,x,52);
for(const z of[36,44])light('public-'+z,151.25,z);
for(const x of[196,226])light('cross-'+x,x,43);
for(const z of[35,52])for(let x=197;x<235;x+=8){box('recess-'+x+'-'+z,x,x+5,z-1.1,z+1.1,C-.005,C-.035,3,'ceiling-recess');for(let a=x+.25;a<x+5;a+=.5)box('grille-'+a+'-'+z,a-.012,a+.012,z-1.1,z+1.1,C-.035,C-.06,1,'ceiling-grille');}
const faces=[];
function sign(id,x,z,width,row,back){box(id,x-.025,x+.025,z-width/2,z+width/2,Y+3.0,Y+2.5,9,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,x,z,width,row,back});}
sign('west-junction-sign',138,52,5,0,1);sign('east-arrival-sign',193,52,5,0,1);sign('east-dining-sign',224.5,52,5,2,1);
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':p.browserMaterial===2?'glass':'stone';
const point=(x,z,y=Y)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('North public hall to East Porta',[point(151.25,28),point(151.25,52),point(176,52),point(201,52),point(231,52)]);
pair('West North Street to public junction',[point(128,52),point(151.25,52)]);
pair('East Porta public loop',[point(196,52),point(196,35),point(212,35),point(226,35),point(226,52),point(212,52),point(212,35)]);
pair('North restaurant entrance',[point(213,52),point(213,61)]);
pair('South retail entrance',[point(217,35),point(217,28)]);
pair('Retained North subway gate',[point(151.25,18.9),point(164,18.9),point(168,18.9)]);
for(const r of routes)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],distance=Math.hypot(b.x-a.x,b.z-a.z);if(distance>27){const n=Math.ceil(distance/26);r.points.splice(i,0,...Array.from({length:n-1},(_,k)=>({x:a.x+(b.x-a.x)*(k+1)/n,y:a.y,z:a.z+(b.z-a.z)*(k+1)/n})));i+=n-1;}}
const blocked=[{label:'Public link remains outside paid concourse',start:point(177,52),yaw:180,axis:'z',limit:49.35,sign:1}];
const report=await c.save(out,'porta-east.glb',{componentPrefix:prefix,sourceCollection:'Porta East public connection',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the North subway public hall and West North Street to a complete East Porta aisle loop with open shop enclosures.',geometry:{routes,blocked,spawn:point(195,52),retiredIds:spec.retiredIds,retiredLights:[],reusedDeck:spec.reusedDeck,floor:Y,ceiling:C},references:['research/kyoto-station/maps/porta-shopguide-2026.pdf','research/kyoto-station/maps/floor-b1.svg','https://www.porta.co.jp/navigation'],limits:['Dimensions, shop divisions and finishes are fitted approximations; the official diagrams establish circulation, not surveyed measurements.','Street-exit stairs, onward lifts, Kotochika fitout and tenant-specific east-area shop interiors remain unfinished.']});
const labels=[['ポルタ 東エリア →','Porta / East Area →'],['← 西エリア・地下鉄','← West Area / Subway'],['ポルタダイニング','Porta Dining'],['','']];let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><rect width="2048" height="1024" fill="#292622"/>';
for(const[i,[jp,en]]of labels.entries())svg+=`<g transform="translate(0,${i*256})" font-family="Hiragino Sans,sans-serif" fill="#fffbea"><text x="1024" y="115" text-anchor="middle" font-size="72">${jp}</text><text x="1024" y="190" text-anchor="middle" font-size="46">${en}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/porta-east-signs.png',png);await writeFile(out+'/porta-east-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/porta-east.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===9)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.x-v.x)<1e-7),side=Math.sign(v.x-f.x),row=flat?(side<0?f.row:f.back):3,u=row===3?.5:.5+side*(v.z-f.z)/f.width,t=(row*256+256*(1-(v.y-Y-2.5)/.5))/1024;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[9].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original East Porta directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[9].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/porta-east.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'porta-east-signs.png',sha256:sha(png),material:mats[9].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
