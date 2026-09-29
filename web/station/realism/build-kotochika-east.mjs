// Connect the public plaza around the retained lift to Porta East and Central 1's south end.
import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import sharp from'sharp';
import{construction}from'./component-mesh.mjs';import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),s=await read(out+'/spec.json'),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mat=(name,rgb,r=.6,metal=0)=>({name:'Kotochika east connection | '+name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:metal}});
const mats=[mat('stone',[.54,.52,.47],.45),mat('metal',[.45,.47,.48],.32,.8),mat('ivory walls',[.67,.64,.58]),mat('ceiling',[.74,.73,.69]),mat('dark trim',[.055,.05,.045]),mat('tactile',[.7,.48,.04]),{...mat('diffuser',[1,.94,.8]),emissiveFactor:[1,.94,.8]},mat('printed directions',[1,1,1]),mat('blue lining',[.045,.16,.26],.4)];
const prefix='kotochika-east-link-',c=construction(mats,{flatNormals:true}),Y=s.floor,C=s.ceiling,P=(x,y,z)=>[x,y,-z],lights=[],faces=[];
const box=(id,a,b,d,e,top,bottom,mi=2,role='wall')=>{assert(b>a&&e>d&&top>bottom,id);c.slab(prefix+id,[[a,d],[b,d],[b,e],[a,e]].map(([x,z])=>P(x,top,z)),[],top-bottom,mi,role);};
const decal=()=>{c.panels.at(-1).collision=false;};
// Existing deck supplies X162..192; the existing corridor supplies X147..155.5.
box('east-floor',192,198,-52,25.2,Y,Y-.3,0,'public-floor');box('south-link-floor',155.5,162,-52,-48,Y,Y-.3,0,'public-floor');
box('east-ceiling',190,198,-52,25.2,C+.18,C,3,'ceiling');box('south-link-ceiling',155.5,190,-52,-48,C+.18,C,3,'ceiling');
for(const[a,b]of[[163,175.3],[178.7,190]])box('plaza-ceiling-'+a,a,b,2,4,C+.18,C,3,'ceiling');
// Pull the oversized North enclosure back to the staffed gate line. The lift
// peninsula remains enclosed and reachable only through the Central 1 paid hall.
box('north-paid-boundary',165,190,11.925,12.075,C,Y);
box('north-paid-east',189.925,190.075,12,40,C,Y);
box('east-perimeter',197.925,198.075,-52,25.2,C,Y);
for(const[a,b]of[[155.5,163],[190,198]])box('south-link-boundary-'+a,a,b,-52.075,-51.925,C,Y);
// Keep the southern public corridor wall, with a complete 4 m cross-passage at its end.
box('retained-public-wall',155.425,155.575,-77,-52,C,Y);
box('retained-public-base',155.375,155.425,-77,-52,Y+.28,Y,4,'skirting');
box('retained-public-band',155.382,155.418,-77,-52,Y+2.55,Y+2.3,8,'wall-band');
// The eastern mall's existing cross-aisle is clear at X192.2..195.8.
for(const[a,b]of[[190,192.2],[195.8,237]])box('porta-return-'+a,a,b,25.12,25.28,C,Y);
box('porta-header',192.2,195.8,25.12,25.28,C,Y+2.8);
for(const x of[192.2,195.8])box('porta-jamb-'+x,x-.035,x+.035,25.10,25.30,Y+2.8,Y,1,'portal');
// Low-cost readable edges and directions, with no furnishings in the circulation path.
box('east-base',197.86,197.925,-51.8,25.1,Y+.16,Y,4,'skirting');
box('north-boundary-base',165.1,189.9,11.87,11.925,Y+.16,Y,4,'skirting');
function inlay(id,a,b,d,e,mi=5){box(id,a,b,d,e,Y+.004,Y+.001,mi,'floor-inlay');decal();}
inlay('plaza-west-guide',151.25,168,2.8,3.2);inlay('plaza-turn-guide',167.8,168.2,3.2,10.2);inlay('plaza-east-guide',168.2,194,9.8,10.2);
inlay('east-guide',193.8,194.2,-50,35);inlay('south-guide',151.25,193.8,-50.2,-49.8);
inlay('porta-threshold',192.2,195.8,24.7,25.7,4);
function light(id,x,z,width=2){box('fixture-'+id,x-width/2,x+width/2,z-.065,z+.065,C-.06,C-.10,6,'fixture');decal();lights.push({id:prefix+'light-'+id,position:{x,y:C-.17,z},direction:{x:0,y:-1,z:0},linearColor:{r:1,g:.94,b:.8},intensity:11,range:12,spotAngle:120,innerSpotAngle:78});}
for(const z of[-47,-33,-19,-5,9,22])light('east-'+z,194,z);
for(const x of[158,170,184])light('south-'+x,x,-50,1.4);
// Retained North-hall fixtures already illuminate the newly public crossing at Z9.
for(let z=-48;z<25;z+=4){box('east-ceiling-joint-'+z,190.2,197.8,z-.012,z+.012,C,C-.018,1,'ceiling-joint');decal();}
function sign(id,axis,pos,center,w,row,back){if(axis==='z')box(id,center-w/2,center+w/2,pos-.025,pos+.025,Y+3.1,Y+2.6,7,'sign');else box(id,pos-.025,pos+.025,center-w/2,center+w/2,Y+3.1,Y+2.6,7,'sign');decal();faces.push({id:prefix+id,axis,pos,center,w,h:.5,y:Y+2.6,row,back});}
sign('porta-sign','z',24.8,194,3.4,0,1);sign('east-middle-sign','z',-8,194,5,0,1);sign('south-link-sign','x',157,-50,3.4,3,2);sign('plaza-sign','x',168,3,4.4,5,4);
for(const p of c.panels)p.material=p.browserMaterial===1?'steel':'stone';
const point=(x,z)=>({x,y:Y,z}),routes=[];
function pair(label,coords){const ps=coords.map(([x,z])=>point(x,z)),points=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/24);for(let j=1;j<=n;j++)points.push(point(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n));}routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Plaza to Porta East',[[151.25,3],[168,3],[168,10],[194,10],[194,35],[196,52]]);
pair('Eastern bypass and south crossing',[[196,52],[194,35],[194,10],[194,-50],[151.25,-50],[151.25,-41.1]]);
pair('Retained North gate and stair approach',[[151.25,18.9],[168,18.9],[168,14],[185,14],[185,31]]);
pair('Retained Central 1 lift approach',[[151.25,-41.1],[168,-41.1],[168,0],[177,0],[177,3.4]]);
const blocked=[{label:'North paid boundary',contactLedge:prefix+'north-boundary-base',start:point(185,10),yaw:0,axis:'z',limit:11.72,sign:-1},{label:'Lift vestibule west enclosure',start:point(173.8,3),yaw:90,axis:'x',limit:175.05,sign:-1},{label:'Lift shaft rear enclosure',start:point(177,9.2),yaw:180,axis:'z',limit:8.03,sign:1}];
const report=await c.save(out,'kotochika-east.glb',{componentPrefix:prefix,sourceCollection:'Kotochika eastern public loop',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the Kotochika plaza around the retained Central 1 lift to an eastern public bypass, Porta East and the southern public corridor.',geometry:{floor:Y,ceiling:C,routes,blocked,spawn:point(151.25,3),retiredIds:s.retiredIds,retiredLights:[]},references:['https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf','research/kyoto-station/maps/subway-kyoto-plan.pdf'],limits:['The plans establish public circulation around separate paid cores. Dimensions and registration remain fitted approximations.','Exit 5 registration, northern street exits and eastern retail rooms need further reconstruction.']});
const labels=[['ポルタ 東エリア','Porta / East Area'],['中央1・中央2改札','Central 1 / Central 2 Gates'],['地下鉄・八条口方面','Subway / Hachijo'],['ポルタ 東エリア','Porta / East Area'],['コトチカ広場・西エリア','Kotochika Plaza / West Area'],['ポルタ 東エリア','Porta / East Area'],['','']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1792"><rect width="2048" height="1792" fill="#292326"/>';
for(const[i,[jp,en]]of labels.entries()){const f=faces.find(f=>f.row===i||f.back===i)||faces[0],sx=8/(f.w/f.h);svg+=`<g transform="translate(1024,${i*256}) scale(${sx},1)" fill="#fff9e9" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="70">${jp}</text><text y="190" font-size="44">${en}</text></g>`;}svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/east-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/kotochika-east.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===7)){const f=faces.find(f=>f.id===p.id);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q[f.axis]-v[f.axis])<1e-7),side=Math.sign(v[f.axis]-f.pos),row=flat?(side<0?f.row:f.back):6,u=row===6?.5:.5+(f.axis==='z'?-side:side)*(v[f.axis==='z'?'x':'z']-f.center)/f.w,t=(row+1-(v.y-f.y)/f.h)/7;uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[7].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Kotochika east directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[7].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const bytes=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',bytes);await writeFile(out+'/kotochika-east.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(bytes);report.texture={file:'east-signs.png',sha256:sha(png),material:mats[7].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lights:lights.length});
