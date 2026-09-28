// Exercise the proposed shared floor seam. This small fixture deliberately does
// not accept the full station: old stairs/facades must be replaced before promotion.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PhysicsWorker} from '../../worker.ts';
const [layoutPath,component,out]=process.argv.slice(2);assert(layoutPath&&component&&out&&resolve(out).startsWith(resolve('.local')+'/'));
const bytes=await readFile(layoutPath),base=JSON.parse(bytes),nativeBytes=await readFile(component+'/native-panels.json'),native=JSON.parse(nativeBytes),build=JSON.parse(await readFile(component+'/report.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(bytes),build.parentLayoutSha256);assert.equal(sha(nativeBytes),build.outputs.nativePanelsSha256);
const y=build.floor.topY,retained=base.panels.filter(p=>p.id==='west-v2-upper-0'||p.id.startsWith('west-v2-guard-BuildingInstallation.1118-'));
assert(retained.length>1);const fixture={schemaVersion:base.schemaVersion,units:'metres',axes:base.axes,spawn:{x:-50,y:y+.1,z:-4},panels:[...retained,...native.panels],boxes:[],beams:[],flights:[],escalators:[],routes:[],authoredMaterials:base.authoredMaterials,authoredLights:[]};
await mkdir(out,{recursive:true});const fixtureBytes=Buffer.from(JSON.stringify(fixture)+'\n');await writeFile(out+'/fixture.json',fixtureBytes);
process.env.KYOTO_LAYOUT=resolve(out+'/fixture.json');process.env.KYOTO_WORKER_LOG=resolve(out+'/worker.log');
const worker=new PhysicsWorker(),id='west-plaza-seam',report={scope:'Isolated plaza/upper-landing seam and upper-landing guards only; no acceptance of adjoining stairs or the full station.',parentLayoutSha256:sha(bytes),componentSha256:sha(nativeBytes),fixtureSha256:sha(fixtureBytes),walks:[],pass:false};let state;
worker.on('message',m=>{if(m.type==='state'&&m.id===id)state=m;});
async function until(fn){const end=performance.now()+60000;while(!fn()){assert(performance.now()<end,'Native state timed out');await delay(30);}}
const player=()=>state.players.find(p=>p.id===id);
async function start(point){const placed=await worker.request({type:'place',id,slot:'start',radius:.3,origin:{...point,y:y+.5},direction:{x:0,y:-1,z:0}});assert(placed.ok);await worker.request({type:'design-start',id,start:placed.disk});await delay(250);}
async function walk(target,label){const row={label,start:player().feet,target,samples:[],pass:false};report.walks.push(row);const deadline=performance.now()+15000;
 while(true){const p=player().feet,d=Math.hypot(target.x-p.x,target.z-p.z);row.samples.push({...p});assert(Math.abs(p.y-y)<.1,'Floor height departure: '+JSON.stringify(p));if(d<.15)break;assert(performance.now()<deadline,'Blocked seam: '+JSON.stringify(p));worker.send({type:'input',id,x:0,z:Math.min(1,d/.6),yaw:Math.atan2(target.x-p.x,target.z-p.z)*180/Math.PI,pitch:0,fast:true});await delay(60);}
 worker.send({type:'input',id,x:0,z:0,fast:false});await delay(150);assert(player().grounded);row.pass=true;console.log('PASS',label,row.samples.length);
}
try{
 await worker.start();await until(()=>worker.ready);worker.send({type:'join',id});await until(()=>state?.players?.some(p=>p.id===id));
 for(const z of [-4,4,16]){const a={x:-50,y,z},b={x:-64,y,z};await start(a);await walk(b,`upper to plaza at Z=${z}`);await walk(a,`plaza to upper at Z=${z}`);}
 report.pass=true;
}catch(error){report.error=String(error);throw error;}finally{worker.stop();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
