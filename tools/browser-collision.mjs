// The geometry rules below mirror StationWorld/StairGeometry/MovingEscalator.
// This is a build step. Browsers never parse the full authoring layout.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodeCollisionPack} from '../web/public/physics/collision-pack.js';
import {v,add,sub,mul,cross,length,unit,dot,yaw,rotationFromUp,identity} from '../web/public/physics/math.js';

// Keep the same recovery boundary as StationLayout.FallLimitY, including the
// hidden escalator return path. Generated casing bounds are not the boundary.
export function fallLimitY(layout){
 let lowest=layout.spawn.y;
 for(const b of layout.boxes||[])if(b.collision)lowest=Math.min(lowest,b.center.y-b.size.y*.5);
 for(const p of layout.panels||[])if(p.collision)for(const v of p.vertices||[])lowest=Math.min(lowest,v.y);
 for(const b of layout.beams||[])if(b.collision)lowest=Math.min(lowest,Math.min(b.a.y,b.b.y)-b.radius);
 for(const f of layout.flights||[])lowest=Math.min(lowest,f.baseElevation-.31-Math.max(0,f.foundationDepth||0));
 for(const e of layout.escalators||[]){lowest=Math.min(lowest,e.lowerCenter.y-1);for(const p of e.path||[])lowest=Math.min(lowest,e.lowerCenter.y+p.y-1);}
 return Math.fround(lowest-5);
}

