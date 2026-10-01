// Restore the southern public outlooks shown on the operator's rooftop plan.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construction} from './component-mesh.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),raw=await readFile(parent.layout);assert.equal(sha(raw),parent.layoutSha256);
const layout=JSON.parse(raw),prefix='garden-south-enclosure-',F=Math.max(...layout.panels.find(p=>p.id==='garden-promenade-public-floor').vertices.map(v=>v.y));
const retiredIds=layout.panels.filter(p=>/^garden-promenade-edge-(4|5)-/.test(p.id)).map(p=>p.id);
assert.equal(retiredIds.length,29);
const cuts={'municipal-station-wing-west-Untitled.203':[[[-202.31,-168],[F-.15,59.4],[-36.75,-24.999]]]};
const spec={componentPrefix:prefix,parentLayoutSha256:parent.layoutSha256,floor:F,retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[],retiredBoxIds:[],retiredSourceOnlyIds:[],cuts,west:-202.3,east:-168,south:-35.2,room:{west:-189.1,east:-183.3,north:-25.05,south:-36.3,height:4.58}};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');
const mat=(name,color,roughness=.75,metallic=0)=>({name:'Garden south | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const paving={name:'Rooftop garden | pale stone paving | Browser',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}};
assert(layout.authoredMaterials.some(m=>m.label===paving.name.replace(' | Browser','')));
const materials=[mat('warm concrete',[.42,.41,.38]),mat('cool concrete',[.395,.40,.395]),mat('pale coated metal',[.67,.69,.68],.62,.12),mat('dark joints',[.075,.085,.085]),mat('aluminium frames',[.36,.40,.41],.3,.65),{...mat('outlook glazing',[.67,.8,.83],.13),alphaMode:'BLEND',doubleSided:true},paving];
materials[5].pbrMetallicRoughness.baseColorFactor[3]=.18;
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:F,z});
function box(id,x0,x1,z0,z1,y0,y1,mi=0,role='wall',collision=true){assert(x1>x0&&z1>z0&&y1>y0,id);c.slab(prefix+id,[P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],[],y1-y0,mi,role);const p=c.panels.at(-1);p.material=mi===5?'glass':[2,4].includes(mi)?'steel':'stone';p.collision=collision;}
const {west:W,east:E,north:N,south:S,height:H}=spec.room;
// Floors meet the existing garden edge exactly and continue around both sides
// of the central roof room. The eastern floor also joins the stair arrival.
box('west-outlook-floor',spec.west,W,-35.2,-25,F-.62,F,6,'floor');
box('east-outlook-floor',E,spec.east,-35.2,-25,F-.62,F,6,'floor');
// Closed backing and roof replace the sliced-open municipal room. Panelled
// concrete and metal use the garden photographs; dimensions fit its old shell.
box('room-backing',W,E,S,N,F-.15,F+H,3);
box('room-roof',W-.05,E+.05,S-.04,N+.04,F+H,F+H+.07,2,'roof');
function wall(id,a,b,face,axis,sign,height=H){
 const q=d=>face+sign*d,range=(a,b)=>[Math.min(q(a),q(b)),Math.max(q(a),q(b))];
 const faceBox=(id,u0,u1,d0,d1,y0,y1,m,role='wall',collision=true)=>axis==='z'?box(id,u0,u1,...range(d0,d1),y0,y1,m,role,collision):box(id,...range(d0,d1),u0,u1,y0,y1,m,role,collision);
 const cols=Math.ceil((b-a)/2.1),width=(b-a)/cols;
 for(let i=0;i<cols;i++)for(let j=0;j<3;j++)faceBox(id+'-concrete-'+i+'-'+j,a+i*width+.006,a+(i+1)*width-.006,-.03,.06,F+j*.9+.006,F+(j+1)*.9-.006,(i+j)%2);
 faceBox(id+'-plinth',a,b,-.035,.068,F-.02,F+.12,3);
 faceBox(id+'-metal',a,b,-.03,.035,F+2.7,F+height,2);
 for(let y=F+2.75;y<F+height-.025;y+=.075)faceBox(id+'-rib-'+y,a,b,.035,.058,y,y+.022,2,'cladding',false);
 faceBox(id+'-cap',a-.035,b+.035,-.3,.09,F+height,F+height+.07,2,'roof');
}
wall('room-north',W,E,N,'z',1);wall('room-west',S,N,W,'x',-1);wall('room-east',S,N,E,'x',1);wall('room-south',W,E,S,'z',-1);
// Close the visible western room face and meet the retained garden boundary.
box('west-wall-backing',spec.west-.05,spec.west+.11,-35.2,-25,F-.15,F+H,3);
wall('west-boundary',-35.2,-25,spec.west+.14,'x',1);
// The southern viewing screens retain the visitor above the station tracks.
// A continuous sill, framed glazing and coping give each bay a real boundary.
for(const [name,a,b]of [['west',spec.west,W],['east',E,spec.east]]){
 const z=-35.2,sill=.5,head=2.62;
 box(name+'-screen-sill',a,b,z-.16,z+.13,F-.2,F+sill,0);
 box(name+'-screen-head',a,b,z-.16,z+.13,F+head,F+2.88,1);
 box(name+'-screen-coping',a-.02,b+.02,z-.2,z+.16,F+2.88,F+2.94,2,'roof');
 const n=Math.ceil((b-a)/1.45),w=(b-a)/n;
 for(let i=0;i<n;i++)box(name+'-screen-pane-'+i,a+i*w+.035,a+(i+1)*w-.035,z-.023,z+.023,F+sill+.035,F+head-.035,5,'window');
 for(let i=0;i<=n;i++)box(name+'-screen-mullion-'+i,a+i*w-.035,a+i*w+.035,z-.045,z+.045,F+sill,F+head,4,'frame');
 for(const y of[sill,head])box(name+'-screen-frame-'+y,a,b,z-.045,z+.045,F+y-.035,F+y+.035,4,'frame');
}
// Join the slightly deeper southern screen to the retained stair-arrival guard.
box('east-screen-end',-168.055,-167.945,-35.2,-34.97,F,F+2.88,2);
const paths=[
 ['Garden to western south outlook',[[-195,-21.25],[-195,-27],[-195,-34.45],[-200.8,-34.45]]],
 ['Garden to eastern south outlook',[[-181,-21.25],[-179,-27],[-179,-34.45],[-170,-34.45]]],
 ['Stair arrival to southern court',[[-162,-23.8],[-165,-29],[-170,-29],[-180,-29],[-180,-23.8]]]
];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
const blocked=[{label:'Western south viewing screen',start:pt(-195,-34.2),yaw:180,axis:'z',limit:-34.84,sign:1},{label:'Eastern south viewing screen',start:pt(-175,-34.2),yaw:180,axis:'z',limit:-34.84,sign:1},{label:'Closed central roof room',start:pt(-186,-24),yaw:180,axis:'z',limit:-24.78,sign:1}];
const report=await c.save(out,'garden-south-enclosure.glb',{componentPrefix:prefix,sourceCollection:'Southern rooftop outlooks and central enclosure',builder:'web/station/realism/build-garden-south-enclosure.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:parent.layoutSha256,scope:'Open both southern rooftop outlooks from the garden, replace the broken central roof shell, and fit glazed viewing boundaries.',geometry:{spawn:parent.spawn,floor:F,routes,chromeRoutes:routes.map(r=>r.label),blocked,retiredIds,retiredLights:[],modifiedPanelIds:Object.keys(cuts),modifiedFlightIds:[]},references:['https://www.kyoto-station-building.co.jp/floorguide/rf/','https://www.kyoto-station-building.co.jp/service/square/','https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/'],limits:['Southern public route and central projection follow the operator map; dimensions fit the municipal shell and are not surveyed.','Concrete, ribbed metal and glazed south outlooks are supported by the 2019 photographs; exact frame divisions are approximate.']});
// Reuse the existing packed paving maps and their world-aligned UVs. Composition
// resolves the exact material name against the parent; no images are duplicated.
const native=await read(out+'/native-panels.json'),{json:j,bin}=readGLB(await readFile(out+'/'+report.outputs.glbFile)),p=j.meshes[6].primitives[0],pos=j.accessors[p.attributes.POSITION],bv=j.bufferViews[pos.bufferView],uvs=Buffer.alloc(pos.count*8);
for(let i=0;i<pos.count;i++){const at=(bv.byteOffset||0)+i*12;uvs.writeFloatLE((bin.readFloatLE(at)+202.3)/2.4,i*8);uvs.writeFloatLE((-bin.readFloatLE(at+8)+25)/2.4,i*8+4);}
p.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:j.bufferViews.length,componentType:5126,count:pos.count,type:'VEC2'});j.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:uvs.length,target:34962});j.buffers[0].byteLength+=uvs.length;
for(const p of native.panels.filter(p=>p.browserMaterial===6))p.uv=p.vertices.map(v=>({x:Math.fround((Math.fround(v.x)+202.3)/2.4),y:1-Math.fround((Math.fround(v.z)+25)/2.4)}));
const glb=writeGLB(j,Buffer.concat([bin,uvs])),nr=JSON.stringify(native)+'\n';await writeFile(out+'/'+report.outputs.glbFile,glb);await writeFile(out+'/native-panels.json',nr);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(nr);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
await writeFile(out+'/views.json',JSON.stringify([
 ['garden-return',[-185,F+1.65,-15],[-181,F+1.8,-29]],['west-outlook-entry',[-195,F+1.65,-22],[-195,F+1.5,-36]],['west-south-view',[-195,F+1.65,-33.6],[-195,F+.2,-45]],['east-outlook-entry',[-178,F+1.65,-22],[-178,F+1.5,-36]],['east-south-view',[-175,F+1.65,-33.6],[-175,F+.2,-45]],['central-enclosure',[-176,F+1.65,-31],[-187,F+2,-28]],['arrival-connection',[-172,F+1.65,-29],[-160,F+1,-26]]
],null,2)+'\n');
console.log({retired:retiredIds.length,panels:report.geometry.panels,triangles:report.geometry.triangles});
