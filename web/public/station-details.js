import * as THREE from 'three';

function artwork(width,height,paint){
  const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
const font='"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans CJK JP", Arial, sans-serif';
function labelTexture(id){
  const board=id==='central-hall-information-board-structure',gate=id==='central-hall-central-gate-sign';
  return artwork(2048,board?192:128,(ctx,w,h)=>{
    ctx.fillStyle='#172023';ctx.fillRect(0,0,w,h);ctx.fillStyle='#bec6bd';ctx.fillRect(0,0,w,3);
    if(board){
      const rows=[['JR','在来線のりば','JR Lines'],['→','大阪・神戸方面','Osaka / Kobe'],['→','奈良方面','Nara'],['→','嵯峨嵐山方面','Saga-Arashiyama']];
      rows.forEach(([icon,ja,en],i)=>{const x=i*w/4;
        ctx.fillStyle='#344248';ctx.fillRect(x+w/4-2,14,2,h-28);
        ctx.fillStyle='#2580b0';ctx.fillRect(x+22,24,72,72);ctx.fillStyle='#fff';ctx.font=`bold 33px ${font}`;ctx.fillText(icon,x+29,73);
        ctx.font=`500 35px ${font}`;ctx.fillText(ja,x+113,69);ctx.fillStyle='#edcd7e';ctx.font=`29px ${font}`;ctx.fillText(en,x+113,116);
        ctx.fillStyle='#a2b4b4';ctx.font=`20px ${font}`;ctx.fillText('TRAIN INFORMATION',x+24,166);
      });
    }else{
      let text=gate?'JR  中央口   Central Gate':id.includes('service')?'ご案内   Information':id.includes('landing-door')?'ホテルグランヴィア京都   Hotel Granvia Kyoto':id.includes('display')?'京都劇場   Kyoto Theater':id.includes('-west-')?'京都劇場   KYOTO THEATER':'ホテルグランヴィア京都   HOTEL GRANVIA KYOTO';
      ctx.fillStyle=gate?'#f1f1e5':'#e7d3a6';ctx.font=`500 ${gate?70:64}px ${font}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2+3,w-100);
      if(gate){ctx.fillStyle='#217aa6';ctx.fillRect(0,h-8,w,8);}
    }
  });
}

export function addStationDetails(scene,meta){
  const group=new THREE.Group();group.name='Atrium signs and flush floor finishes';scene.add(group);
  const reusable=new Map();
  for(const sign of meta.signs){
    const b=sign.bounds,dx=b[0][1]-b[0][0],dy=b[1][1]-b[1][0],dz=b[2][1]-b[2][0];
    const xFace=dx<dz;
    const map=labelTexture(sign.id),mat=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.65,roughness:.36,metalness:.15});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry((xFace?dz:dx)-.025,dy-.018),mat);
    plane.position.set((b[0][0]+b[0][1])/2,(b[1][0]+b[1][1])/2,-(b[2][0]+b[2][1])/2);
    if(xFace){plane.position.x=b[0][0]-.008;plane.rotation.y=-Math.PI/2;}
    else if(sign.id.startsWith('east-lower-')){plane.position.z=-b[2][0]+.008;}
    else{plane.position.z=-b[2][1]-.008;plane.rotation.y=Math.PI;}
    plane.name=sign.id+' readable face';group.add(plane);
  }

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

  const tactileMap=artwork(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#c3a240';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#8d7635';ctx.lineWidth=3;ctx.strokeRect(1,1,w-2,h-2);
    for(let x=24;x<w;x+=42)for(let y=24;y<h;y+=42){ctx.fillStyle='#877334';ctx.beginPath();ctx.arc(x+2,y+3,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dfbd59';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();}
  });
  const ribs=artwork(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#baa04a';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#8b773d';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,h-2);
    for(let x=20;x<w;x+=43){ctx.fillStyle='#8d7739';ctx.fillRect(x+3,13,17,232);ctx.fillStyle='#d9ba5d';ctx.fillRect(x,10,17,232);ctx.fillStyle='#e2c971';ctx.fillRect(x,10,3,232);}
  });
  function floorPatch(position,width,length,map,rotation=0){
    const key=`${map.uuid}:${width}:${length}`;
    let mat=reusable.get(key);if(!mat){const t=map.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(width/.3,length/.3);t.needsUpdate=true;
      mat=new THREE.MeshStandardMaterial({map:t,roughness:.73,metalness:0,polygonOffset:true,polygonOffsetFactor:-2});reusable.set(key,mat);}
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,length),mat);plane.rotation.set(-Math.PI/2,0,rotation);
    plane.position.set(position.x,position.y,-position.z);plane.receiveShadow=true;group.add(plane);
  }
  for(const landing of meta.landings){
    const angle=-Math.atan2(landing.uphill.x,landing.uphill.z);
    floorPatch(landing.position,landing.width,.3,tactileMap,angle);
  }
  // A restrained tactile spine makes the public entrance legible. Locations
  // are photo-guided within the retained floor, not an accessibility survey.
  floorPatch({x:0,y:.004,z:-5},.3,38,ribs);
  floorPatch({x:8.5,y:.004,z:4},.3,17,ribs,Math.PI/2);
  floorPatch({x:0,y:.006,z:4},.6,.6,tactileMap);
  return {group,stats:{signFaces:meta.signs.length,posters:2,warningPads:meta.landings.length,...meta.counts}};
}
