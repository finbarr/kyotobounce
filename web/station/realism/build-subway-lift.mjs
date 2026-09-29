import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const material=(name,color,roughness=.55,metallic=0)=>({name:'Subway lift | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
const steel=mats.length;mats.push(material('steel',[.46,.49,.5],.3,.8));const dark=mats.length;mats.push(material('dark floor',[.11,.12,.12]));const ceiling=mats.length;mats.push(material('ceiling',[.74,.74,.7]));const button=mats.length;mats.push(material('button',[.1,.22,.45]));const wall=mats.length;mats.push(material('enclosure',[.65,.64,.55]));
const c=construction(mats,{flatNormals:true}),prefix='subway-lift-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]];
const slab=(id,poly,y,depth,mi,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=wall,role='wall')=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
for(const p of [...s.slabs,...s.joints]){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab(p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));Object.assign(c.panels.at(-1),{material:p.material,collision:p.collision});}
// Open both existing hall end walls into one short vestibule.
for(const [i,p]of s.walls.entries()){
 const zs=p.vertices.map(v=>v.z),top=Math.max(...p.vertices.map(v=>v.y)),bottom=Math.min(...p.vertices.map(v=>v.y));
 for(const[a,b,label]of[[163,175.3,'west'],[178.7,190,'east']])box('retained-wall-'+i+'-'+label,a,b,Math.min(...zs),Math.max(...zs),top,bottom);
 box('vestibule-lintel-'+i,175.3,178.7,Math.min(...zs),Math.max(...zs),top,bottom+2.45);
}
for(const [a,b,side]of[[175.25,175.4,'west'],[178.6,178.75,'east']])box('vestibule-'+side,a,b,2,4.75,-2.8,-6.2);
box('vestibule-ceiling',175.3,178.7,2,4,-2.65,-2.8,ceiling,'ceiling');
// Continuous shaft enclosure, with two guarded landing apertures.
for(const[a,b,side]of[[175.25,175.4,'west'],[178.6,178.75,'east']])box('shaft-'+side,a,b,4.75,7.8,-2.8,-11.65);
box('shaft-back',175.4,178.6,7.65,7.8,-2.8,-11.65);box('shaft-roof',175.25,178.75,4.75,7.8,-2.65,-2.8,ceiling,'shaft-roof');
box('pit-base',175.4,178.6,4.75,7.65,-11.55,-11.7,dark,'pit-floor');
for(const[a,b,side]of[[175.25,176.3,'west'],[177.7,178.75,'east']])box('front-'+side,a,b,4.75,4.9,-2.8,-11.65);
for(const[a,b,label]of[[-11.65,-11.2,'bottom'],[-9,-6.2,'between'],[-4,-2.8,'top']])box('front-'+label,176.3,177.7,4.75,4.9,b,a);
for(const [floor,name]of[[-11.2,'platform'],[-6.2,'concourse']]){
 box(name+'-sill',176.25,177.75,4.70,5.115,floor,floor-.12,steel,'lift-sill');
 for(const x of[176.26,177.74])box(name+'-jamb-'+x,x-.035,x+.035,4.70,4.92,floor+2.25,floor,steel,'lift-frame');
 box(name+'-head',176.225,177.775,4.70,4.92,floor+2.28,floor+2.18,steel,'lift-frame');
 box(name+'-call-plate',178.0,178.18,4.68,4.71,floor+1.27,floor+.95,steel,'call-button');
 box(name+'-call-button',178.045,178.135,4.66,4.68,floor+1.17,floor+1.06,button,'call-button');
 box(name+'-indicator',176.8,177.2,4.68,4.70,floor+2.60,floor+2.36,button,'lift-indicator');
 box(name+'-warning',176.25,177.75,4.03,4.4,floor+.006,floor,dark,'floor-marker');c.panels.at(-1).collision=false;
}
for(const p of c.panels)if(p.id.startsWith(prefix)&&!s.slabs.concat(s.joints).some(r=>prefix+r.id===p.id))p.material=p.browserMaterial===steel?'steel':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Central 1 hall to lift landing',[point(168,-6.2,-7),point(168,-6.2,0),point(177,-6.2,0),point(177,-6.2,3.4)]);
for(const x of[172.3,181.7])pair('Platform aisle beside lift '+x,[point(x,-11.2,-1.5),point(x,-11.2,14)]);
pair('Platform to lift threshold',[point(177,-11.2,1.8),point(177,-11.2,3.4)]);
const report=await c.save(out,'subway-lift.glb',{componentPrefix:prefix,sourceCollection:'Central 1 passenger lift',builder:import.meta.url,builderSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),sourceLayoutSha256:m.layoutSha256,scope:'Operating passenger lift from the subway island platform to Central 1 via an enclosed vestibule.',geometry:{routes,spawn:point(177,-11.2,2.4),retiredIds:s.retiredIds,retiredLights:[]},references:['https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm','research/kyoto-station/maps/subway-kyoto-plan.pdf'],limits:['Placement and dimensions are fitted to the existing station, not surveyed.','This lift connects platform and Central 1; onward street and Porta lifts remain missing.']});
const native=await read(out+'/native-panels.json');native.authoredLights=[];const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=createHash('sha256').update(raw).digest('hex');await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/lift-spec.json',JSON.stringify(subwayLift())+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles});
