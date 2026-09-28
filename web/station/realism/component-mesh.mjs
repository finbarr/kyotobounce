// Closed static construction meshes with shared browser/native coordinates.
import assert from 'node:assert/strict';
import * as T from 'three';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {writeGLB} from '../../../tools/optimize-browser-assets.mjs';
export function construction(materials,{flatNormals=false}={}){
 const panels=[],batches=materials.map(()=>({positions:[],indices:[],normalOverrides:[]}));
 function add(id,vertices,indices,material,role,normals=null){assert(!normals||!flatNormals&&normals.length===vertices.length*3);assert(vertices.length>=4&&indices.length%3===0);if(flatNormals){vertices=indices.map(i=>vertices[i].slice());indices=vertices.map((_,i)=>i);}const p={id,vertices:vertices.map(([x,y,z])=>({x,y,z:-z})),triangles:indices.flatMap((_,i)=>i%3?[]:[indices[i+2],indices[i+1],indices[i]]),browserMaterial:material,material:role.includes('floor')?'stone':material===0?'glass':'roof',role,collision:true};panels.push(p);const b=batches[material],n=b.positions.length/3;for(const v of vertices)b.positions.push(...v);for(const i of indices)b.indices.push(i+n);if(normals)b.normalOverrides.push({offset:n*3,values:normals});}
 // Improve internal diagonals without moving the polygon or its holes. Earcut can
 // leave long, almost collinear triangles where the oblique vestibule joins the hall.
 function improveTriangles(points,triangles){
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const quality=ids=>{const [a,b,c]=ids.map(i=>points[i]),area=Math.abs(cross(a,b,c));return Math.min(...[[a,b,c],[b,c,a],[c,a,b]].map(([p,q,r])=>Math.atan2(area,(q.x-p.x)*(r.x-p.x)+(q.y-p.y)*(r.y-p.y))));};
  for(let iteration=0;iteration<1000;iteration++){
   const edges=new Map();for(const [i,t]of triangles.entries())for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');const rows=edges.get(key)||[];rows.push({i,a,b,c:t[(k+2)%3]});edges.set(key,rows);}
   let changed=false;
   for(const rows of edges.values()){
    if(rows.length!==2)continue;const [u,v]=rows,{a,b,c}=u,d=v.c;
    if(cross(points[a],points[b],points[c])*cross(points[a],points[b],points[d])>=0||cross(points[c],points[d],points[a])*cross(points[c],points[d],points[b])>=0)continue;
    const next=[[c,d,a],[d,c,b]];for(const t of next)if(cross(...t.map(i=>points[i]))<0)[t[1],t[2]]=[t[2],t[1]];
    if(Math.min(...next.map(quality))<=Math.min(quality(triangles[u.i]),quality(triangles[v.i]))+1e-8)continue;
    triangles[u.i]=next[0];triangles[v.i]=next[1];changed=true;break;
   }
   if(!changed)return triangles;
  }
  throw Error('Floor triangulation improvement did not converge');
 }
 function slab(id,polygon,holes,depth,m,role){let rings=[polygon,...holes].map(r=>r.map(p=>p.slice()));if(T.ShapeUtils.isClockWise(rings[0].map(p=>new T.Vector2(p[0],p[2]))))rings[0].reverse();for(const ring of rings.slice(1))if(!T.ShapeUtils.isClockWise(ring.map(p=>new T.Vector2(p[0],p[2]))))ring.reverse();const top=rings.flat(),n=top.length,vertices=[...top,...top.map(([x,y,z])=>[x,y-depth,z])],ids=[];const shapes=rings.map(r=>r.map(p=>new T.Vector2(p[0],p[2])));for(const [a,b,c]of improveTriangles(shapes.flat(),T.ShapeUtils.triangulateShape(shapes[0],shapes.slice(1))))ids.push(c,b,a,a+n,b+n,c+n);let offset=0;for(const r of rings){for(let i=0;i<r.length;i++){const a=offset+i,b=offset+(i+1)%r.length;ids.push(a,b,b+n,a,b+n,a+n);}offset+=r.length;}add(id,vertices,ids,m,role);}
 function beam(id,a,b,width,height,m,role){const A=new T.Vector3(...a),B=new T.Vector3(...b),length=A.distanceTo(B);assert(length>1e-5);const g=new T.BoxGeometry(width,height,length),mesh=new T.Mesh(g);mesh.position.copy(A).add(B).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),B.sub(A).normalize());mesh.updateMatrix();g.applyMatrix4(mesh.matrix);const ps=g.attributes.position;add(id,Array.from({length:ps.count},(_,i)=>[ps.getX(i),ps.getY(i),ps.getZ(i)]),Array.from(g.index.array),m,role);g.dispose();}
 async function save(out,name,metadata){await mkdir(out,{recursive:true});let minVolume=Infinity;for(const p of panels){const vs=p.vertices.map(v=>new T.Vector3(v.x,v.y,-v.z)),keys=vs.map(v=>v.toArray().map(n=>n.toFixed(6)).join(',')),edges=new Map();let volume=0;for(let i=0;i<p.triangles.length;i+=3){const a=p.triangles[i+2],b=p.triangles[i+1],c=p.triangles[i];volume+=vs[a].dot(vs[b].clone().cross(vs[c]))/6;for(const [x,y]of [[a,b],[b,c],[c,a]]){const k=[keys[x],keys[y]].sort().join('|'),row=edges.get(k)||{count:0,balance:0};row.count++;row.balance+=keys[x]<keys[y]?1:-1;edges.set(k,row);}}assert(volume>1e-9,`Nonpositive volume ${p.id}: ${volume}`);assert([...edges.values()].every(e=>e.count===2&&e.balance===0),`Open mesh ${p.id}`);minVolume=Math.min(minVolume,volume);}
 const j={asset:{version:'2.0',generator:'Kyoto source-based public corridor construction'},scene:0,scenes:[{nodes:materials.map((_,i)=>i)}],nodes:materials.map((m,i)=>({name:m.name,mesh:i})),meshes:[],materials,buffers:[],bufferViews:[],accessors:[]},parts=[];let offset=0;
 function data(array,type,componentType,count,target,min,max){const b=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target});parts.push(b);offset+=b.length;const id=j.accessors.length;j.accessors.push({bufferView:view,componentType,count,type,...(min?{min,max}:{})});return id;}
 for(let m=0;m<materials.length;m++){const b=batches[m];assert(b.positions.length);const p=new Float32Array(b.positions),ix=new Uint32Array(b.indices),g=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(p,3)).setIndex(new T.BufferAttribute(ix,1));g.computeVertexNormals();for(const override of b.normalOverrides)g.attributes.normal.array.set(override.values,override.offset);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const k=i%3;min[k]=Math.min(min[k],p[i]);max[k]=Math.max(max[k],p[i]);}const pos=data(p,'VEC3',5126,p.length/3,34962,min,max),normal=data(g.attributes.normal.array,'VEC3',5126,p.length/3,34962),indices=data(ix,'SCALAR',5125,ix.length,34963);j.meshes.push({primitives:[{attributes:{POSITION:pos,NORMAL:normal},indices,material:m,mode:4}]});g.dispose();}j.buffers.push({byteLength:offset});
 const glb=writeGLB(j,Buffer.concat(parts)),native=Buffer.from(JSON.stringify({schemaVersion:1,panels})+'\n'),sha=b=>createHash('sha256').update(b).digest('hex');await writeFile(out+'/'+name,glb);await writeFile(out+'/native-panels.json',native);const report={...metadata,geometry:{...metadata.geometry,panels:panels.length,triangles:batches.reduce((n,b)=>n+b.indices.length/3,0),minimumClosedVolumeM3:minVolume},outputs:{glbFile:name,glbSha256:sha(glb),nativePanelsSha256:sha(native)}};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');return report;}
 return {panels,add,slab,beam,save};
}
