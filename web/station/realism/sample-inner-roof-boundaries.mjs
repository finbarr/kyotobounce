// Sample all retained source-mask triangles in the two rebuilt frontage meshes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
const [layoutPath,maskPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));const [bytes,maskBytes]=await Promise.all([readFile(layoutPath),readFile(maskPath)]),sha=b=>createHash('sha256').update(b).digest('hex'),layout=JSON.parse(bytes),mask=JSON.parse(maskBytes),repair=layout.architecture.innerRoofSourceInterface;assert.equal(sha(maskBytes),repair.maskSha256);
const selected=new Set(mask.rows.map(r=>r.face)),samples=[],tiny=[];
for(const r of repair.replacedPanels){const p=layout.panels.find(p=>p.id===r.id);for(let i=0;i<p.triangles.length;i+=3){const sourceFace=r.triangleSourceFaces[i/3];if(!selected.has(sourceFace))continue;const tri=p.triangles.slice(i,i+3).map(i=>p.vertices[i]).map(v=>new T.Vector3(v.x,v.y,-v.z)),cross=tri[2].clone().sub(tri[0]).cross(tri[1].clone().sub(tri[0])),areaM2=cross.length()/2;
 if(areaM2<1e-8){tiny.push({panel:p.id,triangle:i/3,sourceFace,areaM2});continue;}
 const normal=cross.normalize(),point=tri[0].clone().multiplyScalar(.217).addScaledVector(tri[1],.319).addScaledVector(tri[2],.464),origin=point.clone().addScaledVector(normal,.2),direction=normal.clone().negate(),native=v=>({x:v.x,y:v.y,z:-v.z});samples.push({target:p.id+'|source-'+sourceFace+'|triangle-'+i/3,sourceFace,areaM2,origin:native(origin),direction:native(direction),expected:{surface:p.id,point:native(point)}});
}}
const report={layoutSha256:sha(bytes),maskSha256:sha(maskBytes),meaning:'Every retained masked source triangle with area >=1e-8 square metres. Tiny collapsed fragments are listed separately; expected source surfaces may be occluded by genuine adjoining structure.',samples,tiny};await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({samples:samples.length,tiny:tiny.length,tinyAreaM2:tiny.reduce((n,r)=>n+r.areaM2,0)}));
