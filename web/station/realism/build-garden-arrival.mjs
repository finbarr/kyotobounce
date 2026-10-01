// Replace the provisional tall garden screens with photographed low lawn rails.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';

const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),raw=await readFile(parent.layout);assert.equal(sha(raw),parent.layoutSha256);
const layout=JSON.parse(raw),prefix='garden-arrival-',floor=layout.panels.find(p=>p.id==='garden-promenade-public-floor');
const F=Math.max(...floor.vertices.map(v=>v.y)),retiredIds=layout.panels.filter(p=>p.id.startsWith('garden-promenade-add-garden-screen')).map(p=>p.id);
assert.equal(retiredIds.length,18);
const spec={componentPrefix:prefix,parentLayoutSha256:parent.layoutSha256,floor:F,retiredIds,retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],railHeight:.58,railRadius:.025};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');
const material=(name,color,roughness,metallic=0)=>({name:'Garden arrival | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const c=construction([material('muted yellow enamel',[.48,.44,.14],.58,.05),material('pale footings',[.52,.52,.48],.78),material('fixing steel',[.16,.18,.17],.4,.7)],{flatNormals:true});
const P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:F,z});
function tube(id,a,b,radius,mi=0){
 const A=new T.Vector3(...P(...a)),B=new T.Vector3(...P(...b)),direction=B.clone().sub(A),g=new T.CylinderGeometry(radius,radius,direction.length(),24,1,false);
 g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());
 const v=g.attributes.position;c.add(prefix+id,Array.from({length:v.count},(_,i)=>[v.getX(i),v.getY(i),v.getZ(i)]),Array.from(g.index.array),mi,'garden-rail');c.panels.at(-1).material='steel';g.dispose();
}
function footing(id,x,z){
 c.slab(prefix+id,[P(x-.115,F+.06,z-.115),P(x+.115,F+.06,z-.115),P(x+.115,F+.06,z+.115),P(x-.115,F+.06,z+.115)],[],.06,1,'garden-rail-footing');c.panels.at(-1).material='stone';
 for(const dx of[-.07,.07])for(const dz of[-.07,.07]){tube(id+'-bolt-'+dx+'-'+dz,[x+dx,F+.061,z+dz],[x+dx,F+.073,z+dz],.009,2);c.panels.at(-1).collision=false;}
}
// Fit each short rail to the southern edge of its retained lawn. The central
// garden entrance and the paved walk outside the lawn stay fully open.
// The retained western planter occupies the outer lawn corner. Inset that
// footing so its base and post remain clear of the planter wall.
const strips=[{name:'west',minX:-195.78,maxX:-192.04629516601562},{name:'east',minX:-175.9609375,maxX:-171.9921875}],Z=-18.08;
for(const s of strips){
 tube(s.name+'-top',[s.minX,F+.58,Z],[s.maxX,F+.58,Z],.025);
 const count=3;
 for(let i=0;i<count;i++){const x=s.minX+(s.maxX-s.minX)*i/(count-1);footing(s.name+'-foot-'+i,x,Z);tube(s.name+'-post-'+i,[x,F+.06,Z],[x,F+.58,Z],.021);}
}
const paths=[
 ['Eastern garden entry',[[-162,-23.8],[-181,-23.8],[-181,-20],[-181,-15]]],
 ['Western garden entry',[[-189,-23.8],[-189,-20],[-189,-15],[-185,-15]]],
 // The retained western planting row reaches z=-20.34; cross on the paved
 // arrival south of it, along the line previously occupied by the screens.
 ['Garden arrival crosswalk',[[-200,-21.25],[-185,-21.25],[-169.5,-21.25]]]
];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
const blocked=strips.map(s=>({label:s.name+' lawn rail',start:pt((s.minX+s.maxX)/2,-19),yaw:0,axis:'z',limit:-18.31,sign:-1}));
const report=await c.save(out,'garden-arrival.glb',{componentPrefix:prefix,sourceCollection:'Rooftop garden arrival and low lawn rails',builder:'web/station/realism/build-garden-arrival.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:parent.layoutSha256,scope:'Open the paved garden approach by replacing the tall provisional screens with low rails fitted to the southern lawn edges.',geometry:{spawn:parent.spawn,floor:F,routes,chromeRoutes:routes.map(r=>r.label),blocked,retiredIds,retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[]},references:['https://www.kyoto-station-building.co.jp/service/square/','https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/'],limits:['Rail height, tube diameter and footing spacing are fitted estimates from photographs.','The retained lawn, bamboo beds and seating are approximate; their arrangement is unchanged in this increment.']});
await writeFile(out+'/views.json',JSON.stringify([
 ['stair-arrival',[-163,F+1.65,-23.8],[-185,F+.8,-16]],
 ['open-east-entry',[-181,F+1.65,-23],[-181,F+.8,-11]],
 ['open-west-entry',[-189,F+1.65,-23],[-189,F+.8,-10]],
 ['west-lawn-rail',[-193,F+1.65,-20],[-194,F+.4,-18.08]],
 ['east-lawn-rail',[-174,F+1.65,-20],[-174,F+.4,-18.08]],
 ['garden-return',[-185,F+1.65,-15],[-181,F+.9,-24]]
 ],null,2)+'\n');
console.log({retired:retiredIds.length,panels:report.geometry.panels,triangles:report.geometry.triangles});
