// Original stepped stone seat geometry and deterministic, metre-scaled granite maps.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [courtDir,out,specPath,niwaDir]=process.argv.slice(2);assert(courtDir&&out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),courtBytes=await readFile(courtDir+'/report.json'),court=JSON.parse(courtBytes),g=court.geometry;
assert.equal(court.outputs.nativePanelsSha256,sha(await readFile(courtDir+'/native-panels.json')));
const specBytes=specPath?await readFile(specPath):null,spec=specBytes?JSON.parse(specBytes):null;if(spec)assert.equal(spec.courtNativeSha256,court.outputs.nativePanelsSha256);else assert.equal(court.outputs.nativePanelsSha256,'77358142c6f6c5b096637ea3300d3d99cf4ae2b53997b0740292392a06b14f6b');
const material={name:'east-court-warm-granite',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1},extras:{authorship:'Original deterministic mineral-grain synthesis; no source photo pixels.',textureTileMetres:.6}};
const c=construction([material]),placements=spec?.placements||[{id:'south',u:33,v:29.7,rotation:0},{id:'east',u:42.5,v:23,rotation:90}],tiers=spec?.tiers||[{id:'base',polygon:[[-2.6,-.95],[2.6,-.95],[2.6,1.6],[1.1,1.6],[1.1,.65],[-2.6,.65]],bottom:0,height:.17},{id:'seat',polygon:[[-2.25,-.7],[1.8,-.7],[1.8,.4],[-2.25,.4]],bottom:.17,height:.27},{id:'back',polygon:[[-1.9,-.7],[.9,-.7],[.9,-.15],[-1.9,-.15]],bottom:.44,height:.38}];
for(const place of placements)for(const tier of tiers){
 const shape=new T.Shape(tier.polygon.map(([x,z])=>new T.Vector2(x,-z))),bevel=spec?.bevelM??.012;
 const mesh=new T.ExtrudeGeometry(shape,{depth:tier.height-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:1});
 const p=mesh.attributes.position,angle=place.rotation*Math.PI/180,vertices=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i),u=place.u+x*Math.cos(angle)-z*Math.sin(angle),v=place.v+x*Math.sin(angle)+z*Math.cos(angle);vertices.push([g.originRenderer[0]+g.forwardRenderer[0]*u+g.southRenderer[0]*v,g.gardenY+tier.bottom+bevel+p.getZ(i),g.originRenderer[2]+g.forwardRenderer[2]*u+g.southRenderer[2]*v]);}
 // Extrusion x,-z orientation and vertical axis preserve handedness.
 const indices=mesh.index?Array.from(mesh.index.array):Array.from({length:p.count},(_,i)=>i);
 c.add(`east-court-seat-${place.id}-${tier.id}`,vertices,indices,0,'stone-seat-floor');mesh.dispose();
}
// A provisional five-riser stone core closes the photographed terrace interval.
// Detailed stepped seating outlines still need registration; this is its access core.
let terraceCore=null;
if(niwaDir){
 const niwa=JSON.parse(await readFile(niwaDir+'/report.json')),nativeBytes=await readFile(niwaDir+'/native-panels.json'),native=JSON.parse(nativeBytes);assert.equal(sha(nativeBytes),niwa.outputs.nativePanelsSha256);assert.equal(court.niwaInterface.niwaGlbSha256,niwa.outputs.glbSha256);assert.equal(g.gardenY,niwa.geometry.lowerY);
 const O=g.originRenderer,D=g.forwardRenderer,A=g.southRenderer,P=(u,y,v)=>[O[0]+D[0]*u+A[0]*v,y,O[2]+D[2]*u+A[2]*v],walkway=native.panels.find(p=>p.id==='niwa-lower-walkway');assert(walkway);
 const lower=g.gardenY,upper=niwa.geometry.landingY,glassU=niwa.geometry.glassU,landingDepthM=1.2,u1=glassU-landingDepthM,u0=u1-1.56,v0=niwa.geometry.glassStartV,v1=niwa.geometry.endV,risers=5,going=(u1-u0)/risers,rise=(upper-lower)/risers;assert(going>.28&&rise>0&&rise<.18);
 for(let i=0;i<risers;i++){const top=lower+(i+1)*rise,bottom=lower-.18,u=u0+(i+.5)*going;c.beam('east-court-niwa-terrace-core-'+i,P(u,(top+bottom)/2,v0),P(u,(top+bottom)/2,v1),going,top-bottom,0,'stone-terrace-floor');}
 c.beam('east-court-niwa-terrace-landing',P((u1+glassU)/2,upper-.11,v0),P((u1+glassU)/2,upper-.11,v1),landingDepthM,.22,0,'stone-terrace-floor');
 terraceCore={niwaGlbSha256:niwa.outputs.glbSha256,niwaNativeSha256:niwa.outputs.nativePanelsSha256,u:[u0,u1],landingU:[u1,glassU],landingDepthM,v:[v0,v1],lowerY:lower,upperY:upper,risers,goingM:going,riseM:rise,status:'Provisional uniform access core. The photographed sculpted terrace and furniture are unfinished; five risers and exact boundary remain hypotheses.'};
}
const report=await c.save(out,'east-court-seats.glb',{status:spec?.status||'Original stone-seat construction. Shape, count and placement provisional; reference is post-renewal September 2025 photograph.',courtReportSha256:sha(courtBytes),geometry:{placements,tiers,terraceCore,bevelM:spec?.bevelM??.012},...(spec?{reconstructionSpec:{path:specPath,sha256:sha(specBytes),cameraFitSha256:spec.cameraFitSha256,method:spec.method,assumptions:spec.assumptions}}:{}),references:['research/kyoto-station/photos/niwa-jr-02a.jpg','https://souda-kyoto.jp/blog/01367.html'],limits:spec?.assumptions||['The current photograph establishes stepped warm stone seats; dimensions and two placements are inferred within the provisional garden.','Café furniture, timber frontage, planting, artwork and current terrace arrangement remain to be reconstructed.','This component is not installed in the game and has no final visual or full-game performance acceptance.']});
// Derive independent surface coordinates in metres, without changing position/index buffers.
const input=await readFile(out+'/east-court-seats.glb'),{json:j,bin}=readGLB(input),parts=[bin.subarray(0,j.buffers[0].byteLength)];let offset=parts[0].length;
const append=(bytes,target)=>{const pad=(4-offset%4)%4;if(pad){parts.push(Buffer.alloc(pad));offset+=pad;}const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...(target?{target}:{})});parts.push(bytes);offset+=bytes.length;return id;};
for(const mesh of j.meshes)for(const p of mesh.primitives){const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],norm=j.accessors[p.attributes.NORMAL],nv=j.bufferViews[norm.bufferView],uv=new Float32Array(a.count*2);
 for(let i=0;i<a.count;i++){const xyz=[0,1,2].map(k=>bin.readFloatLE(v.byteOffset+i*12+k*4)),n=[0,1,2].map(k=>bin.readFloatLE(nv.byteOffset+i*12+k*4)),k=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));let pair=k===1?[xyz[0],xyz[2]]:k===0?[xyz[2],xyz[1]]:[xyz[0],xyz[1]];uv[i*2]=pair[0]/.6;uv[i*2+1]=pair[1]/.6;}
 const view=append(Buffer.from(uv.buffer),34962);p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:view,componentType:5126,count:a.count,type:'VEC2'});
}
const N=512,height=new Float32Array(N*N),tone=new Float32Array(N*N);let seed=0x4b59544f;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
for(let i=0;i<N*N;i++){tone[i]=(random()-.5)*.10;height[i]=(random()-.5)*.00006;}
for(let i=0;i<19000;i++){const x=Math.floor(random()*N),y=Math.floor(random()*N),radius=.55+random()*1.5,dark=random()<.37,delta=dark?-.18-random()*.15:.04+random()*.13,relief=(random()-.5)*.00022;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const distance=Math.hypot(dx,dy);if(distance>radius)continue;const at=((y+dy+N)%N)*N+(x+dx+N)%N,w=1-distance/(radius+.3);tone[at]+=delta*w;height[at]+=relief*w;}}
const color=Buffer.alloc(N*N*3),rough=Buffer.alloc(N*N*3),normal=Buffer.alloc(N*N*3),clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,t=tone[i];for(let k=0;k<3;k++)color[i*3+k]=clamp(([.67,.61,.50][k]+t)*255);rough[i*3]=255;rough[i*3+1]=clamp((.65+Math.abs(t)*.55)*255);rough[i*3+2]=0;const dx=(height[y*N+(x+1)%N]-height[y*N+(x+N-1)%N])/(2*.6/N),dy=(height[((y+1)%N)*N+x]-height[((y+N-1)%N)*N+x])/(2*.6/N),length=Math.hypot(dx,dy,1);normal[i*3]=clamp((-.5*dx/length+.5)*255);normal[i*3+1]=clamp((-.5*dy/length+.5)*255);normal[i*3+2]=clamp((.5/length+.5)*255);}
j.images=[];j.textures=[];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];const textureReceipts=[];
for(const [name,data]of [['base-color',color],['roughness-metallic',rough],['normal',normal]]){const png=await sharp(data,{raw:{width:N,height:N,channels:3}}).png().toBuffer();const view=append(png);j.images.push({name:'original-granite-'+name,bufferView:view,mimeType:'image/png'});j.textures.push({sampler:0,source:j.images.length-1});await writeFile(out+'/'+name+'.png',png);textureReceipts.push({name,width:N,height:N,bytes:png.length,sha256:sha(png)});}
j.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};j.materials[0].pbrMetallicRoughness.metallicRoughnessTexture={index:1};j.materials[0].normalTexture={index:2,scale:.65};j.buffers[0].byteLength=offset;
const glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/east-court-seats.glb',glb);report.outputs.glbSha256=sha(glb);report.textures={method:'Seeded original mineral grains, periodic boundaries, metre-scaled UVs; no photographic input.',seed:'0x4b59544f',tileMetres:.6,decodedRgba8WithMipEstimateBytes:N*N*4*3*4/3,maps:textureReceipts};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({geometry:report.geometry,outputs:report.outputs,textures:report.textures},null,2));
