// Connect the corrected Grand Stairway landing to the retained rooftop garden.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {readGLB} from '../../../tools/optimize-browser-assets.mjs';

const [manifest,out]=process.argv.slice(2);
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),s=await read(out+'/spec.json'),l=await read(m.layout);
assert.equal(s.parentLayoutSha256,m.layoutSha256);
const base=readGLB(await readFile(m.geometry)).json;
const materials=s.materials.map(r=>{
 const original=base.materials.find(m=>m.name.replace(/ \| Browser$/,'')===r.label);assert(original);
 return {...original,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}};
});
const index=id=>{const i=s.materials.findIndex(r=>r.id===id);assert(i>=0);return i;};
const paving=index('station-additions-garden-paving'),steel=index('garden-garden-steel'),glass=index('garden-garden-guard-glazing');
const c=construction(materials,{flatNormals:true}),prefix=s.componentPrefix;
const P=(x,y,z)=>[x,y,-z],F=s.floor,G=s.gardenFloor,X=s.startX,E=s.endX,Z=s.centerZ;
const slab=(id,shape,y,depth,mi,role)=>{const rings=shape.coordinates.map(r=>r.slice(0,-1));c.slab(prefix+id,rings[0].map(([x,z])=>P(x,y,z)),rings.slice(1).map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);};
const rectangle=(a,b,d,e)=>({coordinates:[[[a,d],[b,d],[b,e],[a,e],[a,d]]]});
const beam=(id,a,b,width,height,mi=steel,role='garden-guard')=>c.beam(prefix+id,P(...a),P(...b),width,height,mi,role);
slab('garden-floor',s.gardenAfter,G,.3,paving,'garden-floor');
slab('arrival-infill',s.infill,F,.32,paving,'landing');
const stepIds=[];
for(let i=0;i<s.steps;i++){
 const id='step-'+String(i).padStart(2,'0');stepIds.push(prefix+id);
 slab(id,rectangle(X-(i+1)*s.tread,X-i*s.tread,Z-1.3,Z+1.3),F+(i+1)*s.rise,.3,paving,'garden-stair');
}
// Sloping passenger rails and infill guards follow the new flight. Upper well
// guards enclose the opening on three sides; the western arrival stays open.
for(const sign of [-1,1]){
 const z=Z+sign*1.35;
 beam('stair-rail-'+sign,[X,F+1,z],[E,G+1,z],.05,.05);
 for(let i=0;i<=7;i++){
  const t=i/7,x=X+(E-X)*t,y=F+(G-F)*t;
  beam(`stair-post-${sign}-${i}`,[x,y,z],[x,y+1,z],.05,.05);
 }
 // A sloped closed glass prism leaves the full walking width clear.
 c.slab(prefix+'stair-infill-'+sign,[P(X,F+.9,z-.016),P(E,G+.9,z-.016),P(E,G+.9,z+.016),P(X,F+.9,z+.016)],[],.82,glass,'garden-guard');
 const edge=Z+sign*1.475;
 beam('well-rail-'+sign,[X+.1,G+1.1,edge],[E,G+1.1,edge],.055,.055);
 slab('well-glass-'+sign,rectangle(E,X+.1,edge-.016,edge+.016),G+1.05,.99,glass,'garden-guard');
 for(let i=0;i<=7;i++){
  const x=X+.1+(E-X-.1)*i/7;
  beam(`well-post-${sign}-${i}`,[x,G,edge],[x,G+1.1,edge],.05,.05);
 }
}
beam('well-end-rail',[X+.135,G+1.1,Z-1.475],[X+.135,G+1.1,Z+1.475],.055,.055);
slab('well-end-glass',rectangle(X+.119,X+.151,Z-1.475,Z+1.475),G+1.05,.99,glass,'garden-guard');
for(const [i,[a,b]]of s.lowerGuardEdges.entries()){
 beam('apron-rail-'+i,[...a.slice(0,1),F+1,a[1]],[b[0],F+1,b[1]],.05,.05);
 beam('apron-post-'+i,[b[0],F,b[1]],[b[0],F+1,b[1]],.05,.05);
}
const point=(x,y,z)=>({x,y,z}),steps=Array.from({length:s.steps},(_,i)=>point(X-(i+.5)*s.tread,F+(i+1)*s.rise,Z));
const final=[point(-147.37,F,-21.2),point(-147.3,F,Z),point(X+.35,F,Z),...steps,point(E-.8,G,Z),point(-160,G,Z)];
const routes=[{label:'Upper landing to rooftop garden',points:final},{label:'Upper landing to rooftop garden return',points:final.toReversed()}];
const flights=Array.from({length:14},(_,i)=>l.flights.find(f=>f.id==='daikaidan-flight-'+String(i+1).padStart(2,'0')));assert(flights.every(Boolean));
const grand=flights.flatMap(f=>f.contours.map((r,i)=>{const k=(r.points.length-1)*.75;assert(Number.isInteger(k));return point(r.points[k].x,f.baseElevation+i*f.rise,r.points[k].y);}));
const [a,b]=grand,d=Math.hypot(b.x-a.x,b.z-a.z);grand.unshift(point(a.x-(b.x-a.x)/d*.7,a.y,a.z-(b.z-a.z)/d*.7));
const full=[...grand,...final];
routes.push({label:'Muromachi Square to rooftop garden',points:full},{label:'Muromachi Square to rooftop garden return',points:full.toReversed()});
const report=await c.save(out,'garden-access.glb',{
 componentPrefix:prefix,sourceCollection:'Grand Stairway rooftop garden connection',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,
 scope:'Join the corrected upper Grand Stairway landing to the garden with a westward flight, close the former stair well, and preserve the garden furnishings.',
 geometry:{routes,chromeRoutes:routes.map(r=>r.label),headroomStairs:[],headroomRoutes:routes.slice(0,2).map(r=>r.label),generatedStairs:flights.map(f=>f.id),stair:{rise:s.rise,stepIds},blocked:[],spawn:point(-147.3,F,Z),retiredIds:s.retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(s.cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[]},
 references:['https://www.kyoto-station-building.co.jp/floorguide/rf/','https://www.kyoto-station-building.co.jp/service/square/'],
 limits:['The RF map establishes the final westward connection. Flight dimensions fit the retained landing and garden; they are not surveyed.']
});
const native=await read(out+'/native-panels.json');for(const p of native.panels)p.material=p.browserMaterial===steel?'steel':p.browserMaterial===glass?'glass':'stone';
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([
 ['upper-landing',[-146.8,F+1.65,Z],[-155,G-1,Z]],['garden-arrival',[-160,G+1.65,Z],[-148,F+2,Z]],
 ['garden-court',[-159,G+1.65,-24],[-155,G+1,-16]],['former-stair',[-156,G+1.65,-31],[-156,G+.5,-22]],
],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,rise:s.rise});
