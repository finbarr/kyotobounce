import sharp from 'sharp';import {readdir,writeFile} from 'node:fs/promises';
const root='research/kyoto-station';
for(const folder of ['photos','current-model']){
 const files=(await readdir(root+'/'+folder)).filter(f=>/\.(jpg|png)$/.test(f)&&!f.startsWith('sheet-')).sort();
 for(let offset=0;offset<files.length;offset+=16){const batch=files.slice(offset,offset+16),w=420,h=290,composite=[];
  for(let i=0;i<batch.length;i++){const f=batch[i],thumb=await sharp(root+'/'+folder+'/'+f).resize(w,h-40,{fit:'inside',background:'#fff'}).extend({top:0,bottom:0,left:0,right:0}).png().toBuffer();const meta=await sharp(thumb).metadata();composite.push({input:thumb,left:(i%4)*w,top:Math.floor(i/4)*h});const label=Buffer.from(`<svg width="420" height="40"><rect width="420" height="40" fill="white"/><text x="6" y="20" font-size="12" fill="black">${f.replaceAll('&','&amp;').slice(0,56)}</text></svg>`);composite.push({input:label,left:(i%4)*w,top:Math.floor(i/4)*h+h-40});}
  await sharp({create:{width:w*4,height:h*Math.ceil(batch.length/4),channels:3,background:'white'}}).composite(composite).png().toFile(root+'/'+folder+'/sheet-'+(offset/16+1)+'.png');
 }
}
