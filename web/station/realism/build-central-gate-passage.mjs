// Provisional connected passage within the municipal portal and rear envelope.
// All bridge dimensions are declared in the spec; no photographed pixels are used.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [specPath,out]=process.argv.slice(2);assert(out&&resolve(out).startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:false});
const bytes=await readFile(specPath),s=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
for(const r of s.references)assert.equal(sha(await readFile(r.file)),r.sha256);
const {westX:L,eastX:R,headY:H,darkBandY:Y}=s.portal,b=s.bridge,W=R-L,C=s.rearCeilingY??H;
const world=(x,y,d)=>[x,y,s.frame.frontZ+s.frame.slope*x+d];
const rear=x=>s.rearPlane.intercept+s.rearPlane.slope*x-(s.frame.frontZ+s.frame.slope*x);
assert(b.rearDepthM<Math.min(rear(L),rear(R))&&b.floorY+b.clearHeightM<C);
const mat=(name,rgb,r,m=0)=>({name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],roughnessFactor:r,metallicFactor:m}});
const materials=[mat('gate-passage-dark-stone',[.07,.083,.074],.34),mat('gate-passage-pale-stone',[.50,.52,.47],.6),mat('gate-bridge-satin-metal',[.39,.42,.40],.39,.75),mat('gate-bridge-glazing',[.18,.24,.23],.15,.06),mat('gate-passage-recess',[.022,.025,.023],.88),mat('gate-passage-light',[.90,.91,.79],.35),mat('gate-bridge-floor',[.024,.028,.026],.22)];
materials[3].alphaMode='BLEND';materials[3].pbrMetallicRoughness.baseColorFactor[3]=.30;materials[5].emissiveFactor=[.24,.23,.15];
const c=construction(materials,{flatNormals:true});
function finish(m,collision=true,role='structure'){const p=c.panels.at(-1);p.collision=collision;p.material=role.includes('floor')?'granite':m===3?'glass':m===2?'steel':'facade';}
function box(id,x0,x1,y0,y1,d0,d1,m,collision=true,role='structure'){
 assert(x1>x0&&y1>y0&&d1>d0,id);const g=new T.BoxGeometry(x1-x0,y1-y0,d1-d0),p=g.attributes.position;
 c.add('gate-passage-'+id,Array.from({length:p.count},(_,i)=>world(p.getX(i)+(x0+x1)/2,p.getY(i)+(y0+y1)/2,p.getZ(i)+(d0+d1)/2)),Array.from(g.index.array),m,role);finish(m,collision,role);g.dispose();
}
function slab(id,ring,top,thickness,m,role){c.slab('gate-passage-'+id,ring.map(([x,d])=>world(x,top,d)),[],thickness,m,role);finish(m,true,role);}
// The public entrance opens laterally into the paid concourse, not a long tunnel.
const paid=s.paidConcourse,pierEnd=paid?b.frontGlassDepthM+paid.pierDepthM:b.rearDepthM;
if(paid){assert(paid.westX<L&&paid.eastX>R&&paid.pierDepthM>0&&pierEnd<b.rearDepthM);}
const floorRing=paid?[[L,0],[R,0],[R,pierEnd],[paid.eastX,pierEnd],[paid.eastX,rear(paid.eastX)],[paid.westX,rear(paid.westX)],[paid.westX,pierEnd],[L,pierEnd]]:[[L,0],[R,0],[R,rear(R)],[L,rear(L)]];
slab('floor',floorRing,0,.20,0,'floor');
slab('ceiling',[[L,s.extensionStartsM],[R,s.extensionStartsM],[R,rear(R)],[L,rear(L)]],C+.20,.20,2,'soffit');
if(C>H)box('ceiling-step',L,R,H,C,s.extensionStartsM,s.extensionStartsM+.18,2);
// Return walls have a real opening at the bridge level on both sides.
for(const [name,x,sign] of [['west',L,-1],['east',R,1]]){
 const [x0,x1]=sign<0?[x-.24,x]:[x,x+.24],end=rear(x),start=s.extensionStartsM;
 for(const [id,a,z] of (paid?[['front',start,b.frontGlassDepthM]]:[['front',start,b.frontGlassDepthM],['rear',b.rearDepthM,end]])){
  box(name+'-'+id+'-dark',x0,x1,0,Y,a,z,0);
  box(name+'-'+id+'-pale',x0,x1,Y,C,a,z,1);
 }
 box(name+'-bridge-under',x0,x1,0,Y,b.frontGlassDepthM,pierEnd,0);
 box(name+'-bridge-spandrel',x0,x1,Y,b.floorY,b.frontGlassDepthM,pierEnd,1);
 if(paid)box(name+'-bridge-bearing',x0,x1,b.floorY-b.fasciaDepthM,b.floorY,pierEnd,b.rearDepthM,2);
 box(name+'-bridge-head',x0,x1,b.floorY+b.clearHeightM,C,b.frontGlassDepthM,b.rearDepthM,1);
 // Closed face joints, visual only, do not multiply physics solids.
 for(let d=start+1.4;d<(paid?pierEnd:end);d+=1.4)for(const [id,y0,y1]of [['low',.01,Y-.01],['high',Y+.01,C-.01]]){
  if(d>b.frontGlassDepthM&&d<b.rearDepthM&&id==='high')continue;
  box(name+'-joint-'+id+'-'+d.toFixed(2),sign<0?x-.002:x-.004,sign<0?x+.004:x+.002,y0,y1,d-.006,d+.006,4,false);
 }
}
// A circular-plan bow is visible from the hall. Sagitta is inferred, not surveyed.
const half=W/2,radius=(half*half+b.bowM*b.bowM)/(2*b.bowM),cx=(L+R)/2;
const front=x=>b.frontGlassDepthM+radius-b.bowM-Math.sqrt(radius*radius-(x-cx)**2);
const arc=Array.from({length:b.arcSegments+1},(_,i)=>{const x=L+W*i/b.arcSegments;return[x,front(x)]});
slab('bridge-body',[...arc,[R,b.rearDepthM],[L,b.rearDepthM]],b.floorY,b.fasciaDepthM,2,'bridge-body');
slab('bridge-walking-floor',[[L-.8,b.frontGlassDepthM],[R+.8,b.frontGlassDepthM],[R+.8,b.rearDepthM],[L-.8,b.rearDepthM]],b.floorY+.01,.035,6,'bridge-floor');
box('bridge-ceiling',L-.8,R+.8,b.floorY+b.clearHeightM,b.floorY+b.clearHeightM+.12,b.frontGlassDepthM,b.rearDepthM,2);
const cells=b.glassBays;
for(const [side,d]of [['front',b.frontGlassDepthM],['rear',b.rearDepthM]]){
 for(let i=0;i<cells;i++){
  const a=L+W*i/cells,z=L+W*(i+1)/cells;
  box('glass-'+side+'-'+i,a+.035,z-.035,b.floorY+.09,b.floorY+b.clearHeightM-.09,d-.016,d+.016,3);
 }
 for(let i=0;i<=cells;i++){const x=L+W*i/cells;box('mullion-'+side+'-'+i,x-.032,x+.032,b.floorY,b.floorY+b.clearHeightM,d-.06,d+.06,2,false);}
 for(const [id,y]of [['sill',b.floorY+.055],['head',b.floorY+b.clearHeightM-.055]])box(side+'-'+id,L,R,y-.045,y+.045,d-.055,d+.055,2,false);
 // Continuous waist rail inside the glazing, observed in the corridor reference.
 const inside=d+(side==='front'?.10:-.10);
 box(side+'-rail',L,R,b.floorY+.91,b.floorY+.95,inside-.023,inside+.023,2,false);
}
// Structural soffit seams follow the curve; the corridor interior has transverse ribs.
for(let i=1;i<cells;i++){const x=L+W*i/cells;box('fascia-seam-'+i,x-.006,x+.006,b.floorY-b.fasciaDepthM+.01,b.floorY-.01,front(x)-.004,front(x)+.004,4,false);}
for(let x=L+.2;x<R;x+=.32)box('ceiling-rib-'+x.toFixed(3),x-.035,x+.035,b.floorY+b.clearHeightM-.085,b.floorY+b.clearHeightM,b.frontGlassDepthM+.10,b.rearDepthM-.10,1,false);
// Repeated lamps are geometry only; lighting acceptance needs the full game.
for(let x=L+1;x<R-.5;x+=2.7)for(const d of [b.frontGlassDepthM+.24,b.rearDepthM-.24])box('lamp-'+x.toFixed(3)+'-'+d,x-.09,x+.09,b.floorY+.12,b.floorY+.40,d-.065,d+.065,5,false);
for(let d=s.extensionStartsM+.6;d<b.frontGlassDepthM-.5;d+=2.4)for(let x=L+1.2;x<R-.5;x+=2.8)box('overhead-'+x.toFixed(3)+'-'+d.toFixed(3),x-.16,x+.16,C-.03,C-.01,d-.16,d+.16,5,false);
const report=await c.save(out,'gate-passage.glb',{status:s.status,specSha256:sha(bytes),references:s.references,assumptions:s.assumptions,geometry:{spanM:W,frontToRearM:[rear(L),rear(R)],bridgeFloorY:b.floorY,bridgeBays:cells,bridgeBowM:b.bowM,bridgeClearDepthM:b.rearDepthM-b.frontGlassDepthM-.20,paidConcourse:paid?{floorBoundsX:[paid.westX,paid.eastX],lateralOpeningStartsDepthM:pierEnd,pierDepthM:paid.pierDepthM}:null,physicalPanels:c.panels.filter(p=>p.collision).length},toolSha256:sha(await readFile(new URL(import.meta.url)))});
console.log(JSON.stringify(report));
