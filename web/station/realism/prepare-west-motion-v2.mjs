// Retire only the old west hardware nodes; preserve all unrelated encoded data.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [layoutPath,component,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),lb=await readFile(layoutPath),layout=JSON.parse(lb),native=JSON.parse(await readFile(component+'/native-panels.json'));
const oldDetail='.local/station-realism/hall-basement-motion-02/atrium-detail.json',db=await readFile(oldDetail),detail=JSON.parse(db);
const retired=id=>/^west-concourse-(lower|upper)-escalator-/.test(id);
const hardware='web/public/assets/runtime/atrium-detail.glb',hb=await readFile(hardware),{json:j,bin}=readGLB(hb),removed=j.nodes.flatMap((n,i)=>retired(n.name)?[i]:[]);assert.equal(removed.length,20);
const oldNodes=j.scenes[j.scene||0].nodes;assert(removed.every(i=>oldNodes.includes(i))&&j.nodes.every(n=>!n.children));j.scenes[j.scene||0].nodes=oldNodes.filter(i=>!removed.includes(i));
const glb=writeGLB(j,bin);assert(readGLB(glb).bin.equals(bin));await writeFile(out+'/atrium-detail.runtime.glb',glb);
detail.combSupports=detail.combSupports.filter(p=>!retired(p.support)).concat(native.combSupports);
detail.landings=detail.landings.filter(p=>!retired(p.id));
for(const e of native.escalators)for(const end of ['lower','upper']){
 const upper=end==='upper',along=upper?e.run+e.flatLength+.64:-e.flatLength-.64;
 detail.landings.push({id:e.id+'-'+end,position:{x:e.lowerCenter.x+e.uphill.x*along,y:e.lowerCenter.y+(upper?e.height:0)+.003,z:e.lowerCenter.z+e.uphill.z*along},uphill:e.uphill,width:e.width+.14,direction:(e.speed>=0?1:-1)*(upper?-1:1)});
}
for(const s of native.combSupports)assert(layout.panels.some(p=>p.id===s.support));
detail.geometry={...detail.geometry,batches:j.scenes[j.scene||0].nodes.length,triangles:j.scenes[j.scene||0].nodes.reduce((sum,i)=>sum+j.meshes[j.nodes[i].mesh].primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),0)};
detail.candidateMotionIntegration={layoutSha256:sha(lb),originalDetailSha256:sha(db),originalHardwareSha256:sha(hb),hardwareSha256:sha(glb),retiredHardwareNodes:removed.map(i=>j.nodes[i].name),scope:'West lane metadata replaced; old west hardware nodes retired. Replacement casings and comb supports are in the main station GLB. Other hardware buffers remain byte-identical.'};
await writeFile(out+'/atrium-detail.json',JSON.stringify(detail)+'\n');console.log(JSON.stringify({removedNodes:removed.length,remainingNodes:detail.geometry.batches,hardwareSha256:sha(glb)}));
