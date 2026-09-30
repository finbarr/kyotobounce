// Panelled concrete and ribbed metal define the northern garden enclosure.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const m=await read(manifest),s=await read(out+'/spec.json');assert.equal(s.parentLayoutSha256,m.layoutSha256);
const mat=(name,c,roughness=.7,metallic=0)=>({name:'Garden roof '+name,pbrMetallicRoughness:{baseColorFactor:c,roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[
 mat('concrete warm',[.37,.355,.33,1]),mat('concrete pale',[.405,.39,.365,1]),
 mat('concrete cool',[.385,.38,.36,1]),mat('joint and plinth',[.075,.085,.085,1]),
 mat('pale coated metal',[.67,.68,.67,1],.62,.05),mat('frame',[.24,.28,.29,1],.3,.65),
 {...mat('view glazing',[.67,.8,.83,.18],.13),alphaMode:'BLEND',doubleSided:true},
 mat('view paving',[.54,.52,.475,1],.85)
];
const c=construction(materials,{flatNormals:true}),prefix=s.componentPrefix,G=s.floor,P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:G,z});
const box=(id,a,b,d,e,low,high,mi=0,role='wall')=>c.slab(prefix+id,[P(a,high,d),P(b,high,d),P(b,high,e),P(a,high,e)],[],high-low,mi,role);
const beam=(id,a,b,w=.055,h=.055,mi=5,role='frame')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
// The lower panels meet the public floor. A backing plate closes the narrow
// panel joints; the coarse roof room remains behind this fitted outer face.
box('main-backing',-190,-168,5.43,5.65,G-.3,G+2.76,3);
for(let col=0;col<10;col++)for(let row=0;row<3;row++){
 const a=-190+col*2.2+.008,b=-190+(col+1)*2.2-.008,low=G+row*.9+.008,high=G+(row+1)*.9-.008;
 box(`concrete-${col}-${row}`,a,b,5.32,5.45,low,high,(col+row*2)%3);
}
box('main-plinth',-190,-168,5.30,5.46,G-.03,G+.12,3);
box('main-metal',-190,-168,5.34,5.64,G+2.7,G+s.mainHeight,4);
// Shallow horizontal ribs follow the operator's garden-facing photographs.
for(let i=0;i<30;i++)box('metal-rib-'+i,-190,-168,5.305,5.35,G+2.73+i*.061,G+2.752+i*.061,4,'cladding');
for(let i=0;i<=10;i++){const x=-190+i*2.2;box('metal-seam-'+i,x-.014,x+.014,5.295,5.345,G+2.7,G+s.mainHeight,5,'cladding');}
box('roof-flashing',-190.05,-167.95,5.24,7.05,G+s.mainHeight,G+s.mainHeight+.06,4,'roof');
// Close the western end of the roof room beside the recessed viewing bay.
box('room-west-return',-190.2,-189.8,5.32,9.34,G-.3,G+2.7,1);
box('room-west-metal',-190.2,-189.8,5.32,9.34,G+2.7,G+s.mainHeight,4);
for(let i=0;i<30;i++)box('return-rib-'+i,-190.235,-190.19,5.32,9.34,G+2.73+i*.061,G+2.752+i*.061,4,'cladding');
// A floor collar reaches the rebuilt screen. The window retains the original
// horizontal registration, with a lower sill and three framed panes.
box('view-floor',...s.collar,G-.32,G,7,'floor');
const w=s.window;
box('view-sill',-201.9,-190,9,9.34,G-.32,G+w.sill,0);
box('view-lintel',-201.9,-190,9,9.34,G+w.head,G+2.96,1);
box('view-west-jamb',-201.9,w.minX,9,9.34,G+w.sill,G+w.head,2);
box('view-east-jamb',w.maxX,-190,9,9.34,G+w.sill,G+w.head,0);
box('view-coping',-201.96,-189.96,8.94,9.4,G+2.96,G+3.04,4,'roof');
box('view-west-return',-202.04,-201.9,8.3,9.34,G-.32,G+2.96,1);
for(let i=0;i<3;i++){
 const a=w.minX+i*1.2,b=a+1.2;
 box('view-glass-'+i,a+.035,b-.035,w.planeZ-.018,w.planeZ+.018,G+w.sill+.04,G+w.head-.04,6,'window');
}
for(let i=0;i<=3;i++){const x=w.minX+i*1.2;beam('view-mullion-'+i,[x,G+w.sill,w.planeZ],[x,G+w.head,w.planeZ],.065,.07);}
for(const y of [w.sill,w.head])beam('view-horizontal-'+y,[w.minX,G+y,w.planeZ],[w.maxX,G+y,w.planeZ],.07,.075);
// Recessed concrete joints on the opaque viewing-screen panels.
for(const [side,a,b]of [['west',-201.9,w.minX],['east',w.maxX,-190]]){
 for(let x=a+1.1;x<b-.1;x+=1.1)box(`view-joint-${side}-${x}`,x-.006,x+.006,8.992,9.004,G+.15,G+2.9,3,'joint');
 for(const y of [.9,1.8])box(`view-joint-${side}-${y}`,a,b,8.992,9.004,G+y-.006,G+y+.006,3,'joint');
}
const paths=[['Garden to northern window',[[-185,-10],[-185,3],[-195,3],[-195,8.5]]],['Northern garden frontage',[[-200,3],[-185,3],[-172,3]]]];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
// Start the reverse check on the main floor, walk to the window, then return.
// The shot-placement circle must fit one floor panel; walking crosses the seam.
routes[1].points.unshift(pt(-195,8));
const report=await c.save(out,'garden-roof-enclosure.glb',{componentPrefix:prefix,sourceCollection:'Northern garden enclosure and viewing screen',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Refit the garden-facing roof enclosure in panelled concrete and ribbed metal, and rebuild its supported northern viewing bay.',geometry:{routes,chromeRoutes:routes.map(r=>r.label),headroomStairs:[],generatedStairs:[],blocked:[{label:'Garden roof room wall',start:pt(-180,4.4),yaw:0,axis:'z',limit:5.08,sign:-1},{label:'Northern viewing screen',start:pt(-195,8),yaw:0,axis:'z',limit:8.79,sign:-1}],spawn:m.spawn,retiredIds:s.retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(s.cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[]},references:['https://www.kyoto-station-building.co.jp/service/square/','https://www.kyoto-station-building.co.jp/floorguide/rf/','https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/'],limits:['Panel sizes and window divisions are inferred from photographs and fitted to the existing roof. Northern roof equipment and western passage rooms remain coarse.']});
const native=await read(out+'/native-panels.json');for(const p of native.panels)p.material=[4,5].includes(p.browserMaterial)?'steel':p.browserMaterial===6?'glass':'stone';
const raw=JSON.stringify(native)+'\n';await writeFile(out+'/native-panels.json',raw);report.outputs.nativePanelsSha256=sha(raw);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([['court-north',[-185,G+1.65,-22],[-190,G+2.1,8.4]],['north-window',[-195,G+1.65,7.2],[-195,G+1.6,12]],['frontage',[-186,G+1.65,2.5],[-172,G+2.1,5.4]],['view-return',[-198,G+1.65,7.5],[-188,G+2.1,5.4]]],null,2)+'\n');
console.log({panels:report.geometry.panels,triangles:report.geometry.triangles});
