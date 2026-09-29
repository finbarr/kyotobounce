// Fitted car dimensions; the operator plan establishes the two connected levels.
export function subwayLift({id='subway-central-one-lift',origin={x:177,y:-11.2,z:6.3},height=5}={}){
 const parts=[];
 const part=(name,center,size,motion='car',doorSide=0,appearance='steel')=>parts.push({id:id+'-'+name,center:{x:center[0],y:center[1],z:center[2]},size:{x:size[0],y:size[1],z:size[2]},material:'steel',appearance:'Subway lift | '+appearance,motion,doorSide});
 part('floor',[0,-.09,0],[2.4,.18,2.4],'car',0,'dark floor');
 part('ceiling',[0,2.48,0],[2.4,.12,2.4],'car',0,'ceiling');
 for(const side of[-1,1]){
  part('side-'+side,[side*1.16,1.2,0],[.08,2.4,2.4]);
  part('jamb-'+side,[side*.96,1.1,-1.10],[.48,2.2,.10]);
  part('rail-'+side,[side*1.08,1.0,.20],[.04,.05,1.6]);
  part('car-door-'+side,[side*.35,1.1,-1.19],[.70,2.2,.06],'car',side);
  part('lower-door-'+side,[side*.35,1.1,-1.36],[.70,2.2,.06],'lower',side);
  part('upper-door-'+side,[side*.35,1.1,-1.36],[.70,2.2,.06],'upper',side);
 }
 part('back',[0,1.2,1.16],[2.4,2.4,.08]);
 part('lintel',[0,2.31,-1.10],[2.4,.22,.1]);
 part('back-rail',[0,1,1.07],[2.12,.05,.04]);
 part('button',[1.10,1.15,-.50],[.025,.13,.13],'car',0,'button');
 const speed=.8,acceleration=.8,ramp=speed/acceleration,duration=height/speed+ramp,travel=[];
 const n=Math.ceil(duration*30);for(let i=0;i<=n;i++){const t=i/n*duration,y=t<ramp?.5*acceleration*t*t:t>duration-ramp?height-.5*acceleration*(duration-t)**2:speed*(t-ramp/2);travel.push({x:t,y});}
 return{id,origin,height,width:2.4,depth:2.4,doorWidth:1.4,doorZ:-1.4,doorTravel:.72,doorSeconds:1.6,waitSeconds:1.2,travel,parts};
}
