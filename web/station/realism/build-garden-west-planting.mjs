// Replace the western garden's blade placeholders with low, leafy planting.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {construction} from './component-mesh.mjs';
const [manifest,out]=process.argv.slice(2);assert(out?.startsWith('.local/'));await mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await read(manifest),raw=await readFile(parent.layout);assert.equal(sha(raw),parent.layoutSha256);
const layout=JSON.parse(raw),prefix='garden-west-planting-',F=Math.max(...layout.panels.find(p=>p.id==='garden-promenade-public-floor').vertices.map(v=>v.y));
const retiredIds=Array.from({length:18},(_,i)=>['garden-promenade-add-garden-west-bed-'+i,'garden-promenade-add-garden-groundcover-'+i]).flat();
assert(retiredIds.every(id=>layout.panels.some(p=>p.id===id)));
const spec={componentPrefix:prefix,parentLayoutSha256:parent.layoutSha256,retiredIds,retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[],floor:F};
await writeFile(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');await writeFile(out+'/parent-assets.json',JSON.stringify(parent,null,2)+'\n');
const mat=(name,color,roughness=.88,metallic=0)=>({name:'Garden west planting | '+name,pbrMetallicRoughness:{baseColorFactor:[...color,1],roughnessFactor:roughness,metallicFactor:metallic}});
const materials=[mat('yellow planter',[.55,.42,.085],.62,.15),mat('yellow ribs',[.46,.34,.058],.65,.15),mat('rim',[.22,.25,.25],.4,.65),mat('soil',[.067,.043,.022]),mat('twigs',[.13,.093,.045]),mat('inner foliage',[.066,.11,.027]),mat('deep green leaves',[.10,.18,.036]),mat('olive leaves',[.18,.265,.061]),mat('new green leaves',[.285,.36,.085]),mat('bronze leaves',[.22,.105,.05])];
const c=construction(materials,{flatNormals:true}),P=(x,y,z)=>[x,y,-z],pt=(x,z)=>({x,y:F,z});
let state=431;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),between=(a,b)=>a+(b-a)*random();
const ring=(x,z,w,d,y)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]].map(([x,z])=>P(x,y,z));
function finish(collision,material='stone'){const p=c.panels.at(-1);p.collision=collision;p.material=material;}
function grouped(start,id){const parts=c.panels.splice(start),first=parts[0],joined={...first,id:prefix+id,vertices:[],triangles:[]};assert(parts.length);for(const p of parts){assert(p.browserMaterial===first.browserMaterial&&!p.collision);const offset=joined.vertices.length;joined.vertices.push(...p.vertices);joined.triangles.push(...p.triangles.map(i=>i+offset));}c.panels.push(joined);}
function geometry(id,g,mi,role){const ps=g.attributes.position;c.add(prefix+id,Array.from({length:ps.count},(_,i)=>[ps.getX(i),ps.getY(i),ps.getZ(i)]),g.index?Array.from(g.index.array):Array.from({length:ps.count},(_,i)=>i),mi,role);finish(false);g.dispose();}
const beds=[];let leafCount=0;
for(let bed=0;bed<18;bed++){
 const old=layout.panels.find(p=>p.id==='garden-promenade-add-garden-west-bed-'+bed),bounds=['x','y','z'].map(k=>[Math.min(...old.vertices.map(v=>v[k])),Math.max(...old.vertices.map(v=>v[k]))]);
 const x=(bounds[0][0]+bounds[0][1])/2,z=(bounds[2][0]+bounds[2][1])/2,w=bounds[0][1]-bounds[0][0],d=bounds[2][1]-bounds[2][0],top=bounds[1][1],soil=top-.045;
 beds.push({id:bed,bounds,soil});
 c.slab(prefix+'planter-'+bed,ring(x,z,w,d,top),[ring(x,z,w-.10,d-.10,top)],top-F,0,'planter-wall');finish(true,'steel');
 c.slab(prefix+'rim-'+bed,ring(x,z,w+.018,d+.018,top+.013),[ring(x,z,w-.12,d-.12,top+.013)],.025,2,'planter-rim');finish(true,'steel');
 c.slab(prefix+'soil-'+bed,ring(x,z,w-.105,d-.105,soil),[],.035,3,'soil');finish(true);
 const ribStart=c.panels.length;
 for(const side of [-1,1])for(let a=-d/2+.05;a<d/2-.02;a+=.075){c.beam(prefix+'rib',P(x+side*(w/2+.002),F+.025,z+a),P(x+side*(w/2+.002),top-.025,z+a),.013,.009,1,'planter-fluting');finish(false,'steel');}
 for(const side of [-1,1])for(let a=-w/2+.05;a<w/2-.02;a+=.075){c.beam(prefix+'rib',P(x+a,F+.025,z+side*(d/2+.002)),P(x+a,top-.025,z+side*(d/2+.002)),.009,.013,1,'planter-fluting');finish(false,'steel');}
 grouped(ribStart,'fluting-'+bed);
 const foliage=Array.from({length:4},()=>({vertices:[],indices:[]})),shrubs=[];
 for(let j=0;j<2;j++){
  const center=new T.Vector3(...P(x+between(-.035,.035),soil+between(.18,.23),z+(j-.5)*.49)),radius=new T.Vector3(between(.235,.27),between(.20,.255),between(.27,.30));shrubs.push({center,radius});
  // A small irregular inner canopy keeps glimpses between individual leaves dark.
  const core=new T.IcosahedronGeometry(1,1);core.scale(radius.x*.79,radius.y*.70,radius.z*.77);core.translate(...center.toArray());geometry('canopy-'+bed+'-'+j,core,5,'shrub-interior');
  for(let leaf=0;leaf<140;leaf++){
   const ny=between(-.65,1),theta=random()*Math.PI*2,r=Math.sqrt(1-ny*ny),n=new T.Vector3(r*Math.cos(theta),ny,r*Math.sin(theta));
   const pos=center.clone().add(new T.Vector3(n.x*radius.x,n.y*radius.y,n.z*radius.z).multiplyScalar(between(.78,1.06)));
   const normal=n.clone().add(new T.Vector3(0,.65,0)).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal),spin=random()*Math.PI*2;
   const length=between(.085,.15),width=length*between(.38,.56),thickness=.006;
   const local=[[-.5,0],[-.22,.5],[.24,.48],[.5,0],[.24,-.48],[-.22,-.5]].map(([u,v])=>new T.Vector3(u*length,0,v*width));local.push(new T.Vector3(0,thickness/2,0),new T.Vector3(0,-thickness/2,0));
   const bronze=[2,7,12,16].includes(bed)&&random()<.30,mi=bronze?3:Math.min(2,Math.floor(random()*3)),batch=foliage[mi],offset=batch.vertices.length;
   for(const v of local){v.applyAxisAngle(new T.Vector3(0,1,0),spin).applyQuaternion(q).add(pos);batch.vertices.push(v.toArray());}
   for(let i=0;i<6;i++)batch.indices.push(offset+6,offset+i,offset+(i+1)%6,offset+7,offset+(i+1)%6,offset+i);
   leafCount++;
  }
 }
 const twigStart=c.panels.length;
 for(const [j,{center,radius}]of shrubs.entries())for(let k=0;k<5;k++){
  const a=P(x,soil,z+(j-.5)*.49),angle=k*Math.PI*2/5,b=center.clone().add(new T.Vector3(Math.cos(angle)*radius.x*.65,radius.y*.15,Math.sin(angle)*radius.z*.65));
  const g=new T.CylinderGeometry(.004,.009,new T.Vector3(...a).distanceTo(b),5);g.rotateX(Math.PI/2);const A=new T.Vector3(...a),delta=b.clone().sub(A);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize()));g.translate(...A.add(b).multiplyScalar(.5).toArray());geometry('twig',g,4,'shrub-stems');
 }
 grouped(twigStart,'twigs-'+bed);
 for(const [i,batch]of foliage.entries())if(batch.vertices.length){c.add(prefix+'leaves-'+bed+'-'+i,batch.vertices,batch.indices,6+i,'shrub-leaves');finish(false);}
}
const paths=[['Western planter path',[[-198,-23.8],[-198,-16],[-198,-8],[-198,2]]],['Garden approach to planting',[[-185,-23.8],[-198,-23.8],[-198,-20.9]]]];
const routes=paths.flatMap(([label,points])=>[{label,points:points.map(([x,z])=>pt(x,z))},{label:label+' return',points:points.toReversed().map(([x,z])=>pt(x,z))}]);
const blocked=[{label:'Western planter face',start:pt(-198,-14),yaw:90,axis:'x',limit:-196.85,sign:-1}];
const report=await c.save(out,'garden-west-planting.glb',{componentPrefix:prefix,sourceCollection:'Western garden low shrubs and ribbed planters',builder:'web/station/realism/build-garden-west-planting.mjs',builderSha256:sha(await readFile(new URL(import.meta.url))),sourceLayoutSha256:parent.layoutSha256,scope:'Replace the western row of triangular foliage with rounded leafy shrubs, soil and fitted planter rims, preserving nearby public paths.',geometry:{spawn:parent.spawn,floor:F,leafCount,beds,routes,chromeRoutes:routes.map(r=>r.label),blocked,retiredIds,retiredLights:[],modifiedPanelIds:[],modifiedFlightIds:[]},references:['https://www.kyoto-station-building.co.jp/service/square/','https://kyoto-rys.com/facility/skygarden/'],limits:['Small-leaf shrubs, bronze foliage and ribbed yellow planters follow the photographs; species and exact bed spacing are not surveyed.','Existing bamboo, lawn and seating remain approximate and are not changed in this component.']});
await writeFile(out+'/views.json',JSON.stringify([
 ['garden-west',[-187,F+1.65,-12],[-197,F+.65,-10]],['planter-close',[-198.3,F+1.25,-14.8],[-196.3,F+.70,-14.3]],['western-path',[-198,F+1.65,-22],[-196.6,F+.75,-10]],['northern-return',[-198,F+1.65,2],[-196.3,F+.55,-7]],['garden-arrival',[-185,F+1.65,-23.8],[-195,F+.6,-15]]
],null,2)+'\n');console.log({panels:report.geometry.panels,triangles:report.geometry.triangles,leafCount});
