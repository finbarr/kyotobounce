import * as THREE from 'three';

function artwork(width,height,paint){
  const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
// Original procedural artwork and exact registrations; audit: web/station/wayfinding/README.md.
export const wayfindingLayout='485daa6d8189436f526f6f89e7b82818ff3171de92f45ac40bf65da5e2419b2d';
// Both exports retain the audited sign faces and wall anchors. Historical650
// predates this registration and must not receive these fixed-position overlays.
const registeredLayouts=new Set(['b304c84aa1292e9e401c4abde9d305f754548d3b815fba8137802c9a2a385515',wayfindingLayout,'7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775']);
export const hasStationWayfinding=layout=>registeredLayouts.has(layout);
export const wayfindingFont='"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans CJK JP", "Noto Sans JP", Arial, sans-serif';
const font=wayfindingFont;
// Facing is the outward normal in native coordinates (+X east, +Z north).
// Arrows are in the reader's plane, never inferred from words in a mesh ID.
export const wayfindingRegistrations=[
  {id:'central-hall-central-gate-sign',face:'north',rows:[['','JR 中央口','JR Central Gate · 1F']],source:'jr',certainty:'high identity; modeled anchor'},
  {id:'central-hall-information-board-structure',face:'north',rows:[
    ['right','西口・自由通路  2F','West Exit / Public Passage'],
    ['right','売店  2F','Convenience Store · West Exit'],
    ['left','東広場  7F','East Square · via east stairs'],
    ['right','京都拉麺小路  10F','Kyoto Ramen Koji · via west stairs']
  ],source:'square / floor / jr / shop',certainty:'high floors; inferred modeled routes'},
  {id:'east-frontage-north-sign-recess-0',face:'south',rows:[],source:'floor',certainty:'unverified tenant; omit'},
  {id:'east-frontage-north-sign-recess-1',face:'south',rows:[],source:'floor',certainty:'unverified tenant; omit'},
  {id:'east-frontage-north-sign-recess-2',face:'south',rows:[],source:'floor',certainty:'unverified tenant; omit'},
  {id:'east-frontage-north-sign-recess-3',face:'south',rows:[],source:'floor',certainty:'unverified tenant; omit'},
  {id:'east-frontage-west-sign-recess-0',face:'west',rows:[],source:'floor',certainty:'east building west-facing surface; unverified tenant; omit'},
  {id:'east-frontage-west-sign-recess-1',face:'west',rows:[],source:'floor',certainty:'east building west-facing surface; unverified tenant; omit'},
  {id:'east-frontage-west-sign-recess-2',face:'west',rows:[],source:'floor',certainty:'east building west-facing surface; unverified tenant; omit'},
  {id:'east-frontage-west-sign-recess-3',face:'west',rows:[],source:'floor',certainty:'east building west-facing surface; unverified tenant; omit'},
  {id:'east-lower-display sign recess',face:'south',rows:[['','京都駅ビル','Kyoto Station Building']],source:'model',certainty:'modeled original poster display; no theater identity'},
  {id:'east-lower-landing-door sign recess',face:'south',rows:[],source:'floor',certainty:'hotel doorway unverified; omit'},
  {id:'east-lower-service-door sign recess',face:'south',rows:[],source:'model',certainty:'service door is not a verified information desk; omit'},
  {id:'wayfinding-west-2f',anchor:'first-landing-west-tier-0-partition',face:'north',bounds:[[-44.6,-39.5],[7.61,8.26],[-10.16,-10]],rows:[['right','西口・自由通路・売店  2F','West Exit / Public Passage / Store']],source:'square / jr / shop',certainty:'high floor; inferred landing route; partition-mounted'},
  {id:'wayfinding-east-ascent',anchor:'east-passage-north-approach',face:'north',bounds:[[35,40],[2.1,2.85],[3.385,3.715]],rows:[['right','東広場  7F','East Square · back to stairs']],source:'square',certainty:'high floor; inferred ascent route; wall-mounted'}
].map(r=>({...r,checked:'2026-09-08'}));

function arrow(ctx,x,y,size,direction){
  if(!direction)return;
  ctx.save();ctx.translate(x,y);if(direction==='left')ctx.rotate(Math.PI);
  ctx.strokeStyle='#f1d28a';ctx.lineWidth=size*.12;ctx.lineCap='square';ctx.beginPath();
  ctx.moveTo(-size*.45,0);ctx.lineTo(size*.45,0);ctx.moveTo(0,-size*.4);ctx.lineTo(size*.45,0);ctx.lineTo(0,size*.4);ctx.stroke();ctx.restore();
}
export function paintWayfinding(ctx,w,h,registration){
  ctx.fillStyle='#172023';ctx.fillRect(0,0,w,h);ctx.fillStyle='#b7b9ae';ctx.fillRect(0,0,w,Math.max(2,h*.025));
  const count=registration.rows.length,cell=w/count;
  registration.rows.forEach(([direction,ja,en],i)=>{
    const x=i*cell,pad=cell*.04,icon=direction?Math.min(h*.43,cell*.12):0;
    if(i){ctx.fillStyle='#526064';ctx.fillRect(x,12,2,h-24);}
    arrow(ctx,x+pad+icon*.5,h*.5,icon,direction);
    const left=x+pad+(direction?icon+pad:0),available=x+cell-pad-left;
    ctx.textAlign='left';ctx.textBaseline='middle';
    const fit=(text,size)=>{ctx.font=`500 ${size}px ${font}`;if(ctx.measureText(text).width>available)ctx.font=`500 ${size*available/ctx.measureText(text).width}px ${font}`;};
    ctx.fillStyle='#f7f4e8';fit(ja,h*.34);ctx.fillText(ja,left,h*.35);
    ctx.fillStyle='#edcd7e';fit(en,h*.25);ctx.fillText(en,left,h*.75);
  });
}
function labelTexture(registration,width,height){
  return artwork(width,height,(ctx,w,h)=>paintWayfinding(ctx,w,h,registration));
}

export function addStationDetails(scene,meta){
  const group=new THREE.Group();group.name='Atrium signs and flush floor finishes';scene.add(group);
  // Retain verified registrations on matching current or historical geometry only.
  if(!hasStationWayfinding(meta.sourceLayoutSha256))return {group,stats:{signFaces:0,posters:0,wayfinding:'unregistered layout'}};
  const seen=new Set(),textures=[];let signFaces=0;
  for(const registration of wayfindingRegistrations){
    if(!registration.rows.length||seen.has(registration.id))continue;
    const sign=registration.anchor?registration:meta.signs?.find(s=>s.id===registration.id);
    if(!sign)continue;
    seen.add(registration.id);
    const b=sign.bounds,dx=b[0][1]-b[0][0],dy=b[1][1]-b[1][0],dz=b[2][1]-b[2][0];
    const xFace=registration.face==='west',width=(xFace?dz:dx)-.025,height=dy-.018;
    const textureWidth=registration.rows.length>1?4096:2048,textureHeight=Math.max(128,Math.round(textureWidth*height/width));
    const map=labelTexture(registration,textureWidth,textureHeight);textures.push({map,registration});
    const mat=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.35,roughness:.6,metalness:.05});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat);
    plane.position.set((b[0][0]+b[0][1])/2,(b[1][0]+b[1][1])/2,-(b[2][0]+b[2][1])/2);
    if(xFace){plane.position.x=b[0][0]-.008;plane.rotation.y=-Math.PI/2;}
    else if(registration.face==='south'){plane.position.z=-b[2][0]+.008;}
    else{plane.position.z=-b[2][1]-.008;plane.rotation.y=Math.PI;}
    plane.name=registration.id+' readable face';plane.userData.wayfinding=registration;group.add(plane);signFaces++;
  }
  // Redraw once after optional web fonts settle; no frame loop or new texture allocation.
  document.fonts?.ready.then(()=>{for(const {map,registration} of textures){const c=map.image;paintWayfinding(c.getContext('2d'),c.width,c.height,registration);map.needsUpdate=true;}});

  // Original destination posters occupy the existing glazed display case.
  // They are game artwork, not copies of a photographed commercial campaign.
  for(let i=0;i<2;i++){
    const map=artwork(512,768,(ctx,w,h)=>{
      ctx.fillStyle=i?'#122d35':'#e6dfcb';ctx.fillRect(0,0,w,h);
      ctx.fillStyle=i?'#e8c571':'#ba4933';ctx.beginPath();ctx.arc(w/2,265,140,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=i?'#23444b':'#e6dfcb';ctx.lineWidth=5;
      for(let j=0;j<11;j++){ctx.beginPath();ctx.moveTo(30,210+j*17);ctx.quadraticCurveTo(256,70+j*19,482,210+j*17);ctx.stroke();}
      ctx.fillStyle=i?'#ede6ce':'#283735';ctx.textAlign='center';ctx.font=`600 54px ${font}`;ctx.fillText(i?'空中径路':'京都',w/2,515);
      ctx.font=`500 23px ${font}`;ctx.fillText(i?'SKYWAY · 10F':'KYOTO STATION',w/2,562);
      ctx.font=`19px ${font}`;ctx.fillText(i?'A different view of the city.':'Architecture in motion.',w/2,620);
      ctx.fillStyle=i?'#94a7a5':'#696e61';ctx.font=`16px ${font}`;ctx.fillText('京都駅ビル   /   KYOTO STATION BUILDING',w/2,722);
    });
    const poster=new THREE.Mesh(new THREE.PlaneGeometry(1.12,1.7),new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.18,roughness:.65}));
    poster.name='Glazed destination poster '+i;poster.position.set(26.16+i*1.48,1.53,-4.856);group.add(poster);
  }

  // K010 bases (floor + 0.1 mm) and 5 mm raised contact profiles now come
  // from the canonical station mesh. Painted +3/+4/+6 mm overlays would
  // cover that relief. Keep those meshes and their native layout paired.
  return {group,stats:{signFaces,wayfindingRegistrations:wayfindingRegistrations.length,posters:2,warningPads:0,tactileSource:'canonical station mesh',...meta.counts}};
}
