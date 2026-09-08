import * as T from 'three';
import {readFile,writeFile} from 'node:fs/promises';
const layout=JSON.parse(await readFile('runtime/station-layout.json','utf8'));
export function floorAt(x,z,y=40){const hits=[];for(const p of layout.panels){if(!p.collision||!p.vertices.some(v=>v.y<=y)||x<Math.min(...p.vertices.map(v=>v.x))||x>Math.max(...p.vertices.map(v=>v.x))||z<Math.min(...p.vertices.map(v=>v.z))||z>Math.max(...p.vertices.map(v=>v.z)))continue;const vs=p.vertices.map(v=>new T.Vector3(v.x,v.y,v.z)),ray=new T.Ray(new T.Vector3(x,y,z),new T.Vector3(0,-1,0));for(let i=0;i<p.triangles.length;i+=3){const [a,b,c]=p.triangles.slice(i,i+3).map(j=>vs[j]),hit=ray.intersectTriangle(a,b,c,false,new T.Vector3());if(hit)hits.push({id:p.id,y:hit.y});}}for(const p of layout.boxes){if(!p.collision||p.yaw)continue;const c=p.center,s=p.size;if(Math.abs(x-c.x)<=s.x/2&&Math.abs(z-c.z)<=s.z/2&&c.y+s.y/2<=y)hits.push({id:p.id,y:c.y+s.y/2});}return hits.sort((a,b)=>b.y-a.y);}
if(process.argv[2]==='probe')for(const [x,z,y]of [[92.5,-16,35],[99,-16,35],[-42,-19,8],[-46,-19,8]])console.log(x,z,floorAt(x,z,y).slice(0,3));

if(process.argv[2]==='emit'){
 const spec=JSON.parse(await readFile('web/station/exhibits/spec.json'));
 const anchors=spec.exhibits.map(e=>{const [x,y,z]=e.origin,[lo,hi]=e.bounds,samples=[];for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){const px=x+lo[0]+(hi[0]-lo[0])*i/4,pz=z+lo[2]+(hi[2]-lo[2])*j/4;const hit=floorAt(px,pz,y+.01)[0];if(!hit||Math.abs(hit.y-y)>.001)throw Error(`Unsupported ${e.id} ${px},${pz}: ${JSON.stringify(hit)}`);samples.push({x:px,z:pz,...hit});}return {...e,occupiedAABB:{min:e.origin.map((v,i)=>v+lo[i]),max:e.origin.map((v,i)=>v+hi[i])},supportSamples:samples};});
 await writeFile('.local/station-detail/anchors.json',JSON.stringify({...spec,exhibits:anchors},null,2));console.log('PASS 75 floor support samples; anchors emitted before export');
}
