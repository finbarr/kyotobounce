// Original perforated-metal maps on noncolliding, source-shaped underside panels.
import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import sharp from'sharp';
import{construction}from'./component-mesh.mjs';import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[specPath,out]=process.argv.slice(2),sb=await readFile(specPath),s=JSON.parse(sb),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(await readFile(s.parent.path)),s.parent.sha256);
const c=construction([{name:'B1 bank | perforated stainless underside',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],roughnessFactor:1,metallicFactor:1}}],{flatNormals:true}),uvs=[];
for(const p of s.parts){c.add(p.id,p.vertices,p.indices,0,'hall-underside-cladding');const part=c.panels.at(-1);part.collision=false;part.material='metal';uvs.push(...p.indices.flatMap(i=>p.uv[i].map(x=>x/s.material.tileSizeM)));}
const report=await c.save(out,'hall-bank-cladding.glb',{status:'Uninstalled original underside material/detail study; casing and mechanism untouched.',specSha256:sha(sb),source:s.parent,reference:s.reference,assumptions:s.limits,geometry:{physicalPanels:24,sourceTrianglePieces:s.parts.length,offsetM:.003,collision:false}});
let{json:j,bin}=readGLB(await readFile(out+'/hall-bank-cladding.glb'));const chunks=[bin.subarray(0,j.buffers[0].byteLength)];let offset=chunks[0].length;
const append=bytes=>{const pad=Buffer.alloc((4-offset%4)%4);chunks.push(pad);offset+=pad.length;const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;return id;};
const N=512,col=Buffer.alloc(N*N*3),mr=Buffer.alloc(N*N*3),normal=Buffer.alloc(N*N*3),height=new Float32Array(N*N),tile=s.material.tileSizeM,pitch=s.material.perforationPitchM,radius=s.material.holeRadiusM,pixel=tile/N;
let seed=20260928;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};const rowGrain=Array.from({length:N},()=>random()-.5),smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const i=y*N+x,k=i*3,px=(x+.5)*pixel,py=(y+.5)*pixel,dx=((px+pitch/2)%pitch)-pitch/2,dy=((py+pitch/2)%pitch)-pitch/2,d=Math.hypot(dx,dy),hole=1-smooth((d-radius+pixel*.7)/(pixel*1.4)),grain=rowGrain[y]*7+(random()-.5)*2;
 height[i]=-.00055*(1-smooth((d-radius+.001)/.002));
 for(let ch=0;ch<3;ch++)col[k+ch]=Math.round((1-hole)*([160,162,161][ch]+grain)+hole*18);
 mr[k]=255;mr[k+1]=Math.round(((1-hole)*(.35+rowGrain[y]*.06)+hole*.92)*255);mr[k+2]=Math.round((1-hole)*.94*255);
}
for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=(y*N+x)*3,dx=(height[y*N+(x+1)%N]-height[y*N+(x+N-1)%N])/(2*pixel),dy=(height[((y+1)%N)*N+x]-height[((y+N-1)%N)*N+x])/(2*pixel),length=Math.hypot(dx,dy,1);normal[i]=Math.round(127.5-127.5*dx/length);normal[i+1]=Math.round(127.5-127.5*dy/length);normal[i+2]=Math.round(127.5+127.5/length);}
j.images=[];j.textures=[];j.samplers=[{wrapS:10497,wrapT:10497,magFilter:9729,minFilter:9987}];
for(const[name,bytes]of[['base',col],['normal',normal],['metal-rough',mr]]){const png=await sharp(bytes,{raw:{width:N,height:N,channels:3}}).png().toBuffer();await writeFile(out+'/'+name+'.png',png);j.textures.push({sampler:0,source:j.images.length});j.images.push({name,mimeType:'image/png',bufferView:append(png)});}
const mat=j.materials[0];mat.pbrMetallicRoughness.baseColorTexture={index:0};mat.normalTexture={index:1,scale:1};mat.pbrMetallicRoughness.metallicRoughnessTexture={index:2};
const uv=new Float32Array(uvs),primitive=j.meshes[0].primitives[0];assert.equal(uv.length,j.accessors[primitive.attributes.POSITION].count*2);primitive.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(uv.buffer)),componentType:5126,type:'VEC2',count:uv.length/2});
j.buffers[0].byteLength=offset;const result=writeGLB(j,Buffer.concat(chunks));await writeFile(out+'/hall-bank-cladding.glb',result);report.outputs.glbSha256=sha(result);report.outputs.glbBytes=result.length;report.materials={maps:3,resolution:512,estimatedRgbaMipBytes:4*1024*1024,source:'Original deterministic procedural maps; holes represented by albedo/roughness/normal response, no alpha cutout or copied pixels.',tileSizeM:tile,perforationPitchM:pitch,holeRadiusM:radius};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
