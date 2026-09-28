// Independent lower architectural checks. No camera fitting or geometry mutation.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {PerspectiveCamera,Vector3} from 'three';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';
const [configPath,out]=process.argv.slice(2);
assert(out && resolve(out).startsWith(resolve('.local')+'/'));
const configBytes=await readFile(configPath),c=JSON.parse(configBytes),sha=b=>createHash('sha256').update(b).digest('hex');
const sourceBytes=await readFile(c.source.file);assert.equal(sha(sourceBytes),c.source.sha256);
const fitBytes=await readFile(c.fit.file);assert.equal(sha(fitBytes),c.fit.sha256);
const fit=JSON.parse(fitBytes);assert.equal(sha(await readFile(fit.reference.localFile)),fit.reference.sha256);
const {json:j,bin}=readGLB(sourceBytes),node=j.nodes.find(n=>n.name===c.source.object);
assert(node && !node.matrix&&!node.translation&&!node.rotation&&!node.scale);
const p=j.meshes[node.mesh].primitives[0],a=j.accessors[p.attributes.POSITION],b=j.bufferViews[a.bufferView];assert.equal(a.componentType,5126);assert.equal(a.type,'VEC3');
const vertex=i=>{assert(Number.isInteger(i)&&i>=0&&i<a.count);return [0,1,2].map(k=>bin.readFloatLE((b.byteOffset||0)+(a.byteOffset||0)+i*(b.byteStride||12)+4*k));};
const cam=fit.camera,{width,height}=cam.viewport,camera=new PerspectiveCamera(cam.fov,width/height,.1,1000);
camera.position.fromArray(cam.position);camera.lookAt(new Vector3(...cam.target));camera.rotateZ(cam.rollDegrees*Math.PI/180);camera.updateMatrixWorld();
function project(v){const p=new Vector3(...v).project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2];}
// Confirm this independent projection implementation matches the existing fit.
for(const a of fit.anchors){const q=project(a.worldPoint);assert(Math.hypot(...q.map((v,k)=>v-a.projectedViewportPixel[k]))<1e-7);}
const checks=c.checks.map(row=>{const worldPoint=vertex(row.vertexIndex),projectedPixel=project(worldPoint),residualPixels=Math.hypot(...projectedPixel.map((v,k)=>v-row.observedViewportPixel[k]));return {...row,worldPoint,projectedPixel,residualPixels,withinTolerance:residualPixels<=fit.tolerancePixels};});
const gateVertices=c.gateVertexIndices.map(vertexIndex=>({vertexIndex,worldPoint:vertex(vertexIndex),projectedPixel:project(vertex(vertexIndex))}));
const report={status:'Independent lower facade checks; no floor/depth calibration or final architecture acceptance',config:{file:configPath,sha256:sha(configBytes)},source:c.source,fit:c.fit,toolSha256:sha(await readFile(new URL(import.meta.url))),tolerancePixels:fit.tolerancePixels,checks,allLowerChecksWithinTolerance:checks.every(r=>r.withinTolerance),gateVertices,limitations:c.limitations};
await mkdir(out,{recursive:false});await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const markers=checks.map((r,i)=>`<g><path d="M${r.observedViewportPixel.join(' ')} L${r.projectedPixel.join(' ')}" stroke="#ffcb65"/><circle cx="${r.observedViewportPixel[0]}" cy="${r.observedViewportPixel[1]}" r="4" fill="none" stroke="cyan"/><circle cx="${r.projectedPixel[0]}" cy="${r.projectedPixel[1]}" r="3" fill="#ff6279"/><text x="${r.projectedPixel[0]+8}" y="${r.projectedPixel[1]}" fill="white" stroke="black" stroke-width="2" paint-order="stroke">${i+1}</text></g>`).join('');
await writeFile(out+'/overlay.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="file://${esc(fit.reference.localFile)}" width="${width}" height="${fit.reference.size[1]*fit.imageTransform.scale}" y="${-fit.imageTransform.cropTopPixels}"/>${markers}</svg>`);
console.log(JSON.stringify({allLowerChecksWithinTolerance:report.allLowerChecksWithinTolerance,checks:checks.map(r=>({id:r.id,residualPixels:r.residualPixels})),out},null,2));
