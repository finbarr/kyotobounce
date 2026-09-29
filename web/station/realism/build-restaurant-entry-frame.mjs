// Photo-guided lantern frame at the registered Grand Stairway restaurant entry.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {construction} from './component-mesh.mjs';

const [layoutPath,registrationPath,out]=process.argv.slice(2);
assert(out&&resolve(out).startsWith(resolve('.local')+'/'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=await readFile(layoutPath),layout=JSON.parse(raw),registrationBytes=await readFile(registrationPath),r=JSON.parse(registrationBytes);
assert(!layout.panels.some(p=>p.id.startsWith('restaurant-entry-lantern-')),'Frame already installed');
assert(layout.panels.some(p=>p.id==='west-restaurant-floor'),'Install the registered restaurant first');
const photo='research/kyoto-station/photos/soulkyoto-20140209kyotostation06_0326.jpg';
const E=r.entryRenderer,A=new T.Vector3(...r.sourceLandingEdgeRenderer[1]).sub(new T.Vector3(...r.sourceLandingEdgeRenderer[0]));A.y=0;A.normalize();
const N=new T.Vector3(-A.z,0,A.x),Y=E[1];
const O=new T.Vector3(...r.sourceLandingSideRenderer[1]).sub(new T.Vector3(...r.sourceLandingSideRenderer[0]));O.y=0;O.normalize();
assert(N.dot(new T.Vector3(...r.routeRenderer[1]).sub(new T.Vector3(...E)))>0,'Normal faces the public restaurant aisle');
const clearWidth=2.36,clearHeight=2.60,postWidth=.26,depth=.26,outerWidth=clearWidth+postWidth*2;
const materials=[
 {name:'Restaurant entry lantern | satin black frame',pbrMetallicRoughness:{baseColorFactor:[.016,.019,.021,1],metallicFactor:.45,roughnessFactor:.38}},
 {name:'Restaurant entry lantern | warm diffuser',pbrMetallicRoughness:{baseColorFactor:[.82,.67,.43,1],metallicFactor:0,roughnessFactor:.72},emissiveFactor:[.95,.70,.36]},
 {name:'Restaurant entry lantern | dark plinth',pbrMetallicRoughness:{baseColorFactor:[.028,.030,.029,1],metallicFactor:.1,roughnessFactor:.52}}
];
const c=construction(materials,{flatNormals:true});
function box(id,w,h,s,width,height,thickness,material,role,collision=true){
 const g=new T.BoxGeometry(width,height,thickness),p=g.attributes.position;
 const vertices=Array.from({length:p.count},(_,i)=>{const x=p.getX(i)+w,y=p.getY(i)+h,z=p.getZ(i)+s;return[E[0]+A.x*x+N.x*z,Y+y,E[2]+A.z*x+N.z*z];});
 c.add('restaurant-entry-lantern-'+id,vertices,Array.from(g.index.array),material,role);
 c.panels.at(-1).material=material===2?'stone':'steel';c.panels.at(-1).collision=collision;g.dispose();
}
// The illuminated faces sit just forward of their closed structural casings.
// They leave the existing 2.32 m source threshold entirely clear.
for(const side of [-1,1]){
 const w=side*(clearWidth/2+postWidth/2);
 box('post-'+side,w,clearHeight/2,-.02,postWidth,clearHeight,depth,0,'entrance-frame');
 box('plinth-'+side,w,.055,-.025,postWidth+.018,.11,depth+.012,2,'entrance-plinth');
 for(const [i,[bottom,top]]of [[.13,.79],[.825,1.65],[1.685,2.565]].entries())
  box('diffuser-'+side+'-'+i,w,(bottom+top)/2,-.158,postWidth-.056,top-bottom,.016,1,'illuminated-diffuser',false);
}
box('lintel',0,clearHeight+.14,-.02,outerWidth,.28,depth,0,'entrance-frame');
const separators=[-outerWidth/2+.028,-.46,.46,outerWidth/2-.028];
for(let i=1;i<separators.length;i++){
 const left=separators[i-1]+.018,right=separators[i]-.018;
 box('lintel-diffuser-'+i,(left+right)/2,clearHeight+.14,-.158,right-left,.218,.016,1,'illuminated-diffuser',false);
}
// The photographic frame has illuminated inner returns as well as front panels.
for(const side of [-1,1])for(const [i,[bottom,top]]of [[.13,.79],[.825,1.65],[1.685,2.565]].entries())
 box('return-'+side+'-'+i,side*(clearWidth/2+.014),(bottom+top)/2,-.02,.014,top-bottom,depth-.07,1,'illuminated-diffuser',false);
const report=await c.save(out,'restaurant-entry-frame.glb',{
 builder:'web/station/realism/build-restaurant-entry-frame.mjs',builderSha256:hash(await readFile(new URL(import.meta.url))),sourceLayoutSha256:hash(raw),
 reference:{photo,sha256:hash(await readFile(photo)),url:'https://soulkyoto.blog.fc2.com/blog-entry-395.html',date:'2014-02-09',observed:'Warm translucent entrance surround, dark perimeter frame, horizontal crossbars and dark kick plates.'},
 registrationSha256:hash(registrationBytes),geometry:{entryRenderer:E,acrossRenderer:A.toArray(),inwardRenderer:N.toArray(),outwardRenderer:O.toArray(),clearWidthM:clearWidth,clearHeightM:clearHeight,outerWidthM:outerWidth,depthM:depth},
 scope:'Illuminated restaurant entry surround. Dimensions fit the registered doorway; subdivision and finish are photo-guided approximations. No photograph pixels or live lights are added.',
 limits:['The reference photograph is from 2014 and does not establish current tenant branding.','Diffusers are emissive surfaces; they do not add shadow-casting lights.','The surrounding restaurant interiors and materials remain unfinished.']
});
console.log(JSON.stringify({panels:report.geometry.panels,triangles:report.geometry.triangles,outputs:report.outputs}));
