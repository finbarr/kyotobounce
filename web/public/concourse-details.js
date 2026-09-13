import * as THREE from 'three';
import {wayfindingFont} from './station-details.js';
// Original vector artwork packed into one filtered atlas. Metadata is part of
// the current station bundle; repeated artwork shares atlas space.
export function paintConcourse(ctx,w,h,r){
 const bg=r.kind==='poster'?'#e7deca':r.kind==='locker'?'#a4ada9':'#182324';
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#78908b';ctx.lineWidth=2;ctx.strokeRect(2,2,w-4,h-4);
 const rect=(x,y,a,b,color)=>{ctx.fillStyle=color;ctx.fillRect(x*w,y*h,a*w,b*h);};
 const text=(s,x,y,size,color='#efe9d8',align='center',max=.91)=>{ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`500 ${Math.max(9,size*h)}px ${wayfindingFont}`;ctx.fillText(s,x*w,y*h,max*w);};
 const line=(x,y,a,b,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x*w,y*h);ctx.lineTo(a*w,b*h);ctx.stroke();};
 const circle=(x,y,rad,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x*w,y*h,rad*Math.min(w,h),0,Math.PI*2);ctx.fill();};
 const head=()=>{rect(0,0,1,.055,r.accent||'#c5a362');text(r.ja,.5,.29,.28);if(r.en)text(r.en,.5,.73,.20,r.accent);};
 if(r.kind==='brand'){rect(0,0,1,.055,r.accent||'#c5a362');text(r.ja,.5,.39,.50);text(r.en,.5,.83,.15,r.accent);return;}
 if(r.kind==='heartin'){
  rect(0,0,1,1,'#f4f0de');rect(0,.04,1,.08,'#e87827');rect(0,.13,1,.08,'#258345');rect(0,.22,1,.07,'#bd3223');
  text(r.ja,.5,.55,.31,'#215b39');text(r.en,.5,.85,.19,'#4d6150');return;
 }
 if(r.kind==='diamond'){
  rect(0,0,1,1,'#e9e2cf');ctx.fillStyle='#c8ac75';
  for(let i=-2;i<4;i++){ctx.beginPath();ctx.moveTo((i*.5)*w,0);ctx.lineTo((i*.5+.5)*w,.5*h);ctx.lineTo((i*.5)*w,h);ctx.lineTo((i*.5-.5)*w,.5*h);ctx.fill();}
  for(let i=0;i<32;i++)line(i/32,0,i/32,1,'#dfd6bd',.55);return;
 }
 if(r.kind==='departures'){
  rect(0,0,1,.20,'#2d7667');text(r.ja,.5,.10,.095);const i=r.index||0;
  const rows=[['12:08','快速','大阪'],['12:16','普通','嵯峨嵐山'],['12:24','新快速','神戸']];
  for(let j=0;j<3;j++){const y=.34+j*.23;text(rows[j][0],.05,y,.12,'#eee2c7','left');text(rows[(j+i)%3][1],.43,y,.12,'#d6ba68');text(rows[(j+i)%3][2],.81,y,.12,'#ecdfb5');line(.04,y+.12,.96,y+.12,'#3a5551');}return;
 }
 if(['shop','service','hours'].includes(r.kind)){head();return;}
 if(r.kind==='vending'){
  rect(.02,.02,.96,.96,r.accent);rect(.04,.1,.73,.61,'#e8edf0');rect(.80,.12,.16,.32,'#192125');text(r.ja,.40,.06,.037,'white');
  for(let row=0;row<3;row++)for(let col=0;col<6;col++){
   const x=.074+col*.116,y=.12+row*.19,pal=['#36789a','#569261','#ddd6b7','#b13826','#dba633','#315343'];
   rect(x,y+.029,.066,.093,pal[(col+row+r.index)%6]);rect(x+.017,y+.008,.032,.024,'#c8d2cf');rect(x+.01,y+.066,.047,.028,'#eeede1');
   rect(x-.002,y+.139,.075,.026,'#29332f');text('¥'+[130,150,160,180][col%4],x+.034,y+.152,.015,'#e3d8a5');
   rect(x+.012,y+.171,.045,.008,row===2?'#b8c7f2':'#e6d4af');
  }
  rect(.80,.49,.16,.06,'#151b19');text('IC',.88,.38,.035,'#86c7d4');circle(.878,.465,.022,'#c0c7bd');rect(.82,.24,.12,.026,'#8fada1');
  rect(.15,.79,.59,.105,'#122024');rect(.17,.798,.55,.026,'#7c8584');text('PUSH',.46,.87,.025,'#b8c1bd');
  for(let i=0;i<7;i++)rect(.07,.92+i*.006,.82,.002,'#526766');return;
 }
 if(r.kind==='ticket'){
  rect(.04,.03,.92,.18,r.accent);text(r.ja,.5,.08,.065);text(r.en,.5,.153,.037);rect(.16,.29,.68,.27,'#33433d');rect(.18,.31,.64,.23,'#d5e6df');
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){rect(.21+col*.2,.35+row*.065,.16,.045,row?'#98b6a4':'#709989');text(String(180+col*50+row*80),.29+col*.2,.375+row*.065,.023,'#17392c');}
  text('きっぷをお選びください',.5,.25,.029);rect(.14,.63,.35,.07,'#273734');text('IC',.74,.67,.049,'#75b6c5');circle(.74,.73,.05,'#1b343d');rect(.15,.77,.25,.03,'#121c1b');rect(.15,.9,.65,.045,'#202d28');text(String(r.index).padStart(2,'0'),.88,.94,.03);return;
 }
 if(r.kind==='locker'){
  for(let i=0;i<8;i++)line(.72,.69+i*.022,.88,.69+i*.022,'#6a7775',1);
  rect(.055,.055,.22,.07,'#384748');text(r.en,.166,.09,.042);rect(.09,.52,.10,.21,'#566766');rect(.11,.54,.06,.16,'#c7cdca');circle(.14,.46,.024,'#374445');
  line(.03,.02,.97,.02,'#d5dcd8',2);line(.97,.02,.97,.98,'#535e59',2);return;
 }
 if(r.kind==='clock'){
  ctx.fillStyle='#ececdf';ctx.fillRect(0,0,w,h);circle(.5,.5,.47,'#344145');circle(.5,.5,.437,'#eeeadd');
  for(let i=0;i<60;i++){const a=i*Math.PI/30,outer=.407,inner=i%5===0?.34:.386;line(.5+Math.sin(a)*inner,.5-Math.cos(a)*inner,.5+Math.sin(a)*outer,.5-Math.cos(a)*outer,'#253136',i%5===0?4:1);}
  line(.5,.5,.28,.37,'#283337',7);line(.5,.5,.76,.34,'#283337',4);circle(.5,.5,.025,'#b44030');text('KYOTO',.5,.68,.065,'#56625c');return;
 }
 if(r.kind==='fire'){
  rect(.02,.02,.96,.96,'#d4d7d1');text('消火器',.5,.13,.12,'#b62f29');rect(.18,.27,.64,.56,'#364644');rect(.37,.47,.28,.27,'#be362b');rect(.46,.40,.12,.08,'#af3026');line(.50,.41,.68,.41,'#292b27',5);line(.68,.41,.70,.60,'#121c1c',4);text('FIRE EXTINGUISHER',.5,.93,.037,'#a43b31');return;
 }
 if(r.kind==='recycle'){
  circle(.5,.25,.14,'#0b1718');text(r.ja,.5,.64,.17);text(r.en,.5,.86,.07,'#abc6c3');return;
 }
 if(r.kind==='directory'||r.kind==='map'){
  rect(.04,.04,.92,.14,r.accent||'#547e81');text(r.ja,.5,.11,.075);text(r.en,.5,.23,.045);
  for(const [i,title]of ['屋上 / SKY GARDEN','10F / SKYWAY · RAMEN','7F / EAST SQUARE','2F / WEST GATE · SHOPS','1F / CENTRAL GATE','B1F / PORTA'].entries()){
   const y=.31+i*.075;line(.08,y+.034,.92,y+.034,'#738d86');text(title,.09,y,.024,'#e7dfc5','left');
  }
  rect(.11,.80,.78,.1,'#b4c0b4');rect(.17,.823,.24,.055,'#526c68');rect(.66,.823,.17,.055,'#698f85');circle(.5,.85,.02,'#cb6a43');return;
 }
 if(r.kind==='menu'){
  rect(.05,.035,.9,.008,r.accent);text(r.ja,.5,.14,.067,r.accent);text(r.en,.5,.24,.026);
  const items=['COFFEE  /  コーヒー','KYOTO CRAFT  /  京都','HIGHBALL  /  ハイボール','SEASONAL  /  季節の一品'];
  for(let i=0;i<4;i++){text(items[i],.10,.38+i*.11,.032,'#ece4d0','left');line(.10,.435+i*.11,.90,.435+i*.11,'#51605a');}
  text('京都駅ビル',.5,.91,.047,r.accent);return;
 }
 if(r.kind==='poster'){
  const i=r.index||0,palette=['#a34332','#347676','#666a47','#224253'],accent=palette[i%4];rect(.035,.025,.93,.62,accent);
  circle(.50,.30,.26,'#e0c28c');
  // Original fan/ridge motif, deliberately not a copied commercial poster.
  ctx.strokeStyle=i%2?'#243e43':'#c18657';ctx.lineWidth=h*.008;
  for(let k=0;k<12;k++){ctx.beginPath();ctx.moveTo(.06*w,(.43+k*.012)*h);ctx.quadraticCurveTo(.53*w,(.14+k*.024)*h,.94*w,(.48+k*.012)*h);ctx.stroke();}
  text(r.ja,.5,.72,.09,'#243b39');text(r.en,.5,.83,.032,accent);text(['ARCHITECTURE & LIGHT','KYOTO CULTURE','STATION DINING','DISCOVER THE CITY'][i%4],.5,.90,.026,'#50675e');text('京都駅ビル / KYOTO STATION BUILDING',.5,.967,.018,'#546661');return;
 }
 head();
}
export function addConcourseDetails(scene,meta,maxAnisotropy=8){
 const records=meta.concourseDetails?.version===1?meta.concourseDetails.labels:[];
 if(!records.length)return {faces:0,drawCalls:0};
 // Bounded 4096×2048 pages. Deduplicate repeated prices and balcony pattern
 // tiles rather than stretching a growing single canvas beyond GPU limits.
 const pages=[],unique=new Map(),assignments=[];
 for(const r of records){
  const {id,center,face,yaw,...art}=r,key=JSON.stringify(art);
  let tile=unique.get(key);
  if(!tile){const w=Math.min(1536,Math.max(256,Math.round(r.width*260))),h=Math.max(96,Math.min(768,Math.round(w*r.height/r.width)));tile={r,w,h};unique.set(key,tile);}
  assignments.push({r,tile});
 }
 for(const tile of [...unique.values()].sort((a,b)=>b.h-a.h)){
  let page=pages.at(-1);
  if(!page){page={tiles:[],x:4,y:4,row:0};pages.push(page);}
  if(page.x+tile.w+4>4096){page.x=4;page.y+=page.row+8;page.row=0;}
  if(page.y+tile.h+4>2048){page={tiles:[],x:4,y:4,row:0};pages.push(page);}
  Object.assign(tile,{x:page.x,y:page.y,page});page.tiles.push(tile);page.x+=tile.w+8;page.row=Math.max(page.row,tile.h);
 }
 if(pages.length>8)throw Error('Station artwork exceeds eight-page atlas budget');
 const stats={faces:records.length,uniqueArt:unique.size,atlases:[],drawCalls:pages.length};
 for(const [pageIndex,page]of pages.entries()){
  const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=2**Math.ceil(Math.log2(page.y+page.row+4));stats.atlases.push([canvas.width,canvas.height]);
  const ctx=canvas.getContext('2d');function paint(){ctx.fillStyle='#243032';ctx.fillRect(0,0,canvas.width,canvas.height);for(const s of page.tiles){ctx.save();ctx.translate(s.x,s.y);paintConcourse(ctx,s.w,s.h,s.r);ctx.restore();}}
  paint();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,maxAnisotropy);
  const positions=[],uv=[],indices=[];
  for(const {r,tile:{x,y,w,h}}of assignments.filter(a=>a.tile.page===page)){
   const center=new THREE.Vector3(r.center[0],r.center[1],-r.center[2]),right=r.face==='west'?new THREE.Vector3(0,0,1):r.face==='east'?new THREE.Vector3(0,0,-1):r.face==='north'?new THREE.Vector3(-1,0,0):new THREE.Vector3(1,0,0);
   right.applyAxisAngle(new THREE.Vector3(0,1,0),-(r.yaw||0)*Math.PI/180);
   const base=positions.length/3;
   for(const [dx,dy]of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=center.clone().addScaledVector(right,dx*r.width/2);p.y+=dy*r.height/2;positions.push(...p.toArray());uv.push((x+(dx+1)*w/2)/canvas.width,1-(y+(1-dy)*h/2)/canvas.height);}
   indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.25,roughness:.63,metalness:.05});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Registered station artwork '+pageIndex;scene.add(mesh);
  document.fonts?.ready.then(()=>{paint();texture.needsUpdate=true;});
 }
 if(pages.length===1)stats.atlas=stats.atlases[0];
 return stats;
}
