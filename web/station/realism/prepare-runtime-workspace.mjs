// Prepare an isolated candidate catalog and matching assets without editing the service.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir,symlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const [layoutArg,assetsArg,outArg,detailArg]=process.argv.slice(2),root=resolve('.');
assert(layoutArg&&assetsArg&&outArg);
const layoutPath=resolve(layoutArg),assets=resolve(assetsArg),out=resolve(outArg),local=resolve('.local')+'/';
for(const p of [layoutPath,assets,out])assert(p.startsWith(local),'Candidate inputs/output must remain under .local');
const hash=b=>createHash('sha256').update(b).digest('hex');
const [layout,station,art,catalogBytes]=await Promise.all([readFile(layoutPath),readFile(assets+'/station.json'),readFile(assets+'/atrium.runtime.glb'),readFile('web/starter-challenges.json')]);
assert.equal(JSON.parse(station).layoutSha256,hash(layout),'Candidate browser and native layouts differ');
const layoutData=JSON.parse(layout),detailPath=detailArg?resolve(detailArg):null;
if(detailPath)assert(detailPath.startsWith(local),'Private detail metadata must remain under .local');
const detailBytes=detailPath?await readFile(detailPath):null,detail=detailBytes?JSON.parse(detailBytes):null;
if(layoutData.architecture?.hallBasementIntegration){
 assert(detail,'Basement candidate requires matching moving-step endpoint metadata');
 assert.equal(detail.candidateMotionIntegration?.layoutSha256,hash(layout));
 for(const support of layoutData.architecture.hallBasementIntegration.componentCombSupports)
  assert.deepEqual(detail.combSupports.find(s=>s.support===support.support),support);
}
const original=JSON.parse(catalogBytes);assert(original.length===31&&original.every(c=>c.creator==='station'));
const candidate=original.map(c=>({...c,layout:hash(layout)}));
await mkdir(out,{recursive:false});await mkdir(out+'/web');
for(const f of await readdir('web',{withFileTypes:true}))if(!['public','starter-challenges.json','data'].includes(f.name))await symlink(join(root,'web',f.name),out+'/web/'+f.name,f.isDirectory()?'dir':'file');
await symlink(root+'/node_modules',out+'/node_modules','dir');
const replacements=new Map([['assets/station.json',assets+'/station.json'],['assets/runtime/atrium.glb',assets+'/atrium.runtime.glb']]);
if(detailPath)replacements.set('assets/atrium-detail.json',detailPath);
async function mirror(relative=''){
 const destination=out+'/web/public'+(relative?'/'+relative:'');await mkdir(destination);
 for(const entry of await readdir(root+'/web/public'+(relative?'/'+relative:''),{withFileTypes:true})){
  const key=(relative?relative+'/':'')+entry.name,source=replacements.get(key)||root+'/web/public/'+key;
  if([...replacements.keys()].some(p=>p.startsWith(key+'/')))await mirror(key);
  else await symlink(source,out+'/web/public/'+key,entry.isDirectory()?'dir':'file');
 }
}
await mirror();
const catalog=JSON.stringify(candidate,null,2)+'\n';await writeFile(out+'/web/starter-challenges.json',catalog);
const proof={purpose:'Private unvalidated candidate catalog and matching browser assets for runtime verification; not a release.',sourceCatalogSha256:hash(catalogBytes),catalogSha256:hash(Buffer.from(catalog)),layoutSha256:hash(layout),stationSha256:hash(station),atriumSha256:hash(art),detailMetadata:detailPath?{path:detailPath,sha256:hash(detailBytes),geometryUnchanged:true}:null,onlyChangedCourseField:'layout',courses:candidate.length,environment:{KYOTO_LAYOUT:layoutPath,KYOTO_DATA_DIR:out+'/data',KYOTO_WORKER_LOG:out+'/worker.log'},testingEnvironment:{KYOTO_TEST_DATA_DIR:out+'/data'},server:root+'/web/server.ts',workingDirectory:out};
await writeFile(out+'/candidate-runtime.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
