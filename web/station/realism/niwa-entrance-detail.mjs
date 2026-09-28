// Visible entrance/interior construction from the registered 2025 photographs.
// Hidden depths, door widths and bamboo paths are authored approximations.
import * as T from 'three';
export const niwaEntranceMaterials=()=>[
 {name:'niwa-bamboo',pbrMetallicRoughness:{baseColorFactor:[.63,.58,.43,1],metallicFactor:0,roughnessFactor:.83}},
 {name:'niwa-warm-light',pbrMetallicRoughness:{baseColorFactor:[.9,.72,.42,1],metallicFactor:0,roughnessFactor:.5},emissiveFactor:[1,.58,.23]}
];
export function addNiwaEntranceDetail({c,mats,P,rect,beam,landing,head,glassU,glassStartV,endV}){
 const bamboo=mats.findIndex(m=>m.name==='niwa-bamboo'),light=mats.findIndex(m=>m.name==='niwa-warm-light');
 const A=[49.65,20.13],B=[glassU,glassStartV],L=Math.hypot(B[0]-A[0],B[1]-A[1]),tangent=[(B[0]-A[0])/L,(B[1]-A[1])/L],normal=[-tangent[1],tangent[0]];
 const point=(t,y,offset=0)=>P(A[0]+(B[0]-A[0])*t+normal[0]*offset,y,A[1]+(B[1]-A[1])*t+normal[1]*offset);
 const detail=()=>{c.panels.at(-1).collision=false;};
 const member=(id,t0,y0,t1,y1,w,h,mat,role='glazing-frame',offset=0)=>c.beam('niwa-return-'+id,point(t0,y0,offset),point(t1,y1,offset),w,h,mat,role);
 function screen(id,t0,t1,bottom,top,depth,mat,role){const ps=[point(t0,top,-depth/2),point(t1,top,-depth/2),point(t1,top,depth/2),point(t0,top,depth/2)];c.slab('niwa-return-'+id,ps,[],top-bottom,mat,role);}
 // Close the formerly empty corner with two closed door leaves and sidelights.
 const stations=[0,.25,.5,.75,1];
 for(let i=0;i<4;i++){const a=stations[i]+.028/L,z=stations[i+1]-.028/L;screen('pane-'+i,a,z,landing+.61,head-.05,.024,0,'glazing');screen('kick-panel-'+i,a,z,landing+.045,landing+.57,.033,6,'door-panel');}
 for(const [i,t]of stations.slice(0,-1).entries())member('jamb-'+i,t,landing,t,head,.050,.075,6); // Existing niwa-mullion-0 closes the far corner.
 for(const [i,y]of [landing+.035,landing+.59,head-.035].entries())member('rail-'+i,0,y,1,y,.050,.050,6);
 for(const [i,t]of [.5-.105/L,.5+.105/L].entries()){
  member('pull-'+i,t,landing+.93,t,landing+1.46,.022,.028,6,'door-hardware',.065);detail();
  for(const [n,y]of [landing+.99,landing+1.40].entries()){c.beam('niwa-return-pull-bracket-'+i+'-'+n,point(t,y,.014),point(t,y,.065),.018,.018,6,'door-hardware');detail();}
 }
 // Fill only the triangular interior side of the corner outside the rectangular floor.
 c.slab('niwa-return-threshold-floor',[P(glassU,landing,glassStartV),P(46.55,landing,glassStartV),P(46.55,landing,21.4-(46.55-glassU)/(46.95-glassU)*.85)],[],.22,1,'entrance-floor');
 const returnTop=[point(0,34.42),point(1,34.42),P(50.3,34.42,glassStartV),P(50.3,34.42,A[1])];c.slab('niwa-return-soffit',returnTop,[],.12,5,'roof');
 // Visible interior envelope and shallow furniture; private back rooms are not modeled.
 rect('interior-rear-wall',50.14,50.30,glassStartV,endV,34.30,34.30-landing,3,'interior-wall');
 rect('interior-end-wall',glassU,50.30,endV-.16,endV,34.30,34.30-landing,1,'interior-wall');
 rect('interior-floor-finish',glassU+.08,50.12,glassStartV+.04,endV-.17,landing+.006,.026,2,'interior-floor');
 for(let v=22.6;v<31.5;v+=2.65){
  rect('interior-table-'+v.toFixed(2),47.22,49.35,v,v+.72,landing+.76,.075,4,'timber-u');
  for(const u of [47.45,49.10]){beam('table-leg-'+u+'-'+v,u,landing+.03,v+.36,u,landing+.70,v+.36,.045,.06,5,'furniture');detail();}
  rect('interior-bench-'+v.toFixed(2),49.38,49.82,v-.16,v+.88,landing+.44,.085,4,'timber-v');
 }
 // Parallel bowed bamboo strips give the visible interior its characteristic
 // porous depth. Paths are original, not an exact reproduction of the artwork.
 for(let group=0;group<3;group++)for(let strand=0;strand<15;strand++){
  const baseV=glassStartV+.95+group*3.5+strand*.032,lean=(strand%2?1:-1)*(1.05+strand*.025),u=glassU+.32+(strand%3)*.07;
  const pts=[P(u,landing+.08,baseV),P(u+.22,landing+.9,baseV+lean*.35),P(u+.38,landing+1.75,baseV+lean*.77),P(u+.54,head-.06,baseV+lean)];
  const curve=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),shape=new T.Shape();shape.moveTo(-.011,-.0035);shape.lineTo(.011,-.0035);shape.lineTo(.011,.0035);shape.lineTo(-.011,.0035);shape.closePath();
  const mesh=new T.ExtrudeGeometry(shape,{steps:12,bevelEnabled:false,extrudePath:curve}),pa=mesh.attributes.position,vertices=Array.from({length:pa.count},(_,i)=>[pa.getX(i),pa.getY(i),pa.getZ(i)]),indices=mesh.index?Array.from(mesh.index.array):vertices.map((_,i)=>i);
  c.add('niwa-bamboo-strip-'+group+'-'+strand,vertices,indices,bamboo,'interior-decoration');detail();mesh.dispose();
 }
 // Counter cabinets, stainless appliance and ceiling light fittings are visible
 // in the dated operator interior photograph; exact dimensions are inferred.
 for(let v=16.0;v<19.15;v+=.65){beam('counter-joint-'+v.toFixed(2),49.53,landing+.08,v,49.53,32.43,v,.012,.012,5,'cabinet-joint');detail();}
 rect('coffee-machine-body',50.26,50.66,17.2,17.65,33.15,.57,6,'counter-appliance');detail();
 rect('coffee-machine-face',50.245,50.27,17.24,17.61,33.11,.40,5,'counter-appliance');detail();
 rect('service-floor',49.82,51.54,15.9,20.13,landing+.006,.026,2,'interior-floor');
 beam('interior-light-strip',50.05,34.23,glassStartV+.1,50.05,34.23,endV-.2,.025,.025,light,'light-lens');detail();
 beam('counter-light-strip',51.50,34.15,15.98,51.50,34.15,20.05,.02,.025,light,'light-lens');detail();
 for(let v=22;v<32;v+=2.7){beam('light-track-'+v,48.60,34.37,v,48.60,34.23,v,.045,.045,5,'light-fitting');detail();beam('light-body-'+v,48.60,34.24,v,48.60,34.08,v,.075,.075,5,'light-fitting');detail();rect('light-lens-'+v,48.568,48.632,v-.032,v+.032,34.081,.012,light,'light-lens');detail();}
 return {returnStartCourt:A,returnEndCourt:B,returnLengthM:L,doorLeaves:'two closed central leaves with fixed sidelights',doorNominalWidthM:L/4,interiorDepthM:50.30-glassU,bambooStrips:45,bambooArtwork:'Original simplified bowed strips guided by the visible installation; exact artwork not reproduced.',limits:['Return angle and hidden depth are construction hypotheses.','Entrance leaves are closed static geometry; outside landing routes remain the traversal target.','Interior furnishings and lighting fittings are shallow visible context, not a complete restaurant interior.']};
}
