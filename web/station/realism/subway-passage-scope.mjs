import assert from 'node:assert/strict';
export const plazaId='municipal-plaza-642152272';
export const northOpening={minX:138,maxX:144,minZ:31.5,maxZ:45.32};
export function retiredSubwayPanels(layout){const ids=['hachijo-east-east-ground-extension'];assert(ids.every(id=>layout.panels.some(p=>p.id===id)));return ids;}
// Vertex attributes interpolate together; the output partitions the triangle outside the rectangle.
export function subtractOpening(vertices){
 let pending=[vertices],retained=[];
 for(const[axis,bound,sign]of[[0,northOpening.minX,1],[0,northOpening.maxX,-1],[2,-northOpening.maxZ,1],[2,-northOpening.minZ,-1]]){
  const cut=(poly,inside)=>{const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a.p[axis]-bound),db=sign*(b.p[axis]-bound),ia=inside?da>=0:da<=0,ib=inside?db>=0:db<=0;if(ia)result.push(a);if(ia!==ib){const t=da/(da-db);result.push(Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((v,i)=>v+(b[k][i]-v)*t)])));}}return result;};
  const next=[];for(const p of pending){const outer=cut(p,false),inner=cut(p,true);if(outer.length>=3)retained.push(outer);if(inner.length>=3)next.push(inner);}pending=next;
 }
 return retained;
}
