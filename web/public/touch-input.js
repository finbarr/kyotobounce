// Pointer ownership keeps a second aiming finger from releasing the throw.
export function stickVector(dx,dy,radius){
 const length=Math.hypot(dx,dy),dead=radius*.12;
 if(length<=dead)return {x:0,z:0};
 const strength=Math.min(1,(length-dead)/(radius-dead));
 return {x:dx/length*strength,z:-dy/length*strength};
}
export class TouchInput{
 constructor(actions={}){this.actions=actions;this.pointers=new Map();this.movement={x:0,z:0,y:0};}
 down(area,id,x,y,rect){
  if(area!=='look'&&[...this.pointers.values()].some(p=>p.area===area))return false;
  const p={area,x,y,startX:x,startY:y,moved:false,rect};this.pointers.set(id,p);
  if(area==='look'&&this.looks().length>1)for(const q of this.looks())q.moved=true;
  if(area==='throw')this.actions.charge?.();
  this.move(id,x,y);return true;
 }
 looks(){return [...this.pointers.values()].filter(p=>p.area==='look');}
 move(id,x,y){
  const p=this.pointers.get(id);if(!p)return;
  const looks=this.looks(),other=looks.find(q=>q!==p),before=other?Math.hypot(p.x-other.x,p.y-other.y):0,dx=x-p.x,dy=y-p.y;
  p.x=x;p.y=y;p.moved ||= Math.hypot(x-p.startX,y-p.startY)>8;
  if(p.area==='look'){
   if(other){const after=Math.hypot(x-other.x,y-other.y);if(before>10&&after>10)this.actions.zoom?.(before/after);}
   else if(dx||dy)this.actions.look?.(dx,dy);
  }
  if(p.area==='move'){const r=p.rect;Object.assign(this.movement,stickVector(x-r.x-r.width/2,y-r.y-r.height/2,Math.min(r.width,r.height)*.4));}
  this.movement.y=Number([...this.pointers.values()].some(q=>q.area==='up'))-Number([...this.pointers.values()].some(q=>q.area==='down'));
  this.actions.move?.({...this.movement});
 }
 up(id,cancelled=false){
  const p=this.pointers.get(id);if(!p)return;this.pointers.delete(id);
  if(p.area==='throw'){if(cancelled)this.actions.cancel?.();else this.actions.release?.();}
  if(p.area==='look'&&!p.moved&&!cancelled)this.actions.tap?.(p.x,p.y);
  if(p.area==='move'){this.movement.x=0;this.movement.z=0;}
  this.movement.y=Number([...this.pointers.values()].some(q=>q.area==='up'))-Number([...this.pointers.values()].some(q=>q.area==='down'));
  this.actions.move?.({...this.movement});
 }
 reset(){this.pointers.clear();this.movement={x:0,z:0,y:0};this.actions.move?.({...this.movement});}
}
