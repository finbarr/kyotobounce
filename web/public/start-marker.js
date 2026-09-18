import * as THREE from 'three';

// A checkered launch pad is visually separate from purple scoring patches and
// gold destinations. It suggests a starting spot without implying a boundary.
export function startMarker(disk,yaw=0){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d'),ink='#152036',paper='#fff2d9';
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  ctx.fillStyle=(x+y)%2?ink:paper;ctx.fillRect(x*64,y*64,64,64);
 }
 ctx.beginPath();ctx.arc(256,256,180,0,Math.PI*2);ctx.fillStyle=ink;ctx.fill();
 ctx.strokeStyle=paper;ctx.lineWidth=7;ctx.stroke();
 ctx.beginPath();ctx.arc(256,256,251,0,Math.PI*2);ctx.lineWidth=9;ctx.stroke();
 ctx.fillStyle=paper;ctx.textAlign='center';ctx.font='bold 80px sans-serif';ctx.fillText('START',256,277);
 ctx.font='bold 23px sans-serif';ctx.fillText('FIND YOUR OWN LINE',256,318);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,opacity:.94,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const marker=new THREE.Mesh(new THREE.CircleGeometry(disk.radius,96),material);
 marker.rotation.set(-Math.PI/2,0,-yaw*Math.PI/180);marker.position.set(disk.center.x,disk.center.y+.02,-disk.center.z);
 marker.userData={key:'start'};return marker;
}
