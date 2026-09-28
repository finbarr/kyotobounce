// Original terrace, furniture and foliage; source photos guide dimensions only.
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import{resolve}from'node:path';
import * as T from'three';
import{construction}from'./component-mesh.mjs';import{readGLB,writeGLB}from'../../../tools/optimize-browser-assets.mjs';
const[specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));const sb=await readFile(specPath),s=JSON.parse(sb),sha=b=>createHash('sha256').update(b).digest('hex');
const warm=readGLB(await readFile('.local/station-realism/east-court-seats-06/east-court-seats.glb'));
const plain=(name,color,roughness,metal=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metal}});
const mats=[structuredClone(warm.json.materials[0]),plain('court-dining-metal',[.014,.019,.017],.58,.18),plain('court-umbrella-canvas',[.78,.77,.66],.94),plain('court-tree-bark',[.14,.088,.047],.97),plain('niwa-planter-concrete',[.72,.73,.69],.9),plain('niwa-white-gravel',[.8,.8,.75],.96),plain('court-leaf-deep',[.048,.12,.027],.69),plain('court-leaf-green',[.10,.21,.045],.64),plain('court-leaf-light',[.19,.30,.071],.64),plain('court-leaf-russet',[.25,.074,.035],.7)];
const c=construction(mats),F=s.frame,O=F.origin,D=F.forward,A=F.south,Y=F.floorY,P=(u,y,v)=>[O[0]+D[0]*u+A[0]*v,y,O[2]+D[2]*u+A[2]*v];
const merge=(geometries)=>{const vs=[],ix=[];for(const g of geometries){const a=g.attributes.position,n=vs.length;for(let i=0;i<a.count;i++)vs.push([a.getX(i),a.getY(i),a.getZ(i)]);ix.push(...(g.index?Array.from(g.index.array):Array.from({length:a.count},(_,i)=>i)).map(k=>k+n));g.dispose();}return{vs,ix};};
function add(id,geometries,mat,role,collision=true){const{vs,ix}=merge(geometries);c.add('court-life-'+id,vs,ix,mat,role);c.panels.at(-1).collision=collision;}
const localPoint=(u,y,v)=>new T.Vector3(...P(u,y,v));
function box(u,y,v,x,h,z,angle=0){const g=new T.BoxGeometry(x,h,z);g.rotateY(-Math.atan2(D[2],D[0])+angle);g.translate(...P(u,y,v));return g;}
function rod(a,b,r0,r1=r0,sides=10){const p=new T.Vector3(...a),q=new T.Vector3(...b),axis=q.clone().sub(p),g=new T.CylinderGeometry(r1,r0,axis.length(),sides,1,false);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize()));g.translate(...p.add(q).multiplyScalar(.5).toArray());return g;}
for(const t of s.terrace.tiers){const shape=new T.Shape(t.outlineUV.map(([u,v])=>new T.Vector2(u,-v))),g=new T.ExtrudeGeometry(shape,{depth:t.topY-t.bottomY,bevelEnabled:false,steps:1}),a=g.attributes.position,vs=Array.from({length:a.count},(_,i)=>P(a.getX(i),t.bottomY+a.getZ(i),-a.getY(i)));c.add('court-life-terrace-'+t.id,vs,g.index?Array.from(g.index.array):vs.map((_,i)=>i),0,'stone-terrace-floor');g.dispose();}
const place=(u,v,yaw,x,y,z)=>P(u+x*Math.cos(yaw)+z*Math.sin(yaw),Y+y,v-x*Math.sin(yaw)+z*Math.cos(yaw));
for(const table of s.tables){const{u,v,sizeU:x,sizeV:z}=table,parts=[box(u,Y+.725,v,x,.05,z)];for(const a of [-1,1])for(const b of [-1,1]){parts.push(rod(P(u+a*(x/2-.08),Y+.02,v+b*(z/2-.08)),P(u+a*(x/2-.08),Y+.70,v+b*(z/2-.08)),.026,.023,4));}parts.push(box(u,Y+.64,v,x-.13,.055,.04),box(u,Y+.64,v,.04,.055,z-.13));add('table-'+table.id,parts,1,'table-floor');
 for(const[ci,dx,dz,yaw]of [[0,-.76,0,-Math.PI/2],[1,.76,0,Math.PI/2],[2,0,-.69,Math.PI],[3,0,.69,0]]){
  const U=u+dx,V=v+dz,ps=[],pt=(x,y,z)=>place(U,V,yaw,x,y,z),qb=(x,y,z,w,h,d)=>box(U+x*Math.cos(yaw)+z*Math.sin(yaw),Y+y,V-x*Math.sin(yaw)+z*Math.cos(yaw),w,h,d,yaw);
  ps.push(qb(0,.455,0,.43,.045,.43));
  for(const x of [-.19,.19])for(const z of [-.17,.17])ps.push(rod(pt(x*1.13,.015,z*1.12),pt(x,.44,z),.018,.019,6));
  for(const x of [-.20,.20])ps.push(rod(pt(x,.46,.18),pt(x,.93,.245),.018,.018,6));
  ps.push(rod(pt(-.2,.93,.245),pt(.2,.93,.245),.021,.021,6),rod(pt(-.2,.54,.192),pt(.2,.54,.192),.016,.016,6));
  for(const x of [-.105,0,.105])ps.push(rod(pt(x,.55,.194),pt(x,.9,.24),.012,.012,5));
  for(const x of [-.22,.22]){ps.push(rod(pt(x,.66,-.1),pt(x,.70,.22),.021,.021,6),rod(pt(x,.46,-.1),pt(x,.66,-.1),.014,.014,6));}
  add('chair-'+table.id+'-'+ci,ps,1,'chair-floor');
 }
}
for(const u of s.umbrellas){const stem=[rod(P(u.u,Y+.06,u.v),P(u.u,u.peakY+.03,u.v),.024,.022,12),box(u.u,Y+.04,u.v,.5,.08,.5)];add('umbrella-'+u.id+'-stem',stem,1,'umbrella-support');
 // A closed thin shell follows the eight main ribs and shallow scalloped edge.
 const n=32,ring=[0,.16,.5,1],verts=[],idx=[];for(const back of [false,true])for(let j=0;j<ring.length;j++)for(let i=0;i<n;i++){const t=2*Math.PI*i/n,r=ring[j]*u.radius*Math.cos(Math.PI/8)/Math.cos((i%4)*Math.PI/16-Math.PI/8),scallop=(j===3?.028*Math.sin(Math.PI*(i%4)/4):0),h=u.peakY-(u.peakY-u.eaveY)*ring[j]**.7-scallop-(back?.003:0);verts.push(P(u.u+Math.cos(t)*r,h,u.v+Math.sin(t)*r));}
 const layer=n*ring.length;for(let j=0;j<ring.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,d=(j+1)*n+i,e=(j+1)*n+(i+1)%n;idx.push(a,e,d,a,b,e,layer+a,layer+d,layer+e,layer+a,layer+e,layer+b);}for(let i=0;i<n;i++){const a=3*n+i,b=3*n+(i+1)%n;idx.push(a,b,layer+b,a,layer+b,layer+a);}
 // Collapse the centre-ring duplicates by geometry identity; zero-area faces
 // are omitted and the centre cap has one shared vertex per side.
 const remap=new Map(),unique=[],ids=verts.map(p=>{const k=p.map(x=>x.toFixed(8)).join(',');if(!remap.has(k)){remap.set(k,unique.length);unique.push(p);}return remap.get(k);}),tri=[];for(let i=0;i<idx.length;i+=3){const t=idx.slice(i,i+3).map(k=>ids[k]);if(new Set(t).size===3)tri.push(...t);}c.add('court-life-umbrella-'+u.id+'-canvas',unique,tri,2,'umbrella-canopy');
 const ribs=[];for(let i=0;i<8;i++){const a=2*Math.PI*i/8;for(let j=0;j<3;j++){const p=ring[j],q=ring[j+1];ribs.push(rod(P(u.u+Math.cos(a)*p*u.radius,u.peakY-(u.peakY-u.eaveY)*p**.7-.025,u.v+Math.sin(a)*p*u.radius),P(u.u+Math.cos(a)*q*u.radius,u.peakY-(u.peakY-u.eaveY)*q**.7-.025,u.v+Math.sin(a)*q*u.radius),.008,.006,5));}}add('umbrella-'+u.id+'-ribs',ribs,1,'umbrella-decoration',true);
}
const pl=s.planter,wall=.10,cap=.035,pu=pl.u,pv=pl.v,py=pl.topY,ph=py-pl.bottomY,planter=[];
planter.push(box(pu,pl.bottomY+.08,pv,pl.sizeU,.16,pl.sizeV));for(const x of [-1,1])planter.push(box(pu+x*(pl.sizeU-wall)/2,pl.bottomY+ph/2,pv,wall,ph,pl.sizeV));for(const z of [-1,1])planter.push(box(pu,pl.bottomY+ph/2,pv+z*(pl.sizeV-wall)/2,pl.sizeU-2*wall,ph,wall));for(const [i,g]of planter.entries())add('near-planter-'+i,[g],4,'planter');add('near-planter-gravel',[box(pu,py-.09,pv,pl.sizeU-2*wall,.06,pl.sizeV-2*wall)],5,'gravel-floor');
for(const tree of s.trees){let seed=tree.seed;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},branches=[],foliage=Array.from({length:4},()=>({vertices:[],indices:[]}));
 const trunk=rod(P(tree.u,tree.rootY,tree.v),P(tree.u+.04,tree.crownY+.1,tree.v),tree.id==='near'?.075:.05,.025,12);add('tree-'+tree.id+'-trunk',[trunk],3,'tree-trunk');
 for(let i=0;i<25;i++){const theta=rnd()*Math.PI*2,y=tree.crownY+(rnd()-.5)*tree.radiusY*1.3,r=.65+rnd()*.2;branches.push(rod(P(tree.u+.03,y-.5,tree.v),P(tree.u+Math.cos(theta)*tree.radiusU*r,y,tree.v+Math.sin(theta)*tree.radiusV*r),.012,.004,7));}add('tree-'+tree.id+'-branches',branches,3,'tree-decoration',false);
 for(let i=0;i<tree.leaves;i++){
  const clump=tree.clumps?.[Math.floor(rnd()*tree.clumps.length)],offsetC=clump?.offset||[0,0,0],radii=clump?.radius||[tree.radiusU,tree.radiusY,tree.radiusV];
  const az=rnd()*Math.PI*2,ny=rnd()*2-1,rr=Math.sqrt(1-ny*ny),shell=.58+.42*Math.cbrt(rnd()),x=rr*Math.cos(az),z=rr*Math.sin(az),position=localPoint(tree.u+offsetC[0]+x*shell*radii[0],tree.crownY+offsetC[1]+ny*shell*radii[1],tree.v+offsetC[2]+z*shell*radii[2]),normal=new T.Vector3(x*.6+(rnd()-.5),.35+ny*.5,z*.6+(rnd()-.5)).normalize(),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),rnd()*Math.PI*2));
  const length=(tree.id==='near'?.13:.085)*(.65+rnd()*.6),width=length*(.40+rnd()*.18),outline=[[0,.5],[.35,.25],[.5,0],[.38,-.28],[0,-.5],[-.38,-.28],[-.5,0],[-.35,.25]],tone=rnd(),color=tone<.07?3:tone<.35?0:tone<.79?1:2,b=foliage[color],offset=b.vertices.length;
  // Separate front/back rim vertices keep opposite leaf normals from cancelling
  // in Blender's smooth-normal fans. Coincident rims still close the same shell.
  const edge=outline.map(([a,y])=>[a*width,y*length,0]),points=[[0,0,.0011],[0,0,-.0005],...edge,...edge];for(const p of points)b.vertices.push(new T.Vector3(...p).applyQuaternion(rotation).add(position).toArray());for(let n=0;n<8;n++){const a=2+n,d=2+(n+1)%8;b.indices.push(offset,offset+d,offset+a,offset+1,offset+a+8,offset+d+8);}
 }
 for(let k=0;k<4;k++){const f=foliage[k];c.add('court-life-tree-'+tree.id+'-leaves-'+k,f.vertices,f.indices,6+k,'foliage');c.panels.at(-1).collision=false;}
 // Small original pebbles break the planar near-planter fill at close range.
 if(tree.id==='near'){const pebbles=[];for(let i=0;i<240;i++){const g=new T.IcosahedronGeometry(.013+rnd()*.014,0);g.scale(1,.5,.8);g.rotateY(rnd()*Math.PI);g.translate(...P(pu+(rnd()-.5)*(pl.sizeU-.24),py-.052,pv+(rnd()-.5)*(pl.sizeV-.24)));pebbles.push(g);}add('near-planter-pebbles',pebbles,5,'gravel-decoration',false);}
}
const report=await c.save(out,'court-life.glb',{status:s.status,specSha256:sha(sb),referencePeriod:s.referencePeriod,geometry:{tables:s.tables.length,chairs:s.tables.length*4,umbrellas:s.umbrellas.length,trees:s.trees.length,leaves:s.trees.reduce((a,t)=>a+t.leaves,0),terraceTiers:s.terrace.tiers.length},limits:s.limits});
// Reuse the original warm granite maps and assign metric UVs to all stone faces.
const bytes=await readFile(out+'/court-life.glb'),{json:j,bin}=readGLB(bytes),parts=[bin.subarray(0,j.buffers[0].byteLength)];let offset=parts[0].length;const append=b=>{const pad=(4-offset%4)%4;if(pad){parts.push(Buffer.alloc(pad));offset+=pad;}const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;return id;};
for(const m of j.meshes)for(const p of m.primitives){const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],n=j.accessors[p.attributes.NORMAL],nv=j.bufferViews[n.bufferView],uv=new Float32Array(a.count*2);for(let i=0;i<a.count;i++){const xyz=[0,1,2].map(k=>bin.readFloatLE(v.byteOffset+i*12+k*4)),norm=[0,1,2].map(k=>bin.readFloatLE(nv.byteOffset+i*12+k*4)),axis=norm.map(Math.abs).indexOf(Math.max(...norm.map(Math.abs))),pair=axis===1?[xyz[0],xyz[2]]:axis===0?[xyz[2],xyz[1]]:[xyz[0],xyz[1]];uv[i*2]=pair[0]/.6;uv[i*2+1]=pair[1]/.6;}p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(uv.buffer)),componentType:5126,count:a.count,type:'VEC2'});}
j.images=[];j.textures=structuredClone(warm.json.textures);j.samplers=structuredClone(warm.json.samplers);for(const im of warm.json.images){const v=warm.json.bufferViews[im.bufferView];j.images.push({...im,bufferView:append(warm.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength))});}j.buffers[0].byteLength=offset;const result=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/court-life.glb',result);report.outputs.glbSha256=sha(result);report.textures={reusedFrom:'.local/station-realism/east-court-seats-06/east-court-seats.glb',images:j.images.length,newImages:0};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({geometry:report.geometry,bytes:result.length,outputs:report.outputs},null,2));
