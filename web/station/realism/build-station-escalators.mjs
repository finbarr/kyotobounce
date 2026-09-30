// Complete the original Hachijo stair halls, using the municipal reference plan.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),raw=await readFile(m.layout),layout=JSON.parse(raw);assert.equal(sha(raw),m.layoutSha256);assert(out.startsWith('.local/'));
const prefix='station-escalators-',H=3.675,old=layout.escalators.find(e=>e.id==='hachijo-escalators-west-up');assert(old.height===H&&old.uphill.x===1&&old.uphill.z===0);
const template=layout.panels.filter(p=>p.id.startsWith(old.id+'-'));assert.equal(template.length,163);
const retiredIds=['hachijo-terrace-station-pavement',...[-1,1].map(s=>'hachijo-terrace-hall-wall-'+s+'-north'),...['west','east'].flatMap(s=>['enclosure--188.38','glazing--188.38','roof'].map(n=>'hachijo-terrace-station-'+s+'-'+n))];assert(retiredIds.length===9&&retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
const select=id=>layout.panels.find(p=>p.id===id),sourceMaterials=[...new Set([...template,...retiredIds.map(select)].map(p=>p.appearance))].map(id=>layout.authoredMaterials.find(m=>m.id===id));
const materials=sourceMaterials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic},...(r.linearColor.a<1?{alphaMode:'BLEND',doubleSided:true}:{})}));
const fixture=materials.length;materials.push({name:'Station stair halls | diffuser',pbrMetallicRoughness:{baseColorFactor:[.9,.9,.84,1],roughnessFactor:.6,metallicFactor:0},emissiveFactor:[.9,.9,.82]});
const index=p=>sourceMaterials.findIndex(m=>m.id===p.appearance),stone=index(select('hachijo-terrace-hall-wall--1-north')),roof=index(select('hachijo-terrace-station-west-roof')),glass=index(select('hachijo-terrace-station-west-glazing--188.38')),metal=index(template.find(p=>p.id.endsWith('upper-pit-cover')));
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],point=(x,y,z)=>({x,y,z}),lights=[],routes=[];
const slab=(id,poly,y,depth,mi=stone,role='public-floor',holes=[])=>{c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);c.panels.at(-1).material=mi===metal?'steel':mi===glass?'glass':'stone';};
const box=(id,a,b,d,e,top,bottom,mi=stone,role='wall')=>slab(id,rect(a,b,d,e),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=metal,role='structure')=>{c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);c.panels.at(-1).material=mi===glass?'glass':'steel';};
function route(label,ps){const points=[ps[0]];for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/14);for(let k=1;k<=n;k++)points.push(point(a.x+(b.x-a.x)*k/n,a.y+(b.y-a.y)*k/n,a.z+(b.z-a.z)*k/n));}routes.push({label,points},{label:label+' return',points:points.toReversed()});}
// Copy the already verified 3.675 m mechanism by rigid transform. Both original
// station lanes are labelled UP in the city's plan, unlike the terrace pairs.
const banks=[{name:'west',edge:-69,d:1},{name:'east',edge:-57,d:-1}],escalators=[],combSupports=[],pits=[];
const templateEnd=Math.max(...template.find(p=>p.id.endsWith('upper-pit-cover')).vertices.map(v=>v.x));
for(const bank of banks){
 const name=prefix+bank.name,z=-187.75,O=point(bank.edge-bank.d*(templateEnd-old.lowerCenter.x),0,z),world=v=>point(O.x+bank.d*(v.x-old.lowerCenter.x),v.y,z+bank.d*(v.z-old.lowerCenter.z));
 for(const p of template){c.add(p.id.replace(old.id,name),p.vertices.map(v=>{const q=world(v);return P(q.x,q.y,q.z);}),p.triangles.flatMap((_,i)=>i%3?[]:[p.triangles[i+2],p.triangles[i+1],p.triangles[i]]),index(p),p.role);Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
 const e={...old,id:name,lowerCenter:O,uphill:point(bank.d,0,0),speed:.5,status:'Upward station-side lane from Kyoto municipal Hachijo plan; fitted dimensions.'};escalators.push(e);
 for(const end of ['lower','upper']){const p=c.panels.find(p=>p.id===name+'-'+end+'-comb-transfer'),zs=p.vertices.map(v=>(v.x-O.x)*bank.d);combSupports.push({support:p.id,along:(Math.min(...zs)+Math.max(...zs))/2,length:Math.max(...zs)-Math.min(...zs)});}
 const pit=c.panels.find(p=>p.id===name+'-ground-pit'),xs=pit.vertices.map(v=>v.x);pits.push(rect(Math.min(...xs),Math.max(...xs),z-.55,z+.55));
 const lowerCover=c.panels.find(p=>p.id===name+'-lower-pit-cover'),end=bank.d>0?Math.min(...lowerCover.vertices.map(v=>v.x))-.1:Math.max(...lowerCover.vertices.map(v=>v.x))+.1,outer=bank.edge+bank.d*.3,a=Math.min(end,outer),b=Math.max(end,outer),stairEnd=bank.edge-bank.d*8.84,oldEnd=stairEnd-bank.d*.3;
 // Reuse the ASTY shop backs below the northern wall; their rooms and entrances
 // stay intact. A short eastern return closes only the added stair-hall corner.
 box(bank.name+'-north-upper',a,b,-187.06,-186.94,4.4,3.225);
 box(bank.name+'-north-glazing',a,b,-187.06,-186.94,7.175,4.4,glass);
 if(bank.name==='east')box('east-north-ground-return',-49,b,-187.06,-186.94,3.225,0);
 box(bank.name+'-roof',a,b,-192.68,-186.94,7.325,7.175,roof,'roof');
 box(bank.name+'-south-extension',Math.min(end,oldEnd),Math.max(end,oldEnd),-192.68,-192.56,4.4,0);
 box(bank.name+'-south-window',Math.min(end,oldEnd),Math.max(end,oldEnd),-192.68,-192.56,7.175,4.4,glass);
 box(bank.name+'-entry-head',end-.06,end+.06,-192.68,-186.94,4.4,3.1);
 box(bank.name+'-entry-window',end-.06,end+.06,-192.68,-186.94,7.175,4.4,glass);
 // Clear, tall upper opening beside the retained stair doorway.
 box(bank.name+'-hall-north-return',bank.edge-.08,bank.edge+.08,-187.05,-185,7.175,H);
 box(bank.name+'-hall-head',bank.edge-.08,bank.edge+.08,-188.5,-187.05,7.175,H+2.8);
 const combEnd=O.x+bank.d*(e.run+e.flatLength),x0=Math.min(combEnd,bank.edge),x1=Math.max(combEnd,bank.edge);
 box(bank.name+'-upper-apron',x0,x1,z-.61,z+.61,H,H-.035,metal,'public-floor');
 for(const zz of[z-.61,z+.61]){beam(bank.name+'-mouth-cap-'+zz,[combEnd,H+1.05,zz],[bank.edge,H+1.05,zz],.06,.06);beam(bank.name+'-mouth-glass-'+zz,[combEnd,H+.55,zz],[bank.edge,H+.55,zz],.024,.85,glass,'guard');}
 // Horizontal and vertical window frames follow the photographed stair halls.
 for(const yy of[4.4,5.75,7.15]){beam(bank.name+'-north-frame-'+yy,[a,yy,-187.02],[b,yy,-187.02],.05,.05);beam(bank.name+'-end-frame-'+yy,[end,yy,-192.65],[end,yy,-186.97],.05,.05);}
 for(let i=0;i<=4;i++){const x=a+(b-a)*i/4;beam(bank.name+'-north-mullion-'+i,[x,4.4,-187.02],[x,7.15,-187.02],.05,.05);}
 for(const [i,x]of [bank.edge-bank.d*3,bank.edge-bank.d*8].entries()){
  box(bank.name+'-fixture-'+i,x-.25,x+.25,-190.75,-190.25,7.13,7.095,fixture,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+bank.name+'-light-'+i,position:point(x,7.04,-190.5),direction:point(0,-1,0),linearColor:{r:1,g:.98,b:.9},intensity:14,range:10,spotAngle:120,innerSpotAngle:80});
 }
 const bottom=point(O.x-bank.d*(e.flatLength+1.15),0,z),head=point(bank.edge+bank.d*.6,H,z);
 route(bank.name+' escalator lower approach',[point(bottom.x,0,-194),point(bottom.x,0,-190.5),bottom]);
 route(bank.name+' escalator upper approach',[point(-63,H,-194),point(-63,H,z),head]);
}
// Split the original pavement at the hall centre: one machinery pit per slab.
for(const [i,a,b]of[[0,-90,-63],[1,-63,-36]])slab('station-pavement-'+i,rect(a,b,-203,-181),0,.3,stone,'public-floor',[pits[i]]);
const terrace=await read('.local/v2/current/components/hachijo-terrace/report.json');for(const r of terrace.geometry.routes.filter(r=>['station-west','station-east','Hall to terrace'].some(s=>r.label===s||r.label===s+' return')))routes.push(r);
route('ASTY east island exit',[point(-47,0,-179),point(-45.8,0,-181),point(-45.8,0,-188.7),point(-43,0,-190),point(-43,0,-194)]);
route('ASTY west forecourt entrance',[point(-85,0,-178),point(-85,0,-188),point(-83,0,-194)]);
for(const [label,x]of[['ASTY south shop 26',-75],['ASTY south shop 24',-54]])route(label,[point(x,0,-179),point(x,0,-184.5)]);
const report=await c.save(out,'station-escalators.glb',{componentPrefix:prefix,sourceCollection:'Original Hachijo stair halls and escalators',motionArchitecture:'stationEscalatorsV2',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Complete the two original Hachijo stair halls with upward escalators, shared glazed enclosures and clear ASTY receiving routes.',geometry:{H,banks,routes,spawn:m.spawn,retiredIds,retiredLights:[]},references:['https://www.city.kyoto.lg.jp/gyozai/cmsfiles/contents/0000294/294495/zumen.pdf','research/kyoto-station/plans/hachijo-terrace-advertising-plan-2026.pdf','https://www.asty-kyoto.co.jp/asty_kyoto/floor_guide/'],limits:['The municipal plan and photographs establish northern escalator placement, upward directions and shared stair enclosures. Dimensions and registration are fitted.','ASTY room shells remain unchanged. The eastern public exit turns around the completed stair-hall ground landing.']});
const native=await read(out+'/native-panels.json');native.authoredLights=lights;const nr=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',nr);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/motion.json',JSON.stringify({escalators,combSupports})+'\n');await writeFile(out+'/removal-spec.json',JSON.stringify({parentLayoutSha256:m.layoutSha256,retiredIds,retiredLights:[]},null,2)+'\n');console.log({panels:c.panels.length,triangles:report.geometry.triangles,retired:retiredIds.length,lanes:escalators.length,routes:routes.length});