export function compileCollision(layout,layoutSha256){
 if(layout.schemaVersion!==1||layout.units!=='meters')throw Error('Unsupported canonical station layout');
 if(layout.municipalGeometry?.resource)throw Error('External municipal collision must be resolved into the canonical layout');
 const shapes=[],arrays=[];let byteOffset=0,lowest=layout.spawn.y;
 const append=a=>{const ref={offset:byteOffset,count:a.length};arrays.push(a);byteOffset+=a.byteLength;return ref;};
 function mesh(id,material,points,triangles,options={}){
  // Position-only welding preserves every triangle and its surface identity.
  const unique=[],mapping=new Uint32Array(points.length),seen=new Map();
  for(let i=0;i<points.length;i++){const p=v(points[i].x,points[i].y,points[i].z),key=p.x+','+p.y+','+p.z;let index=seen.get(key);if(index===undefined){index=unique.length/3;seen.set(key,index);unique.push(p.x,p.y,p.z);}mapping[i]=index;lowest=Math.min(lowest,p.y);}
  const indices=new Uint32Array(triangles.length);for(let i=0;i<indices.length;i++){if(triangles[i]>=points.length||triangles[i]<0)throw Error('Invalid triangle in '+id);indices[i]=mapping[triangles[i]];}
  shapes.push({id,material,kind:'mesh',mask:3,...options,vertices:append(new Float32Array(unique)),indices:append(indices)});
 }
 function faces(){const points=[],triangles=[];return {points,triangles,face(a,b,c,d){const i=points.length;points.push(a,b,c,d);triangles.push(i,i+1,i+2,i,i+2,i+3);}};}
 function stairs(f,depth=.3,walking=true){
  const rows=f.contours.map(c=>c.points),n=rows.length-1,columns=rows[0].length,base=f.baseElevation,rise=f.rise,bottom=base-depth,g=faces();
  if(rows.length<2||columns<2||rows.some(r=>r.length!==columns))throw Error('Invalid stair contours '+f.id);
  const p=(row,col,y)=>v(rows[row][col].x,y,rows[row][col].y);
  const reverse=cross(sub(p(0,columns-1,0),p(0,0,0)),sub(p(1,0,0),p(0,0,0))).y<0;
  const face=(a,b,c,d)=>reverse?g.face(d,c,b,a):g.face(a,b,c,d);
  for(let r=0;r<n;r++){
   const y=base+(r+1)*rise,previous=base+r*rise;
   for(let c=0;c<columns-1;c++){face(p(r,c,y),p(r,c+1,y),p(r+1,c+1,y),p(r+1,c,y));if(rise>0)face(p(r,c,previous),p(r,c+1,previous),p(r,c+1,y),p(r,c,y));face(p(r+1,c,bottom),p(r+1,c+1,bottom),p(r,c+1,bottom),p(r,c,bottom));}
   face(p(r,0,bottom),p(r,0,y),p(r+1,0,y),p(r+1,0,bottom));face(p(r+1,columns-1,bottom),p(r+1,columns-1,y),p(r,columns-1,y),p(r,columns-1,bottom));
  }
  for(let c=0;c<columns-1;c++){face(p(n,c,base+n*rise),p(n,c+1,base+n*rise),p(n,c+1,bottom),p(n,c,bottom));face(p(0,c,bottom),p(0,c+1,bottom),p(0,c+1,base),p(0,c,base));}
  mesh(f.id,f.material||'stone',g.points,g.triangles,{mask:rise>0?1:3,rolling:.024});
  if(walking&&rise>0){g.points.length=g.triangles.length=0;for(let r=0;r<n;r++)for(let c=0;c<columns-1;c++)face(p(r,c,base+r*rise),p(r,c+1,base+r*rise),p(r+1,c+1,base+(r+1)*rise),p(r+1,c,base+(r+1)*rise));mesh(f.id+' walking surface',f.material||'stone',g.points,g.triangles,{mask:2});}
 }
 for(const b of layout.boxes){if(!b.collision)continue;lowest=Math.min(lowest,b.center.y-b.size.y/2);const a=b.yaw*Math.PI/360;shapes.push({id:b.id,material:b.material,kind:'box',position:b.center,rotation:{x:0,y:Math.sin(a),z:0,w:Math.cos(a)},half:mul(b.size,.5),mask:b.role==='step-edge'?1:3});}
 for(const p of layout.panels){if(!p.collision)continue;const convex=p.id.includes('-escalator-')&&(p.role==='escalator-body'||p.id.includes('-skirt-'))&&p.vertices.length<=36;mesh(p.id,p.material,p.vertices,p.triangles,{mask:p.playerOnly?2:p.ballStairs?1:3,convex});}
 for(const b of layout.beams){if(!b.collision)continue;const delta=sub(b.b,b.a),size=length(delta);if(size<.0001)continue;lowest=Math.min(lowest,b.a.y-b.radius,b.b.y-b.radius);const shape={id:b.id,material:b.material,kind:b.profile==='square'?'box':'capsule',position:mul(add(b.a,b.b),.5),rotation:rotationFromUp(delta),half:v(b.radius,size/2,b.radius),radius:b.radius,mask:3};
  if(b.material==='rubber')for(const e of layout.escalators||[]){const handrail=b.id.startsWith(e.id+'-handrail'),turn=b.id.startsWith(e.id+'-belt-return');if(!handrail&&!turn)continue;const sign=turn?(dot(sub(shape.position,e.lowerCenter),e.uphill)>e.run/2?1:-1):1;shape.velocity=mul(unit(delta),e.speed*sign);break;}
  shapes.push(shape);
 }
 for(const f of layout.flights){if(f.role!=='escalator')stairs(f);if(f.foundationDepth>0)stairs({...f,id:f.id+' foundation',material:'facade',contours:[f.contours[0],f.contours.at(-1)],baseElevation:f.baseElevation-.31,rise:0},f.foundationDepth,false);}
 for(const e of layout.escalators||[]){
  const width=e.width/2,heading=Math.atan2(e.uphill.x,e.uphill.z)*180/Math.PI,point=(p,x,y)=>add(e.lowerCenter,yaw(add(p,v(x,y,0)),heading));
  let g=faces();for(let i=0;i<e.publicPointCount-1;i++){const a=e.path[i],b=e.path[i+1];g.face(point(a,-width,0),point(b,-width,0),point(b,width,0),point(a,width,0));}mesh(e.id+' walking surface','escalator',g.points,g.triangles,{mask:2});
  for(let part=0;part<3;part++){
   g=faces();const x0=part===0?-width-.05:part===1?-width-.05:width+.004,x1=part===0?width+.05:part===1?-width-.004:width+.05,top=part===0?-.30:.04,bottom=-1.08;
   for(let i=0;i<e.publicPointCount-1;i++){const a=e.path[i],b=e.path[i+1];g.face(point(a,x0,top),point(b,x0,top),point(b,x1,top),point(a,x1,top));g.face(point(a,x1,bottom),point(b,x1,bottom),point(b,x0,bottom),point(a,x0,bottom));g.face(point(a,x0,bottom),point(b,x0,bottom),point(b,x0,top),point(a,x0,top));g.face(point(a,x1,top),point(b,x1,top),point(b,x1,bottom),point(a,x1,bottom));}
   const a=e.path[0],b=e.path[e.publicPointCount-1];g.face(point(a,x0,bottom),point(a,x0,top),point(a,x1,top),point(a,x1,bottom));g.face(point(b,x1,bottom),point(b,x1,top),point(b,x0,top),point(b,x0,bottom));mesh(e.id+'-chassis','escalator',g.points,g.triangles);
  }
 }
 return {metadata:{layoutSha256,spawn:layout.spawn,fallLimitY:fallLimitY(layout),shapes,escalators:layout.escalators||[]},arrays};
}
export async function buildCollisionPack(source,{input=process.env.KYOTO_V2_ASSETS||'web/v2/assets.json',output='.local/browser-physics/station.collision.bin'}={}){
 output=resolve(output);
 const sha=createHash('sha256').update(source).digest('hex');
 const compiler=createHash('sha256');
 for(const file of [import.meta.url,new URL('../web/public/physics/collision-pack.js',import.meta.url),new URL('../web/public/physics/math.js',import.meta.url)])compiler.update(await readFile(new URL(file)));
 const fingerprint=compiler.digest('hex');
 try{
  const receipt=JSON.parse(await readFile(output+'.json','utf8'));
  if(receipt.layoutSha256===sha&&receipt.compilerSha256===fingerprint){
   const bytes=await readFile(output);
   if(bytes.length===receipt.bytes&&createHash('sha256').update(bytes).digest('hex')===receipt.sha256)return receipt;
  }
 }catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
 const {metadata,arrays}=compileCollision(JSON.parse(source),sha),bytes=encodeCollisionPack(metadata,arrays);
 await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
 const receipt={input,output,layoutSha256:sha,compilerSha256:fingerprint,sha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:Buffer.byteLength(source),bytes:bytes.length,shapes:metadata.shapes.length,movingEscalators:metadata.escalators.length};
 await writeFile(output+'.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(`Built collision pack: ${bytes.length} bytes, ${metadata.shapes.length} shapes`);return receipt;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2],output=process.argv[3];
 // Use the release's validated source/spawn transform without writing another
 // half-gigabyte layout or depending on a particular local preview port.
 const source=input?await readFile(input):(await (await import('../deploy/station.mjs')).stationRelease()).layoutBytes;
 const sha=createHash('sha256').update(source).digest('hex');
 const courses=JSON.parse(await readFile('web/starter-challenges.json','utf8'));if(!courses.every(c=>c.layout===sha))throw Error('Collision source must match the current campaign');
 console.log(JSON.stringify(await buildCollisionPack(source,{input,output}),null,2));
}
