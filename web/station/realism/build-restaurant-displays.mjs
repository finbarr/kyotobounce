// Photo-guided wall cases with original, current-tenant directory artwork.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifestPath,registrationPath,out]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex');assert(out?.startsWith('.local/'));
const config=JSON.parse(await readFile(manifestPath)),r=JSON.parse(await readFile(registrationPath));
const E=r.entryRenderer,A=new T.Vector3(...r.sourceLandingEdgeRenderer[1]).sub(new T.Vector3(...r.sourceLandingEdgeRenderer[0]));A.y=0;A.normalize();const N=new T.Vector3(-A.z,0,A.x);
const names=['祗園らぁ～めん京','UNO RAMEN','麺や虎鉄','元祖博多だるま','ラーメンこがね家','富山ブラック 麺家いろは','ラーメン東大','麺匠たか松','ワンタンメンの満月','中村商店'];
const materials=[{name:'Restaurant directory | charcoal case',pbrMetallicRoughness:{baseColorFactor:[.022,.025,.026,1],metallicFactor:.35,roughnessFactor:.38}},{name:'Restaurant directory | brushed frame',pbrMetallicRoughness:{baseColorFactor:[.16,.17,.16,1],metallicFactor:.75,roughnessFactor:.3}},{name:'Restaurant directory | printed tenant names',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.66}}];
const c=construction(materials,{flatNormals:true}),W=1.35,H=1.65,centers=[2.25,-2.25];
function box(id,w,y,s,width,height,depth,m){const g=new T.BoxGeometry(width,height,depth),p=g.attributes.position;c.add('restaurant-directory-'+id,Array.from({length:p.count},(_,i)=>{const a=w+p.getX(i),b=s+p.getZ(i);return[E[0]+A.x*a+N.x*b,E[1]+y+p.getY(i),E[2]+A.z*a+N.z*b];}),Array.from(g.index.array),m,'wall-directory');c.panels.at(-1).material='steel';c.panels.at(-1).collision=m===0;g.dispose();}
for(const [i,w]of centers.entries()){
 box('case-'+i,w,1.36,-.175,W,H,.16,0);
 for(const sign of [-1,1]){box('vertical-'+i+'-'+sign,w+sign*(W/2-.018),1.36,-.266,.036,H,.026,1);box('horizontal-'+i+'-'+sign,w,1.36+sign*(H/2-.018),-.266,W-.072,.036,.026,1);}
 box('face-'+i,w,1.36,-.26,W-.09,H-.09,.008,2);
}
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><rect width="1536" height="1024" fill="#191c1b"/>';
for(let page=0;page<2;page++){
 const x=page*768;svg+=`<g transform="translate(${x},0)" font-family="Hiragino Sans, sans-serif" fill="#ece6d8"><rect x="0" y="0" width="768" height="142" fill="#ded5bc"/><text x="384" y="69" text-anchor="middle" font-size="47" fill="#292c28">京都拉麺小路</text><text x="384" y="110" text-anchor="middle" font-size="23" fill="#292c28" letter-spacing="5">KYOTO RAMEN KOJI</text>`;
 for(let k=0;k<5;k++){
  const id=page*5+k,y=164+k*155;svg+=`<line x1="34" y1="${y+138}" x2="734" y2="${y+138}" stroke="#55574f"/><circle cx="74" cy="${y+57}" r="28" fill="#b7a176"/><text x="74" y="${y+68}" text-anchor="middle" font-size="30" fill="#191c1b">${id+1}</text><text x="126" y="${y+70}" font-size="${names[id].length>11?34:39}">${names[id]}</text>`;
 }
 svg+='<text x="384" y="989" text-anchor="middle" font-size="21" letter-spacing="4">10F • 店舗案内</text></g>';
}svg+='</svg>';
await c.save(out,'restaurant-displays.glb',{sourceLayoutSha256:config.layoutSha256,geometry:{entryRenderer:E,acrossRenderer:A.toArray(),inwardRenderer:N.toArray(),centers,caseWidthM:W,caseHeightM:H,faceWidthM:W-.09,faceHeightM:H-.09},scope:'Two framed tenant directories beside the restaurant entrance; historical case style with current shop names.'});
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/restaurant-directory.png',png);await writeFile(out+'/restaurant-directory.svg',svg);
const raw=await readFile(out+'/restaurant-displays.glb'),{json:j,bin}=readGLB(raw);const parts=[bin];let offset=bin.length;
function append(b){const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return id;}
const uv=(v)=>{const w=(v[0]-E[0])*A.x+(v[2]-E[2])*A.z,page=w>0?0:1;return[(page+.5-(w-centers[page])/(W-.09))/2,.5-(v[1]-E[1]-1.36)/(H-.09)];};
const primitive=j.meshes[2].primitives[0],a=j.accessors[primitive.attributes.POSITION],v=j.bufferViews[a.bufferView],coords=Buffer.alloc(a.count*8);
for(let i=0;i<a.count;i++){const p=[0,1,2].map(k=>bin.readFloatLE(v.byteOffset+i*12+k*4)),t=uv(p);coords.writeFloatLE(t[0],i*8);coords.writeFloatLE(t[1],i*8+4);}
primitive.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(coords),componentType:5126,count:a.count,type:'VEC2'});
j.images=[{name:'Restaurant directory artwork',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[2].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;
const glb=writeGLB(j,Buffer.concat(parts));const native=JSON.parse(await readFile(out+'/native-panels.json'));for(const p of native.panels)if(p.browserMaterial===2)p.uv=p.vertices.map(v=>{const[u,t]=uv([v.x,v.y,-v.z]);return{x:u,y:1-t};});const nb=Buffer.from(JSON.stringify(native)+'\n');await writeFile(out+'/restaurant-displays.glb',glb);await writeFile(out+'/native-panels.json',nb);
const report=JSON.parse(await readFile(out+'/report.json'));Object.assign(report,{builder:'web/station/realism/build-restaurant-displays.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),reference:{photo:'research/kyoto-station/photos/soulkyoto-20140209kyotostation06_0326.jpg',date:'2014-02-09',operator:'https://www.kyoto-station-building.co.jp/ramen_koji/',checked:'2026-09-28',names},texture:{file:'restaurant-directory.png',sha256:sha(png),material:materials[2].name},limits:['Case placement and dimensions are fitted estimates.','Original directory artwork uses current names; it is not a reproduction of historical menus or current prices.']});report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nb);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,textureBytes:png.length}));
