// The western roof entrance descends to the 11F restaurant aisle and atrium.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),s=await read(out+'/spec.json');assert.equal(s.parentLayoutSha256,m.layoutSha256);
const material=(name,color,roughness=.6,metallic=0)=>({name:'Garden store '+name,pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[material('ivory stone',[.67,.65,.6,1]),material('warm wall',[.59,.57,.53,1]),material('steel',[.36,.38,.39,1],.25,.8),{...material('glass',[.65,.78,.82,.2],.13),alphaMode:'BLEND',doubleSided:true},material('dark nosing',[.045,.05,.055,1]),{...material('ceiling diffuser',[.8,.76,.65,1]),emissiveFactor:[.5,.43,.31]},material('recessed frontage',[.2,.16,.115,1])];
const c=construction(materials,{flatNormals:true}),prefix=s.componentPrefix,F=s.floor,G=s.gardenFloor,X=s.startX,E=s.endX,Z=s.centerZ;
const P=(x,y,z)=>[x,y,-z],point=(x,y,z)=>({x,y,z});
const rect=(a,b,d,e)=>({type:'Polygon',coordinates:[[[a,d],[b,d],[b,e],[a,e],[a,d]]]});
function slab(id,shape,y,depth,mi=0,role='floor'){
 if(shape.type==='MultiPolygon'){shape.coordinates.forEach((q,i)=>slab(id+'-'+i,{type:'Polygon',coordinates:q},y,depth,mi,role));return;}
 const rings=shape.coordinates.map(r=>r.slice(0,-1).map(([x,z])=>P(x,y,z)));c.slab(prefix+id,rings[0],rings.slice(1),depth,mi,role);
}
const box=(id,a,b,d,e,low,high,mi=1,role='wall')=>slab(id,rect(a,b,d,e),high,high-low,mi,role);
const beam=(id,a,b,width=.05,height=.05,mi=2)=>c.beam(prefix+id,P(...a),P(...b),width,height,mi,'guard');
slab('roof-landing',s.roofFloor,G,.32);
slab('hall-infill',s.infill,F,.32);
// Open lower landing under the stair; the public route turns south into the
// east-west restaurant aisle shown on the operator's floor plan.

const stepIds=[];
for(let i=0;i<s.steps;i++){
 const id='step-'+String(i).padStart(2,'0'),a=X-(i+1)*s.tread,b=X-i*s.tread,y=F+(i+1)*s.rise;stepIds.push(prefix+id);
 box(id,a,b,Z-1.9,Z+1.9,y-.28,y,0,'stair');
 box('nosing-'+i,b-.048,b-.023,Z-1.88,Z+1.88,y-.002,y+.002,4,'stair-detail');
}
for(const sign of [-1,1]){
 const z=Z+sign*1.97;
 beam('stair-rail-'+sign,[X,F+1,z],[E,G+1,z]);
 c.slab(prefix+'stair-glass-'+sign,[P(X,F+.92,z-.014),P(E,G+.92,z-.014),P(E,G+.92,z+.014),P(X,F+.92,z+.014)],[],.82,3,'guard');
 for(let i=0;i<=7;i++){const t=i/7,x=X+(E-X)*t,y=F+(G-F)*t;beam(`stair-post-${sign}-${i}`,[x,y,z],[x,y+1,z]);}
}
// Tall pale stair enclosure and western glazing face the nonpublic roof.
box('stair-south-wall',-251,-237,-8.58,-8.4,F,G+4.35);
box('stair-exit-lintel',-237,-233,-8.58,-8.4,F+3.5,G+4.35);
box('stair-north-wall',-244,-233,-1.7,-1.52,F,G+4.35);
box('stair-inner-north-wall',E,-233,-3.4,-3.2,F,G+4.15);
for(const z of [-7.9,-3.7]){
 box('upper-well-glass-'+z,E,-244,z-.015,z+.015,G+.05,G+1.07,3,'guard');
 beam('upper-well-rail-'+z,[E,G+1.1,z],[-244,G+1.1,z]);
}
box('stair-east-lintel',-233.18,-233,-8.4,-1.7,F+3.5,G+4.35);
box('west-sill',-251.18,-251,-8.4,5.4,G,G+.4);
box('west-glazing',-251.12,-251.08,-8.4,5.4,G+.4,G+3.9,3,'window');
for(let i=0;i<=6;i++){const z=-8.4+13.8*i/6;beam('west-mullion-'+i,[-251.1,G+.4,z],[-251.1,G+3.9,z],.08,.08);}
box('roof-north-wall',-251,-244,5.4,5.58,G,G+4.35);
box('roof-ceiling',-251,-233,-8.4,-1.7,G+4.15,G+4.35);
box('lobby-ceiling',-251,-244,-1.7,5.4,G+4.15,G+4.35);
// Open two-metre door portal into the existing western promenade.
box('entry-south-jamb',-244.08,-243.92,-1.7,.7,G,G+3.1);
box('entry-north-jamb',-244.08,-243.92,3.3,5.4,G,G+3.1);
box('entry-transom',-244.08,-243.92,.7,3.3,G+2.7,G+4.15,3,'window');
box('entry-head',-244.1,-243.9,.65,3.35,G+2.6,G+2.7,2);
// Restaurant aisle perimeter: the eastern mouth opens onto the retained
// upper atrium floor. The northern opening receives the roof stair.
box('hall-south-wall',-244,-158,-18.18,-18,F,F+3.5);
box('hall-north-west',-244,-240,-10,-9.82,F,F+3.5);
box('hall-north-east',-233,-153,-10,-9.82,F,F+3.5);
box('hall-west-wall',-244.18,-244,-18,-10,F,F+3.5);
box('landing-west-return',-240.18,-240,-10,-8.4,F,F+3.5);
box('landing-east-return',-233,-232.82,-10,-3.2,F,F+3.5);
box('landing-north-return',-237,-233,-3.2,-3.02,F,F+3.5);
box('hall-ceiling',-244,-153,-18,-10,F+3.5,F+3.7);
box('landing-ceiling',-240,-233,-10,-8.4,F+3.5,F+3.7);
box('arrival-west-wall',-158.18,-158,-22.15,-18,F,F+2.7);
box('arrival-south-guard',-158,-147.8,-22.18,-22.15,F,F+1.1,3,'guard');
beam('arrival-south-rail',[-158,F+1.12,-22.165],[-147.8,F+1.12,-22.165]);
box('arrival-north-guard',-153,-147.8,-18.02,-17.98,F,F+1.1,3,'guard');
beam('arrival-north-rail',[-153,F+1.12,-18],[-147.8,F+1.12,-18]);
box('arrival-east-guard',-153.02,-152.98,-18,-10,F,F+1.1,3,'guard');
beam('arrival-east-rail',[-153,F+1.12,-18],[-153,F+1.12,-10]);
// Shallow frontage bays establish scale without claiming completed shops.
for(let i=0;i<10;i++){
 const a=-231+i*7.6,b=a+5.8;
 for(const [side,z]of [['south',-17.97],['north',-10.03]]){
  box(`frontage-${side}-${i}`,a,b,z-.015,z+.015,F+.22,F+2.8,6,'frontage');
  box(`frontage-head-${side}-${i}`,a-.06,b+.06,z-.055,z+.055,F+2.8,F+2.94,2,'frontage');
 }
 box('aisle-light-'+i,a,a+4.5,-14.6,-13.4,F+3.47,F+3.49,5,'ceiling-light');
}
for(let i=0;i<5;i++)box('stair-ceiling-light-'+i,-249+i*3,-248.8+i*3,-7.7,-3.8,G+4.1,G+4.13,5,'ceiling-light');
const stairs=Array.from({length:s.steps},(_,i)=>point(X-(i+.5)*s.tread,F+(i+1)*s.rise,Z));
const descent=[point(-239,G,2),point(-247.4,G,2),point(-247.4,G,Z),point(E-.6,G,Z),...stairs.toReversed(),point(X+.65,F,Z),point(-235,F,Z),point(-235,F,-14),point(-220,F,-14),point(-200,F,-14),point(-180,F,-14),point(-159,F,-14),point(-155,F,-14),point(-155,F,-20.8),point(-150,F,-21.2),point(-147.37,F,-21.2)];
const routes=[{label:'Western garden to upper atrium',points:descent},{label:'Western garden to upper atrium return',points:descent.toReversed()}];
const report=await c.save(out,'garden-store-entry.glb',{componentPrefix:prefix,sourceCollection:'Western garden stair and 11F hall',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the western garden entrance by an indoor stair to a public 11F aisle and the upper atrium.',geometry:{routes,chromeRoutes:routes.map(r=>r.label),headroomStairs:[],headroomRoutes:routes.map(r=>r.label),stair:{rise:s.rise,stepIds},blocked:[{label:'11F landing north guard',start:point(-150,F,-19),yaw:0,axis:'z',limit:-18.24,sign:-1},{label:'11F landing south guard',start:point(-153,F,-21),yaw:180,axis:'z',limit:-21.9,sign:1},{label:'Roof west glazing',start:point(-250,G,2),yaw:-90,axis:'x',limit:-250.87,sign:1}],spawn:m.spawn,retiredIds:s.retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(s.cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[]},references:['https://www.mistore.jp/store/kyoto/column_list_all/column08.html','https://www.kyoto-station-building.co.jp/floorguide/11f/?tenant=isetan','https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/'],limits:['Circulation follows the official plan; dimensions fit the existing station and are not surveyed. Restaurant interiors and the descending central escalator bank remain unfinished.']});
const native=await read(out+'/native-panels.json');for(const p of native.panels)p.material=p.browserMaterial===2?'steel':p.browserMaterial===3?'glass':'stone';
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['roof-door',[-239,G+1.65,2],[-249,G+1.65,2]],['stair-descent',[-247.4,G+1.65,Z],[-234,F+1,Z]],['lower-landing',[-234,F+1.65,Z],[-249,G+1,Z]],['restaurant-aisle',[-225,F+1.65,-14],[-155,F+1.65,-14]],['atrium-arrival',[-155,F+1.65,-20.8],[-146,F+1.65,-21.2]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles});
