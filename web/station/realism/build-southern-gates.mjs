// Opposing operator entrances and ticket alcoves in the lower public passage.
import assert from 'node:assert/strict';
import {readFile,writeFile}from'node:fs/promises';
import {createHash}from'node:crypto';
import * as T from 'three';
import sharp from 'sharp';
import {construction}from'./component-mesh.mjs';
import {readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex'),m=JSON.parse(await readFile(manifest)),raw=await readFile(m.layout),l=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(!l.panels.some(p=>p.id==='public-passage-lower-wall-1'));
const floor=3.675,ceiling=7.175,fronts=[{id:'kintetsu',side:-1,x:-69,jp:'近鉄 京都駅',en:'KINTETSU KYOTO',color:'#184b80'},{id:'shinkansen',side:1,x:-57,jp:'新幹線のりば（中央口）',en:'Shinkansen Tracks (Central Entrance)',color:'#d25816'}];
const material=(name,color,roughness=.6,metallic=0)=>({name:'Southern gates | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const mats=[material('pale stone',[.52,.48,.40]),material('charcoal',[.105,.102,.087],.45),material('ceiling',[.65,.66,.63]),material('stainless',[.36,.39,.40],.3,.8),material('dark equipment',[.035,.04,.038],.38,.35),material('yellow tactile',[.7,.47,.045]),{...material('diffuser',[.85,.84,.76]),emissiveFactor:[.85,.84,.76]},material('printed signs',[1,1,1],.65),material('blue gate flap',[.035,.10,.19],.44),material('office glazing',[.09,.17,.20],.2,.35),material('reader indicator',[.08,.50,.19],.5)];
const c=construction(mats,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,a,b,d,e,top,depth,mi=0,role='floor')=>c.slab('southern-gates-'+id,rect(a,b,d,e).map(([x,z])=>P(x,top,z)),[],depth,mi,role);
const box=(id,a,b,d,e,top,bottom,mi=0,role='wall')=>slab(id,Math.min(a,b),Math.max(a,b),Math.min(d,e),Math.max(d,e),top,top-bottom,mi,role);
const lights=[],faces=[];
function column(id,x,z){const g=new T.CylinderGeometry(.40,.40,3.5,24);g.translate(x,floor+1.75,-z);const p=g.attributes.position;c.add('southern-gates-'+id,Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),Array.from(g.index.array),0,'column');g.dispose();}
function light(id,x,z){box(id+'-diffuser',x-.55,x+.55,z-.55,z+.55,ceiling-.02,ceiling-.05,6,'fixture');c.panels.at(-1).collision=false;lights.push({id:'southern-gates-light-'+id,position:{x,y:ceiling-.10,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.82},intensity:11,range:8,spotAngle:120,innerSpotAngle:76,source:'Operator transfer-route photographs; fitted panel lights',note:'Uses the existing two-light pool.'});}
// Atlas faces are closed thin boxes, with UVs on both sides of the board.
function sign(id,x,z,w,h,y,side,row){box(id,x-.018,x+.018,z-w/2,z+w/2,y+h,y,7,'sign');c.panels.at(-1).collision=false;faces.push({id:'southern-gates-'+id,x,z,w,h,y,side,row});}
for(const f of fronts){const {id,side:s,x}=f,outer=x+s*12,gateX=x+s*.8;
 // Restore the side walls outside the two entrance bays. Both public ends stay open.
 for(const [a,b,label]of[[-185,-170,'south'],[-138,-119.04,'north']]){box(id+'-'+label+'-wall',x,x+s*.15,a,b,ceiling,floor);box(id+'-'+label+'-base',x-s*.035,x,a,b,floor+.17,floor,1);}
 // Recessed ticket machines and staffed window lie on the public side of the bank.
 box(id+'-room-floor',x,outer,-170,-138,floor,floor-.38);
 box(id+'-room-ceiling',x,outer,-170,-138,ceiling+.15,ceiling,2,'roof');
 for(const z of[-170,-138])box(id+'-return-'+z,x,outer,z-.075,z+.075,ceiling,floor);
 // Paid areas are a visible receiving room, retained behind the closed gates.
 // Their platform connections are the next structural task; no stairs are implied here.
 box(id+'-rear-wall',outer-s*.15,outer,-170,-138,ceiling,floor);
 for(const [a,b,label]of[[-170,-164.5,'south'],[-143.5,-138,'north']]){
  box(id+'-front-'+label,x+s*2.8,x+s*3.05,a,b,ceiling,floor);
  box(id+'-front-base-'+label,x+s*2.75,x+s*2.8,a,b,floor+.18,floor,1);
 }
 // Ticket bank across a 21 m opening; all lanes are closed physical gates.
 box(id+'-lintel',x-s*.08,x+s*1.8,-164.5,-143.5,ceiling,floor+2.58,2);
 sign(id+'-header',x-s*.10,-154,20.5,.74,floor+2.67,-s,f.id==='kintetsu'?0:1);
 const zs=Array.from({length:11},(_,i)=>-144-i*2);
 for(const [i,z]of zs.entries()){
  box(id+'-cabinet-'+i,gateX-1,gateX+1,z-.24,z+.24,floor+.98,floor+.06,3,'ticket-gate');
  box(id+'-cabinet-top-'+i,gateX-1.01,gateX+1.01,z-.25,z+.25,floor+1.07,floor+.98,4,'ticket-gate');
  box(id+'-reader-'+i,gateX-s*.65-.18,gateX-s*.65+.18,z-.17,z+.17,floor+1.10,floor+1.07,4,'reader');
  box(id+'-indicator-'+i,gateX-s*.82-.025,gateX-s*.82+.025,z-.09,z+.09,floor+1.111,floor+1.10,10,'indicator');c.panels.at(-1).collision=false;
  if(i<zs.length-1){box(id+'-flap-'+i,gateX-.055,gateX+.055,z-1.76,z-.24,floor+.9,floor+.12,8,'closed-gate');}
 }
 // Close side slivers between the cabinets and portal jambs, avoiding accidental bypasses.
 for(const z of[-143.65,-164.35])box(id+'-gate-jamb-'+z,gateX-.08,gateX+.08,z-.15,z+.15,floor+1.1,floor,3,'gate-boundary');
 for(const z of[-143.5,-164.5])column(id+'-portal-column-'+z,x+s*.18,z);
 // Three self-service machines in the northern public recess.
 for(let i=0;i<3;i++){
  const z=-139.0-i*1.15,bodyX=x+s*2.3;
  box(id+'-ticket-machine-'+i,bodyX-s*.38,bodyX+s*.38,z-.46,z+.46,floor+1.72,floor+.02,3,'machine');
  sign(id+'-machine-screen-'+i,bodyX-s*.39,z,.73,.72,floor+.77,-s,2);
  box(id+'-ticket-slot-'+i,bodyX-s*.41,bodyX-s*.395,z-.27,z+.27,floor+.55,floor+.48,4,'machine');
 }
 sign(id+'-tickets',x+s*2.72,-140.7,4.5,.40,floor+2.3,-s,3);
 // Southern staffed window: sill, glazing and vertical divisions.
 box(id+'-office-sill',x+s*2.40,x+s*2.85,-169.5,-165,floor+.94,floor+.83,1);
 box(id+'-office-glass',x+s*2.73,x+s*2.75,-169.5,-165,floor+2.2,floor+.96,9,'glazing');
 for(const z of[-169.5,-167.25,-165])box(id+'-office-mullion-'+z,x+s*2.68,x+s*2.77,z-.03,z+.03,floor+2.24,floor+.94,3,'window-frame');
 sign(id+'-information',x+s*2.69,-167.25,4.5,.4,floor+2.3,-s,4);
 for(const z of[-140.7,-167.2])light(id+'-recess-'+z,x+s*1.15,z);
 for(const z of[-146,-154,-162])light(id+'-paid-'+z,x+s*5,z);
 // Central cross-hall tactile branch stops on the public side of the gates.
 box(id+'-tactile',x-s*.2,gateX-s*.40,-153.22,-152.78,floor+.006,floor,5,'tactile');c.panels.at(-1).collision=false;
}
// New branch from the retained north/south guide strip towards both entrance banks.
box('cross-tactile',-68.8,-57.2,-153.22,-152.78,floor+.009,floor+.006,5,'tactile');c.panels.at(-1).collision=false;
// Ceiling seams and alternating floor squares establish the photographed transfer hall.
for(let x=-68.5,i=0;x<-57;x+=1.5,i++)for(let z=-169,j=0;z<-138;z+=1.5,j++)if((i+j)%4===0){let spans=[[z,z+1.48]];for(const center of[-140,-148,-156,-164])spans=spans.flatMap(([a,b])=>b<=center-.14||a>=center+.14?[[a,b]]:[[a,Math.min(b,center-.14)],[Math.max(a,center+.14),b]].filter(([a,b])=>b-a>.001));for(const [k,[a,b]]of spans.entries()){box('floor-inlay-'+i+'-'+j+'-'+k,x,x+1.48,a,b,floor+.002,floor,1,'floor-inlay');c.panels.at(-1).collision=false;}}
for(const z of[-141,-146,-151,-156,-161,-166]){box('ceiling-seam-'+z,-69,-57,z-.013,z+.013,ceiling-.005,ceiling-.022,3,'ceiling-seam');c.panels.at(-1).collision=false;}
for(const p of c.panels)p.material=[3,4].includes(p.browserMaterial)?'steel':p.browserMaterial===9?'glass':'stone';
const route=(x,z)=>({x,y:floor,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Public hall through both entrance fronts',[route(-65,-135),route(-65,-154),route(-65,-174)]);
for(const f of fronts){const x=f.x-f.side*.15,z=-141;pair(f.id+' ticket-machine recess',[route(-63,z),route(x,z),route(f.x+f.side*1.1,z)]);pair(f.id+' staffed-window recess',[route(-63,-167),route(f.x+f.side*1.1,-167)]);}
const report=await c.save(out,'southern-gates.glb',{builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Opposing Shinkansen and Kintetsu ticket fronts, public recesses and a clear lower transfer hall.',geometry:{floor,ceiling,fronts,routes,closedGates:fronts.map(f=>({id:f.id,from:route(f.x-f.side*1.2,-153),towards:route(f.x+f.side*3,-153),plane:f.x+f.side*.8,side:f.side}))},references:['research/kyoto-station/maps/kintetsu-shinkansen-route-2026.pdf','research/kyoto-station/maps/kintetsu-plan.pdf','research/kyoto-station/maps/jr-central-kyoto-20260420.gif'],limits:['Floor elevations, widths, gate counts and room extents are fitted, not surveyed.','The gates are closed boundaries. Paid concourse connections, platforms and railway above remain the next structural task.','Machine screens and signs are original simplified artwork; no reference photograph is used as a texture.']});
const labels=[['近鉄 京都駅','KINTETSU KYOTO','#174d7e'],['新幹線のりば（中央口）','Shinkansen Tracks (Central Entrance)','#cc510e'],['きっぷ','Tickets','#253d50'],['きっぷうりば','Tickets','#253d50'],['ご案内','Information','#253d50']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><rect width="2048" height="1024" fill="#eeeedd"/>';
for(let i=0;i<labels.length;i++){const[jp,en,color]=labels[i],y=i*200,ratio=i<2?20.5/.74:i===2?.73/.72:4.5/.40,sx=10.24/ratio;
 svg+=`<g font-family="Hiragino Sans, sans-serif" transform="translate(0,${y})"><rect width="2048" height="200" fill="#e7ece7"/><rect width="34" height="200" fill="${color}"/>`;
 if(i===2){svg+='<rect x="90" y="55" width="1868" height="125" fill="#153644"/><rect x="200" y="73" width="730" height="38" fill="#58a7b1"/><rect x="1118" y="73" width="730" height="38" fill="#58a7b1"/><rect x="200" y="125" width="1648" height="36" fill="#d6d4a2"/>';}
 svg+=`<g transform="translate(1024,0) scale(${sx},1)"><text x="0" y="${i===2?25:94}" text-anchor="middle" font-size="${i===2?18:74}" fill="${color}">${jp}</text><text x="0" y="${i===2?44:157}" text-anchor="middle" font-size="${i===2?12:43}" fill="#182629">${en}</text></g></g>`;
}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/southern-gate-signs.png',png);await writeFile(out+'/southern-gate-signs.svg',svg);
const{json:j,bin}=readGLB(await readFile(out+'/southern-gates.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=JSON.parse(await readFile(out+'/native-panels.json')),signPanels=native.panels.filter(p=>p.browserMaterial===7),uv=[];
for(const p of signPanels){const f=faces.find(f=>f.id===p.id);assert(f);p.uv=p.vertices.map(v=>{const u=.5+f.side*(v.z-f.z)/f.w,t=(f.row*200+200*(1-(v.y-f.y)/f.h))/1024;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});
j.images=[{name:'Original station entrance labels',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
native.authoredLights=lights;const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/southern-gates.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'southern-gate-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,lights:lights.length});
