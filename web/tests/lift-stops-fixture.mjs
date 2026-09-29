// Small native/browser fixture. No full-station copies are needed to verify
// floor selection, empty landing doors, ride presentation and recall.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {multiStopLift} from '../station/realism/multi-stop-lift-spec.mjs';
import {construction} from '../station/realism/component-mesh.mjs';
import {writeGLB} from '../../tools/optimize-browser-assets.mjs';
const out=process.argv[2];assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const stops=[['b3','B3 · Parking',0],['b2','B2 · Porta',3.5],['b1','B1 · Shops',7.3],['1','1F · Central Gate',12],['2','2F · Passage',19.35]].map(([id,label,height])=>({id,label,height}));
const lift=multiStopLift({id:'five-floor-test',origin:{x:0,y:0,z:0},stops});
const c=construction([{name:'Lift fixture stone',pbrMetallicRoughness:{baseColorFactor:[.5,.5,.5,1],roughnessFactor:.7,metallicFactor:0}}],{flatNormals:true});
for(const [i,s]of stops.entries())c.slab('lift-fixture-landing-'+i,[[-2.5,s.height,3.5],[2.5,s.height,3.5],[2.5,s.height,1.2],[-2.5,s.height,1.2]],[],.2,0,'floor');
await c.save(out,'fixture.glb',{scope:'Five-floor verification fixture; synthetic dimensions, not station construction'});
const {panels}=JSON.parse(await readFile(out+'/native-panels.json'));
const layout={schemaVersion:1,boxes:[],beams:[],flights:[],escalators:[],panels,lifts:[lift],spawn:{x:0,y:0,z:-2.8},authoredLights:[],authoredMaterials:[]};
const bytes=JSON.stringify(layout)+'\n',sha=hash(bytes);
await writeFile(out+'/station-layout.json',bytes);await writeFile(out+'/lift-spec.json',JSON.stringify(lift)+'\n');
await mkdir(out+'/public/assets/runtime',{recursive:true});
await writeFile(out+'/public/assets/runtime/atrium.glb',await readFile(out+'/fixture.glb'));
await writeFile(out+'/public/assets/runtime/atrium-detail.glb',writeGLB({asset:{version:'2.0'},scene:0,scenes:[{nodes:[]}],nodes:[]},Buffer.alloc(0)));
await writeFile(out+'/public/assets/atrium-detail.json',JSON.stringify({sourceLayoutSha256:sha,combSupports:[]})+'\n');
await writeFile(out+'/public/assets/station.json',JSON.stringify({...layout,layoutSha256:sha})+'\n');
const build=JSON.parse(await readFile('web/public/browser-build.json'));
for(const f of ['assets/runtime/atrium.glb','assets/runtime/atrium-detail.glb','assets/station.json','assets/atrium-detail.json']){const b=await readFile(out+'/public/'+f);build.files['web/public/'+f]={bytes:b.length,sha256:hash(b)};}
await writeFile(out+'/public/browser-build.json',JSON.stringify(build)+'\n');
await writeFile(out+'/assets.json',JSON.stringify({spawn:layout.spawn,layoutSha256:sha,geometrySha256:hash(await readFile(out+'/fixture.glb'))})+'\n');
console.log({layout:sha,parts:lift.parts.length,landingTriangles:panels.reduce((n,p)=>n+p.triangles.length/3,0)});
