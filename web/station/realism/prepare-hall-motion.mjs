// Private motion metadata: preserve existing hardware provenance and add the
// eight comb endpoints already represented by the basement component geometry.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [basePath,layoutPath,detailPath,outPath]=process.argv.slice(2);
assert(basePath&&layoutPath&&detailPath&&outPath);
const out=resolve(outPath);assert(out.startsWith(resolve('.local')+'/'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const [bb,lb,db]=await Promise.all([readFile(basePath),readFile(layoutPath),readFile(detailPath)]);
const base=JSON.parse(bb),layout=JSON.parse(lb),detail=JSON.parse(db);
const integration=layout.architecture.hallBasementIntegration;
assert.equal(integration.inputLayoutSha256,sha(bb));
const existing=new Map(base.escalators.map(s=>[s.id,s]));
for(const lane of layout.escalators)if(existing.has(lane.id))assert.deepEqual(lane,existing.get(lane.id));
const added=layout.escalators.filter(s=>!existing.has(s.id));assert.equal(added.length,4);
const supports=integration.componentCombSupports;assert.equal(supports.length,8);
const rows=[];
for(const lane of added)for(const end of ['lower','upper']){
 const id=lane.id+'-'+end+'-comb-transfer',s=supports.find(s=>s.support===id),p=layout.panels.find(p=>p.id===id);
 assert(s&&p);assert(!detail.combSupports.some(s=>s.support===id));
 const along=p.vertices.map(v=>(v.x-lane.lowerCenter.x)*lane.uphill.x+(v.z-lane.lowerCenter.z)*lane.uphill.z);
 const lo=Math.min(...along),hi=Math.max(...along),error=Math.max(Math.abs(s.along-s.length/2-lo),Math.abs(s.along+s.length/2-hi));
 assert(error<.000003,'Component comb metadata differs from native footprint: '+id);
 rows.push({support:id,minimum:lo,maximum:hi,maximumBoundaryErrorM:error});
}
const allSupports=[...detail.combSupports,...supports];
const lanes=layout.escalators.map(lane=>{
 const lower=allSupports.find(s=>s.support===lane.id+'-lower-comb-transfer'),upper=allSupports.find(s=>s.support===lane.id+'-upper-comb-transfer');
 assert(lower&&upper,'Missing moving-step endpoint: '+lane.id);
 const from=lower.along+lower.length/2,to=upper.along-upper.length/2;assert(to>from);
 return {id:lane.id,from,to,added:!existing.has(lane.id)};
});
const provenance={layoutSha256:sha(lb),baseLayoutSha256:sha(bb),originalDetailSha256:sha(db),originalHardwareSourceLayoutSha256:detail.sourceLayoutSha256,addedSupportCount:supports.length,addedHardwareGeometry:false,scope:'Private motion metadata only. Original hardware geometry and its source-layout provenance are unchanged; new comb geometry is already in the main station GLB.'};
const result={...detail,combSupports:allSupports,candidateMotionIntegration:provenance};
assert.deepEqual({...result,combSupports:detail.combSupports,candidateMotionIntegration:undefined},{...detail,candidateMotionIntegration:undefined});
const unusedSupports=allSupports.filter(s=>!lanes.some(l=>s.support===l.id+'-lower-comb-transfer'||s.support===l.id+'-upper-comb-transfer')).map(s=>s.support);
await mkdir(out,{recursive:false});
await writeFile(out+'/atrium-detail.json',JSON.stringify(result)+'\n');
await writeFile(out+'/motion.json',JSON.stringify({escalators:layout.escalators,combSupports:allSupports})+'\n');
const proof={pass:true,...provenance,lanes,combFootprints:rows,unusedInheritedSupports:unusedSupports,limitation:'Inherited detail geometry is unchanged and is not a new full-station hardware audit.'};
await writeFile(out+'/proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({pass:true,lanes:lanes.length,added:added.length,unusedInheritedSupports:unusedSupports.length}));
