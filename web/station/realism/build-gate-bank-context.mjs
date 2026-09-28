// Original signage/support geometry for the photographed split barrier bank.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import*as T from'three';import sharp from'sharp';
import{construction}from'./component-mesh.mjs';import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[specPath,out]=process.argv.slice(2),sb=await readFile(specPath),s=JSON.parse(sb),sha=b=>createHash('sha256').update(b).digest('hex');await mkdir(out,{recursive:false});
const material=(name,c,r=.5,m=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...c,1],roughnessFactor:r,metallicFactor:m}});
const materials=[material('gate-bank-steel',[.42,.46,.47],.35,.85),material('gate-bank-black',[.02,.024,.025]),{...material('gate-bank-glass',[.32,.46,.49],.15),alphaMode:'BLEND',doubleSided:true},material('gate-bank-display',[1,1,1],.55)];materials[2].pbrMetallicRoughness.baseColorFactor[3]=.27;
const c=construction(materials,{flatNormals:true}),uv=[];const frame=new T.Matrix4().set(1,0,0,0,0,1,0,0,s.stationFrame.slope,0,1,s.stationFrame.frontZ,0,0,0,1);
function emit(id,g,m,collision=true,physical='steel',rect=null,bounds=null){const p=g.attributes.position,ix=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i);if(rect){assert(m===3&&bounds);for(const i of ix)uv.push((rect[0]+(bounds[1]-p.getX(i))/(bounds[1]-bounds[0])*rect[2])/2048,(rect[1]+(bounds[3]-p.getY(i))/(bounds[3]-bounds[2])*rect[3])/512);}g.applyMatrix4(frame);const a=g.attributes.position;c.add(id,Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)]),ix,m,'gate-bank-context');const row=c.panels.at(-1);row.collision=collision;row.material=physical;g.dispose();}
function box(id,center,size,m,collision=true,physical='steel',rect=null){const g=new T.BoxGeometry(...size);g.translate(...center);emit(id,g,m,collision,physical,rect,rect?[center[0]-size[0]/2,center[0]+size[0]/2,center[1]-size[1]/2,center[1]+size[1]/2]:null);}
function rod(id,a,b,r){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,A.distanceTo(B),12);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());emit(id,g,0,true,'steel');}
const L=s.portal.westX,R=s.portal.eastX,d=s.stationFrame.depthM;
// Four splayed members echo the photographed supports. Their sizes and locations
// remain provisional and deliberately separate from the measured portal bounds.
for(const[i,x]of[L+1.4,L+5.8,R-5.8,R-1.4].entries()){
 const z=s.bridge.rearDepthM-.15,split=s.bridge.floorY-2.4,top=s.bridge.floorY-.12;
 rod('gate-bank-support-'+i+'-stem',[x,.08,z],[x,split,z],.0475);
 for(const side of[-1,1])rod('gate-bank-support-'+i+'-branch-'+side,[x,split,z],[x+side*.42,top,z],.036);
 box('gate-bank-support-'+i+'-base',[x,.04,z],[.22,.08,.22],0);
 rod('gate-bank-sign-hanger-'+i,[x,4.95,z],[x,4.95,d-.30],.025);
}
const span=R-L-1.1,left=L+.55,boardWidth=span/8;
box('gate-bank-board-rail',[(L+R)/2,4.95,d-.30],[span+.35,.11,.12],0);
for(let i=0;i<8;i++){
 const x=left+(i+.5)*boardWidth;
 box('gate-bank-departure-'+i+'-body',[x,4.28,d-.3],[boardWidth-.022,1.18,.13],1);
 box('gate-bank-departure-'+i+'-display',[x,4.28,d-.368],[boardWidth-.085,1.10,.003],3,false,'plastic',[(7-i)*256,0,256,256]);
}
// Two central notice panels and three at the west end are visible in the2022 view.
function notice(id,x,width,rect,offset=0){
 const nd=d+offset;
 box(id+'-body',[x,1.16,nd-.64],[width,1.90,.12],1);
 box(id+'-face',[x,1.16,nd-.702],[width-.07,1.80,.003],3,false,'plastic',rect);
 for(const side of[-1,1]){box(id+'-edge-'+side,[x+side*width/2,1.15,nd-.64],[.035,1.95,.14],0);box(id+'-foot-'+side,[x+side*(width/2-.10),.035,nd-.64],[.12,.07,.65],0);}
}
for(let i=0;i<2;i++)notice('gate-bank-center-notice-'+i,s.notice.westX+(i+.5)*(s.notice.eastX-s.notice.westX)/2,(s.notice.eastX-s.notice.westX)/2,[(1-i)*256,256,256,256],s.centralNoticeSetbackM||0);
// Low side guards close the bank ends. Their span is provisional pending office registration.
for(const[name,a,b]of[['west',L,s.bankWestX],['east',s.bankEastX,R]]){
 box('gate-bank-'+name+'-guard',[(a+b)/2,.58,d-.39],[b-a,.001+1.16,.026],2,true,'glass');
 box('gate-bank-'+name+'-rail',[(a+b)/2,1.18,d-.39],[b-a,.045,.055],0);
 for(const[i,x]of[a,b].entries())box('gate-bank-'+name+'-post-'+i,[x,.61,d-.39],[.065,1.22,.065],0);
}
for(let i=0;i<3;i++)notice('gate-bank-west-notice-'+i,s.bankWestX-.62-i*.78,.72,[(i+2)*256,256,256,256]);
const report=await c.save(out,'gate-bank-context.glb',{status:'Photo-guided notices, departure-board arrangement and splayed supports. Exact dimensions and office interfaces remain provisional.',specSha256:sha(sb),assumptions:s.assumptions,geometry:{supports:4,departurePanels:8,centralNotices:2,westNotices:3}});
// Original static display artwork: bilingual line headings, no copied photograph
// pixels or fabricated live departure times. The layout is illustrative, not archival signage.
const headings=[['嵯峨野線','Sagano Line','#9562bb'],['特急','Limited Express','#498ad4'],['琵琶湖線','Biwako Line','#4f8ccc'],['JR京都線','JR Kyoto Line','#4f8ccc'],['湖西線','Kosei Line','#51a5ce'],['奈良線','Nara Line','#b1844b'],['空港方面','Airport Access','#548cbd'],['ご案内','Information','#748a91']];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="512"><rect width="2048" height="512" fill="#13191d"/><g font-family="Hiragino Sans,Arial,sans-serif">';
for(const[i,[jp,en,color]]of headings.entries()){const x=i*256;svg+=`<rect x="${x+12}" y="15" width="18" height="31" fill="${color}"/><text x="${x+38}" y="36" fill="#eaf3ee" font-size="21">${jp}</text><text x="${x+13}" y="65" fill="#c4d5da" font-size="15">${en}</text><path d="M${x+12} 82h232" stroke="#45555c"/><text x="${x+13}" y="117" fill="#d4ddd7" font-size="21">JR 線のりば</text><text x="${x+13}" y="148" fill="#9bb0b7" font-size="16">JR Lines</text><text x="${x+13}" y="194" fill="#d4ddd7" font-size="23">京都駅</text><text x="${x+13}" y="224" fill="#9bb0b7" font-size="16">Kyoto Station</text>`;}
const notices=[['中央口','Central Gate','#e2c333'],['ご案内','Information','#d8e4e7'],['きっぷ','Tickets','#d8e4e7'],['ご案内','Information','#d8e4e7'],['JR 線','JR Lines','#d8e4e7']];
for(const[i,[jp,en,color]]of notices.entries()){const x=i*256;svg+=`<rect x="${x+8}" y="264" width="240" height="240" fill="${color}"/><text x="${x+128}" y="327" text-anchor="middle" fill="#193039" font-size="32">${jp}</text><text x="${x+128}" y="360" text-anchor="middle" fill="#193039" font-size="20">${en}</text><text x="${x+128}" y="424" text-anchor="middle" fill="#193039" font-size="25">京都駅</text><text x="${x+128}" y="459" text-anchor="middle" fill="#193039" font-size="17">Kyoto Station</text>`;}
svg+='</g></svg>';await writeFile(out+'/display-atlas.svg',svg);const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/display-atlas.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/gate-bank-context.glb')),parts=[bin.subarray(0,j.buffers[0].byteLength)];let offset=parts[0].length;
function append(b){const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;const index=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;return index;}
j.images=[{name:'original-gate-display-atlas',mimeType:'image/png',bufferView:append(png)}];j.samplers=[{wrapS:33071,wrapT:33071,magFilter:9729,minFilter:9987}];j.textures=[{source:0,sampler:0}];j.materials[3].pbrMetallicRoughness.baseColorTexture={index:0};
const values=new Float32Array(uv),p=j.meshes[3].primitives[0];assert.equal(values.length,j.accessors[p.attributes.POSITION].count*2);p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(values.buffer)),componentType:5126,type:'VEC2',count:values.length/2});j.buffers[0].byteLength=offset;
const final=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/gate-bank-context.glb',final);report.outputs.glbSha256=sha(final);report.display={originalAtlas:[2048,512],staticHeadings:true,liveTimetable:false,photographicPixels:false};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.geometry));
