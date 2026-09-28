// Browser-only derivatives of licensed municipal maps. Preserve source originals.
import sharp from 'sharp';
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const candidate=process.argv[2],output=process.argv[3];
if(!candidate||!output)throw Error('Usage: prepare-city-textures.mjs CANDIDATE NEW_OUTPUT');
await mkdir(output);const textureOut=path.join(output,'textures');await mkdir(textureOut);
const bytes=await readFile(path.join(candidate,'station-layout.json')),layout=JSON.parse(bytes);
const sha=b=>createHash('sha256').update(b).digest('hex');
const municipal=new Set(layout.authoredMaterials.filter(m=>m.label.startsWith('Municipal | ')).flatMap(m=>['albedo','normal','mask'].map(k=>m[k]&&path.basename(m[k])).filter(Boolean)));
const receipt={sourceLayoutSha256:sha(bytes),policy:'Municipal texture dimensions capped at 1024 for an initial browser candidate at 1280x720. Original authoring maps retained. Review street-distance detail before accepting this budget. Existing station maps unchanged.',rows:[]};
for(const name of await readdir(path.join(candidate,'textures'))){
 const src=path.join(candidate,'textures',name),dest=path.join(textureOut,name),buffer=await readFile(src),m=await sharp(buffer).metadata();
 const resize=municipal.has(path.parse(name).name)&&Math.max(m.width,m.height)>1024;
 if(resize)await sharp(buffer).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).toFile(dest);else await copyFile(src,dest);
 const result=await readFile(dest),meta=await sharp(result).metadata();
 receipt.rows.push({file:name,municipal:municipal.has(path.parse(name).name),sourceSha256:sha(buffer),outputSha256:sha(result),sourceSize:[m.width,m.height],outputSize:[meta.width,meta.height],sourceBytes:buffer.length,outputBytes:result.length,resized:resize});
}
await copyFile(path.join(candidate,'station-layout.json'),path.join(output,'station-layout.json'));
receipt.sourceRgbaMipBytes=receipt.rows.reduce((sum,r)=>sum+r.sourceSize[0]*r.sourceSize[1]*16/3,0);
receipt.outputRgbaMipBytes=receipt.rows.reduce((sum,r)=>sum+r.outputSize[0]*r.outputSize[1]*16/3,0);
await writeFile(path.join(output,'texture-profile.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({textures:receipt.rows.length,resized:receipt.rows.filter(r=>r.resized).length,sourceMiB:receipt.sourceRgbaMipBytes/2**20,outputMiB:receipt.outputRgbaMipBytes/2**20}));
