// Complete the public crossing beneath Hachijo Street and correct its northern lift.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {construction} from './component-mesh.mjs';
import {subwayLift} from './subway-lift-spec.mjs';
import {readGLB,writeGLB} from '../../../tools/optimize-browser-assets.mjs';
const [manifest,specPath,out]=process.argv.slice(2),read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),m=await read(manifest),s=await read(specPath),layout=await read(m.layout);
assert(s.retiredIds.every(id=>!layout.panels.some(p=>p.id===id)));
const mats=s.materials.map(r=>({name:r.label,pbrMetallicRoughness:{baseColorFactor:['r','g','b','a'].map(k=>r.linearColor[k]),roughnessFactor:r.roughness,metallicFactor:r.metallic}}));
function mat(name,color,roughness=.6,metallic=0,extra={}){const i=mats.length;mats.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic},...extra});return i;}
const steel=mat('Subway lift | steel',[.46,.49,.5],.3,.8),dark=mat('Subway lift | dark floor',[.11,.12,.12]),ceiling=mat('Subway lift | ceiling',[.74,.74,.7]),button=mat('Subway lift | button',[.1,.22,.45]),wall=mat('Hachijo crossing | pale tile',[.68,.66,.59]),floor=mat('Hachijo crossing | floor',[.48,.47,.43],.45),tactile=mat('Hachijo crossing | tactile',[.75,.51,.07]),road=mat('Hachijo crossing | asphalt',[.09,.10,.11],.9),paint=mat('Hachijo crossing | road paint',[.84,.84,.76]),diffuser=mat('Hachijo crossing | diffuser',[.9,.9,.82],.5,0,{emissiveFactor:[.9,.9,.82]}),printed=mat('Hachijo crossing | directions',[1,1,1]);
const c=construction(mats,{flatNormals:true}),prefix='hachijo-crossing-',P=(x,y,z)=>[x,y,-z],rect=(a,b,d,e)=>[[a,d],[b,d],[b,e],[a,e]],L=s.lower,H=s.upper,roof=-2.8;
const slab=(id,poly,y,depth,mi=floor,role='floor',holes=[])=>c.slab(prefix+id,poly.map(([x,z])=>P(x,y,z)),holes.map(r=>r.map(([x,z])=>P(x,y,z))),depth,mi,role);
const box=(id,x0,x1,z0,z1,top,bottom,mi=wall,role='wall')=>slab(id,rect(x0,x1,z0,z1),top,top-bottom,mi,role);
const beam=(id,a,b,w,h,mi=steel,role='steelwork')=>c.beam(prefix+id,P(...a),P(...b),w,h,mi,role);
function rail(id,a,b){beam(id+'-top',[a[0],a[1]+1.05,a[2]],[b[0],b[1]+1.05,b[2]],.055,.055);beam(id+'-mid',[a[0],a[1]+.5,a[2]],[b[0],b[1]+.5,b[2]],.035,.035);const n=Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/1.7);for(let i=0;i<=n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n);beam(id+'-post-'+i,p,[p[0],p[1]+1.05,p[2]],.045,.045);}}
function boundary(id,a,b,top=0,bottom=L){beam(id,[a[0],(top+bottom)/2,a[1]],[b[0],(top+bottom)/2,b[1]],.16,top-bottom,wall,'retaining-wall');}
const faces=[];function sign(id,x,z,w,y,text){box(id,x-w/2,x+w/2,z-.025,z+.025,y+.42,y,printed,'sign');c.panels.at(-1).collision=false;faces.push({id:prefix+id,x,z,w,y,text});}
function strip(id,x0,x1,z0,z1,y=L,mi=tactile){box(id,x0,x1,z0,z1,y+.006,y,mi,'inlay');c.panels.at(-1).collision=false;}
for(const p of s.slabs){const rings=p.shape.coordinates.map(r=>r.slice(0,-1)),mi=s.materials.findIndex(m=>m.id===p.appearance);assert(mi>=0);slab('rebuilt-'+p.id,rings[0],p.top,p.top-p.bottom,mi,p.role,rings.slice(1));c.panels.at(-1).material=p.material;}
// Unpaid opening beside the retained stair and ticket machines.
box('lobby-return',161.9,170,-137.83,-137.67999267578125,roof,L);
const northLift=subwayLift({id:'subway-hachijo-east-lift',origin:{x:166,y:L,z:-189.8},height:H-L}),southLift=subwayLift({id:'subway-hachijo-south-lift',origin:{x:178,y:L,z:-236},height:H-L});
const shaft=l=>rect(l.origin.x-1.6,l.origin.x+1.6,l.origin.z-1.6,l.origin.z+1.35);
// Floor plates share edges and leave both lift pits open.
for(const[id,z0,z1]of[['station',-186.3,-137.67999267578125],['crossing',-229,-195]]){
 box(id+'-floor',155.6,161.9,z0,z1,L,L-.3,floor,'public-floor');box(id+'-ceiling',155.6,161.9,z0,z1,roof+.18,roof,ceiling,'ceiling');
 for(const x of[155.6,161.75])box(id+'-wall-'+x,x,x+.15,z0,z1,roof,L);
 strip(id+'-route',158.55,158.95,z0,z1);
 for(let z=z0+2;z<z1;z+=2){for(const[a,b]of[[155.76,158.55],[158.95,161.74]])strip(id+'-floor-joint-'+z+'-'+a,a,b,z-.012,z+.012,L,dark);box(id+'-ceiling-joint-'+z,155.76,161.74,z-.012,z+.012,roof,roof-.012,dark,'ceiling-joint');}
 for(const x of[155.78,161.72])box(id+'-dado-'+x,x-.018,x+.018,z0,z1,L+.22,L,dark,'skirting');
}
slab('north-lift-lobby',rect(155.6,170,-195,-186.3),L,.3,floor,'public-floor',[shaft(northLift)]);
slab('north-lift-ceiling',rect(155.6,170,-195,-186.3),roof+.18,.18,ceiling,'ceiling',[shaft(northLift)]);
box('north-lobby-west',155.6,155.75,-195,-186.3,roof,L);box('north-lobby-east',169.85,170,-195,-186.3,roof,L);
for(const z of[-195,-186.3])box('north-lobby-return-'+z,161.9,170,z-.075,z+.075,roof,L);
strip('north-lobby-route',158.55,158.95,-195,-186.3);strip('north-lift-spur',158.95,166.2,-192.7,-192.3);
const garden=[[155.6,-229],[164,-229],[174,-239],[174,-258],[148,-258],[148,-237]];
slab('garden-floor',garden,L,.35,floor,'sunken-garden-floor');
slab('south-lift-lobby',rect(174,182,-242,-232),L,.3,floor,'public-floor',[shaft(southLift)]);
slab('south-lift-ceiling',rect(174,182,-242,-232),roof+.18,.18,ceiling,'ceiling',[shaft(southLift)]);
box('south-lift-west',173.85,174,-239,-232,roof,L);box('south-lift-east',181.85,182,-242,-232,roof,L);
for(const z of[-242,-232])box('south-lift-end-'+z,174,182,z-.075,z+.075,roof,L);
// South pavement surrounds an open-air garden; the contour opens at the tunnel mouth.
const pavement=[[130,-229],[155.6,-229],[148,-237],[148,-258],[174,-258],[174,-239],[164,-229],[196,-229],[196,-270],[130,-270]];
slab('south-pavement',pavement,0,.35,floor,'street-floor',[shaft(southLift)]);
box('street',130,196,-229,-203,-.12,-.42,road,'road-floor');box('north-pavement-extension',178,196,-203,-184,0,-.3,floor,'street-floor');
for(const z of[-209.5,-216,-222.5])for(let x=132;x<192;x+=8)strip('lane-'+x+'-'+z,x,x+4,z-.06,z+.06,-.12,paint);
// A zebra crossing also lets players walk a complete surface/underground loop.
for(let z=-227.5;z<-204;z+=1.8)strip('zebra-'+z,184,188,z,z+.9,-.12,paint);
// Retaining edges and guarding exclude the public tunnel, shop portal and stair arrival.
// Close the earth above each lower opening while keeping the walking headroom clear.
boundary('garden-tunnel-lintel',[155.6,-229],[161.9,-229],0,roof);rail('garden-tunnel-upper-edge',[155.6,0,-229],[161.9,0,-229]);
boundary('garden-lift-lintel',[174,-239],[174,-242],0,roof);rail('garden-lift-upper-edge',[174,0,-239],[174,0,-242]);
boundary('garden-north-return',[161.9,-229],[164,-229]);rail('garden-north-return',[161.9,0,-229],[164,0,-229]);
for(const[id,a,b]of[['north-east',[164,-229],[174,-239]],['east',[174,-242],[174,-258]],['south-east',[174,-258],[155.5,-258]],['south-west',[150,-258],[148,-258]],['west-south',[148,-258],[148,-251]],['west-north',[148,-246],[148,-237]],['north-west',[148,-237],[155.6,-229]]]){boundary('garden-'+id,a,b);rail('garden-'+id,[a[0],0,a[1]],[b[0],0,b[1]]);}
// A high lintel continues the west wall over the Avanti entrance.
boundary('avanti-lintel',[148,-251],[148,-246],0,L+2.6);rail('avanti-upper-edge',[148,0,-251],[148,0,-246]);
box('avanti-foyer-floor',130,148,-255,-243,L,L-.3,floor,'public-floor');box('avanti-foyer-ceiling',130,148,-255,-243,roof+.18,roof,ceiling,'ceiling');
box('avanti-west',130,130.15,-255,-243,roof,L);for(const z of[-255,-243])box('avanti-end-'+z,130,148,z-.075,z+.075,roof,L);
// Keep the receiving lobby usable; the larger shopping floor is a later task.
for(const x of[133,138,143]){box('avanti-closed-front-'+x,x-1.9,x+1.9,-254.95,-254.90,L+2.45,L+.15,dark,'closed-shopfront');box('avanti-fascia-'+x,x-1.9,x+1.9,-254.92,-254.85,L+2.75,L+2.45,wall,'shop-fascia');}
const stair={x0:150,x1:155.5,start:-242,midA:-247.76,midB:-249.56,end:-255.32};
for(let f=0;f<2;f++){const z=f?stair.midB:stair.start,base=f?L/2:L;for(let i=0;i<18;i++)box('garden-step-'+f+'-'+i,stair.x0,stair.x1,z-(i+1)*.32,z-i*.32,base+(i+1)*(-L/36),base+(i+1)*(-L/36)-.3,floor,'stair-tread');for(const x of[150.2,155.3])rail('garden-flight-'+f+'-'+x,[x,base,z],[x,base-L/2,z-5.76]);}
box('garden-middle',150,155.5,stair.midB,stair.midA,L/2,L/2-.3,floor,'stair-landing');box('garden-upper-landing',150,155.5,-258,stair.end,0,-.3,floor,'stair-landing');
for(const x of[150.2,155.3]){rail('garden-middle-'+x,[x,L/2,stair.midA],[x,L/2,stair.midB]);rail('garden-upper-'+x,[x,0,stair.end],[x,0,-258]);}
for(const x of[150,155.5])box('garden-stair-side-'+x,x-.06,x+.06,-258,stair.start,0,L-.3,wall,'retaining-wall');
strip('garden-lower-warning',150.3,155.2,-241.73,-241.3);strip('garden-upper-warning',150.3,155.2,-258.7,-258.27,0);strip('garden-route',158.55,158.95,-240.2,-229);strip('garden-lift-spur',158.95,178.2,-240.2,-239.8);strip('garden-stair-spur',152.55,158.55,-240.2,-239.8);strip('garden-stair-route',152.55,152.95,-241.3,-240.2);
// Passenger lifts use identical native/browser movement definitions.
for(const [name,lift]of[['north',northLift],['south',southLift]]){
 const X=lift.origin.x,Z=lift.origin.z;
 for(const[a,b,side]of[[X-1.75,X-1.6,'west'],[X+1.6,X+1.75,'east']])box(name+'-shaft-'+side,a,b,Z-1.6,Z+1.5,H+3.05,L-.5);
 box(name+'-shaft-back',X-1.6,X+1.6,Z+1.35,Z+1.5,H+3.05,L-.5);box(name+'-shaft-roof',X-1.75,X+1.75,Z-1.6,Z+1.5,H+3.05,H+2.85,ceiling,'shaft-roof');box(name+'-pit',X-1.6,X+1.6,Z-1.6,Z+1.35,L-.35,L-.5,dark,'pit-floor');
 for(const[a,b,side]of[[X-1.75,X-.7,'west'],[X+.7,X+1.75,'east']])box(name+'-front-'+side,a,b,Z-1.55,Z-1.4,H+2.85,L-.5);
 for(const[a,b,label]of[[L-.5,L,'bottom'],[L+2.2,H,'between'],[H+2.2,H+2.85,'top']])box(name+'-front-'+label,X-.7,X+.7,Z-1.55,Z-1.4,b,a);
 for(const[y,f]of[[L,'lower'],[H,'upper']]){
  box(name+'-'+f+'-sill',X-1.6,X+1.6,Z-1.6,Z-1.185,y,y-.12,steel,'lift-sill');
  for(const x of[X-.74,X+.74])box(name+'-'+f+'-jamb-'+x,x-.035,x+.035,Z-1.6,Z-1.38,y+2.25,y,steel,'lift-frame');
  box(name+'-'+f+'-head',X-.775,X+.775,Z-1.6,Z-1.38,y+2.28,y+2.18,steel,'lift-frame');box(name+'-'+f+'-call',X+1,X+1.18,Z-1.62,Z-1.59,y+1.27,y+.95,steel,'call-button');box(name+'-'+f+'-button',X+1.045,X+1.135,Z-1.64,Z-1.62,y+1.17,y+1.06,button,'call-button');
  sign(name+'-'+f+'-sign',X,Z-1.66,3.1,y+2.4,name==='north'?['地下通路・京都駅','Lift · Subway / Kyoto Station']:['八条通 南側','Lift · Hachijo Street South']);
 }
}
// Wayfinding and corridor fixtures are original artwork; no reference pixels are used.
sign('crossing-sign',158.75,-142,5.6,L+2.5,['八条通 地下道・アバンティ','Hachijo Underpass / Avanti']);sign('station-sign',158.75,-223,5.6,L+2.5,['京都駅・地下鉄','Kyoto Station / Subway']);sign('garden-sign',159.2,-229.07,6,L+2.5,['京都駅・地下鉄','Kyoto Station / Subway']);sign('avanti-sign',139,-244,12,L+2.55,['アバンティ 地下入口','Avanti Basement Entrance']);
const lights=[];function light(id,x,z,y=roof-.05){box('fixture-'+id,x-.12,x+.12,z-.8,z+.8,y+.025,y,diffuser,'fixture');c.panels.at(-1).collision=false;lights.push({id:prefix+'light-'+id,position:{x,y:y-.08,z},direction:{x:0,y:-1,z:0},linearColor:{r:.97,g:.98,b:1},intensity:12,range:9,spotAngle:120,innerSpotAngle:76,source:'Fitted from Kintetsu accessible route photograph',note:'Uses the existing two-light pool.'});}
for(let z=-142;z>-229;z-=7){if(z>-186.3||z<-195)light('tunnel-'+z,158.75,z);}for(const[id,x,z]of[['north-lobby',159,-190],['north-car',166,-193],['south-car',178,-240],['avanti',139,-248]])light(id,x,z);
for(const p of c.panels)if(!p.id.startsWith(prefix+'rebuilt-'))p.material=p.browserMaterial===steel?'steel':'stone';
const point=(x,y,z)=>({x,y,z}),routes=[];function pair(label,points){routes.push({label,points},{label:label+' return',points:points.toReversed()});}
pair('Subway South lobby to north street lift',[point(157.2,L,-135),point(157.2,L,-140),point(158.75,L,-155),point(158.75,L,-175),point(158.75,L,-192.5),point(166,L,-192.8)]);
pair('Hachijo crossing to south street lift',[point(166,L,-192.8),point(158.75,L,-192.8),point(158.75,L,-213),point(158.75,L,-235),point(160,L,-240),point(178,L,-240)]);
pair('Sunken garden stair to street',[point(158.75,L,-238),point(152.75,L,-240),point(152.75,L,stair.start),point(152.75,L/2,stair.midA),point(152.75,L/2,stair.midB),point(152.75,0,stair.end),point(152.75,0,-260)]);
pair('Avanti receiving lobby',[point(168,L,-240),point(149,L,-240),point(149,L,-248.5),point(146,L,-248.5),point(134,L,-248.5)]);
pair('North street lift to station entrance',[point(166,0,-192.8),point(150,0,-191),point(147.1,0,-172),point(147.1,0,-153),point(147.1,0,-135),point(157.2,0,-135)]);
pair('South lift to surface crossing',[point(178,0,-239),point(186,0,-235),point(186,-.12,-216),point(186,0,-199),point(166,0,-192.8)]);
const blocked=[{label:'Garden upper edge guard',start:point(169,0,-260),yaw:0,axis:'z',limit:-258.1,sign:-1},{label:'Public tunnel side enclosure',contactLedge:'hachijo-crossing-crossing-dado-161.72',start:point(159,L,-211),yaw:90,axis:'x',limit:161.75,sign:-1},{label:'Garden tunnel upper edge guard',start:point(158.75,-.12,-226),yaw:180,axis:'z',limit:-228.9,sign:1},{label:'Garden lift upper edge guard',start:point(176,0,-240),yaw:-90,axis:'x',limit:174.1,sign:1}];
const report=await c.save(out,'hachijo-crossing.glb',{componentPrefix:prefix,sourceCollection:'Hachijo Street public crossing',builder:import.meta.url,builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:m.layoutSha256,scope:'Connect the subway South lobby through Hachijo Street to an open-air southern arrival, usable stair, Avanti entry and two street lifts.',geometry:{routes,blocked,spawn:point(166,L,-192.8),retiredIds:s.retiredIds,retiredLights:[],retiredLiftIds:s.retiredLiftIds,opening:s.opening,lower:L,upper:H,garden,pavement,stair},references:['https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_BF_03.pdf','https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm','https://www.kyoto-avanti.com/guide/floor_b1f.html','research/kyoto-station/plans/hachijo-municipal-brochure.pdf'],limits:['Operator evidence establishes connections and exterior northern lift; dimensions, floor elevations, road alignment and garden outline remain fitted.','Only the Avanti receiving lobby and local street segment are built; the shopping floor, full building and bus terminal remain unfinished.']});
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="'+(faces.length+1)*256+'"><rect width="2048" height="100%" fill="#e9e9dd"/>';
for(const[i,f]of faces.entries())svg+=`<g transform="translate(1024,${i*256})" fill="#172128" font-family="Hiragino Sans,sans-serif" text-anchor="middle"><text y="110" font-size="78">${f.text[0]}</text><text y="204" font-size="55">${f.text[1]}</text></g>`;svg+='</svg>';
const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(out+'/hachijo-crossing-signs.png',png);
const{json:j,bin}=readGLB(await readFile(out+'/hachijo-crossing.glb')),parts=[bin];let offset=bin.length;function append(b){const i=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});parts.push(b);offset+=b.length;const pad=Buffer.alloc((4-offset%4)%4);parts.push(pad);offset+=pad.length;return i;}
const native=await read(out+'/native-panels.json'),uv=[];for(const p of native.panels.filter(p=>p.browserMaterial===printed)){const f=faces.find(f=>f.id===p.id),row=faces.indexOf(f);p.uv=p.vertices.map((v,i)=>{const tri=p.vertices.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3),flat=tri.every(q=>Math.abs(q.z-v.z)<1e-7),side=Math.sign(v.z-f.z),r=flat?row:faces.length,u=flat?.5-side*(v.x-f.x)/f.w:.5,t=(r+1-(v.y-f.y)/.42)/(faces.length+1);uv.push(u,t);return{x:u,y:1-t};});}
const prim=j.meshes[printed].primitives[0];assert.equal(uv.length/2,j.accessors[prim.attributes.POSITION].count);prim.attributes.TEXCOORD_0=j.accessors.length;j.accessors.push({bufferView:append(Buffer.from(new Float32Array(uv).buffer)),componentType:5126,count:uv.length/2,type:'VEC2'});j.images=[{name:'Original Hachijo crossing directions',bufferView:append(png),mimeType:'image/png'}];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];j.textures=[{source:0,sampler:0}];j.materials[printed].pbrMetallicRoughness.baseColorTexture={index:0};j.buffers[0].byteLength=offset;native.authoredLights=lights;
const raw=JSON.stringify(native)+'\n',glb=writeGLB(j,Buffer.concat(parts));await writeFile(out+'/native-panels.json',raw);await writeFile(out+'/hachijo-crossing.glb',glb);report.outputs.glbSha256=sha(glb);report.outputs.nativePanelsSha256=sha(raw);report.texture={file:'hachijo-crossing-signs.png',sha256:sha(png),material:mats[printed].name};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/lift-specs.json',JSON.stringify([northLift,southLift])+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,routes:routes.length,lifts:2,lights:lights.length});
