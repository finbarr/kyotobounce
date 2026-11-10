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
// JS engines may choose different libm implementations for sin/cos. Tiny
// differences survive cancellation in quaternion products, even after fround.
// Reduce to [-pi/2, pi/2] and use the same fixed-order Taylor polynomials in
// every runtime (omitted terms are below 3e-17 over this reduced interval).
export function rotationTrig(angle){
 let t=angle%(2*Math.PI);if(t>Math.PI)t-=2*Math.PI;else if(t<-Math.PI)t+=2*Math.PI;
 let sign=1;if(t>Math.PI/2){t=Math.PI-t;sign=-1;}else if(t<-Math.PI/2){t=-Math.PI-t;sign=-1;}
 const x=t*t;
 const sin=t*(1+x*(-1/6+x*(1/120+x*(-1/5040+x*(1/362880+x*(-1/39916800+x*(1/6227020800+x*(-1/1307674368000+x*(1/355687428096000+x*(-1/121645100408832000+x/51090942171709440000))))))))));
 const cos=sign*(1+x*(-1/2+x*(1/24+x*(-1/720+x*(1/40320+x*(-1/3628800+x*(1/479001600+x*(-1/87178291200+x*(1/20922789888000+x*(-1/6402373705728000+x/2432902008176640000))))))))));
 return {sin,cos};
}
export function spinRotation(q,w,dt){
 const speed=length(w);if(speed<.00001)return q;
 const trig=rotationTrig(speed*dt/2),s=trig.sin/speed,x=w.x*s,y=w.y*s,z=w.z*s,c=trig.cos;
 return {x:f(c*q.x+x*q.w+y*q.z-z*q.y),y:f(c*q.y-x*q.z+y*q.w+z*q.x),z:f(c*q.z+x*q.y-y*q.x+z*q.w),w:f(c*q.w-x*q.x-y*q.y-z*q.z)};
}
