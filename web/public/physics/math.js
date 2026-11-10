// Explicit Float32 boundaries match the authored metre geometry and ball model.
const f=Math.fround;
export const v=(x=0,y=0,z=0)=>({x:f(x),y:f(y),z:f(z)});
export const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s);
export const dot=(a,b)=>f(f(f(a.x*b.x)+f(a.y*b.y))+f(a.z*b.z));
export const cross=(a,b)=>v(f(a.y*b.z)-f(a.z*b.y),f(a.z*b.x)-f(a.x*b.z),f(a.x*b.y)-f(a.y*b.x));
export const length=a=>f(Math.sqrt(dot(a,a)));
export const unit=a=>{const n=length(a);return n>1e-12?mul(a,1/n):v();};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const project=(a,n)=>mul(n,dot(a,n));
export const plane=(a,n)=>sub(a,project(a,n));
export const limit=(a,max)=>length(a)>max?mul(unit(a),max):a;
export const towardZero=(a,amount)=>mul(unit(a),Math.max(0,length(a)-amount));
export const yaw=(a,degrees)=>{const t=degrees*Math.PI/180,s=f(Math.sin(t)),c=f(Math.cos(t));return v(f(c*a.x)+f(s*a.z),a.y,f(c*a.z)-f(s*a.x));};
export const identity=()=>({x:0,y:0,z:0,w:1});
export function rotationFromUp(direction){
 const n=unit(direction);if(n.y<-.999999)return {x:1,y:0,z:0,w:0};
 const q={x:n.z,y:0,z:-n.x,w:1+n.y},m=Math.hypot(q.x,q.z,q.w);return {x:f(q.x/m),y:0,z:f(q.z/m),w:f(q.w/m)};
}
export function rotate(q,p){const t=mul(cross(q,p),2);return add(p,add(mul(t,q.w),cross(q,t)));}
export function spinRotation(q,w,dt){
 const speed=length(w);if(speed<.00001)return q;
 const a=speed*dt/2,s=Math.sin(a)/speed,x=w.x*s,y=w.y*s,z=w.z*s,c=Math.cos(a);
 return {x:f(c*q.x+x*q.w+y*q.z-z*q.y),y:f(c*q.y-x*q.z+y*q.w+z*q.x),z:f(c*q.z+x*q.y-y*q.x+z*q.w),w:f(c*q.w-x*q.x-y*q.y-z*q.z)};
}
