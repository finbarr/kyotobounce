// Prepare an isolated service tree: shared web sources and assets stay read-only.
import {mkdir,readFile,writeFile,symlink,stat,lstat,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.'),scratch=resolve('.local/station-detail/preview'),candidate=resolve('artifacts/station-detail/plaza-landmarks/candidate');
await mkdir(scratch+'/web/public/assets',{recursive:true});
const link=async(from,to)=>{if(!await stat(to).catch(()=>null))await symlink(from,to);};
const {readdir}=await import('node:fs/promises');
for(const item of await readdir(root+'/web'))if(!['public','starter-challenges.json'].includes(item))await link(root+'/web/'+item,scratch+'/web/'+item);
for(const item of await readdir(root+'/web/public'))if(item!=='assets')await link(root+'/web/public/'+item,scratch+'/web/public/'+item);
for(const item of await readdir(root+'/web/public/assets')){
 if(['atrium.glb','station.json','atrium-detail.glb','atrium-detail.json'].includes(item))continue;
 await link(root+'/web/public/assets/'+item,scratch+'/web/public/assets/'+item);
}
for(const f of ['atrium.glb','station.json','atrium-detail.glb','atrium-detail.json'])await link(candidate+'/browser/'+f,scratch+'/web/public/assets/'+f);
await link(root+'/node_modules',scratch+'/node_modules');await link(root+'/runtime',scratch+'/runtime');
await writeFile(scratch+'/package.json',JSON.stringify({type:'module'}));
const {createHash}=await import('node:crypto');
const layout=createHash('sha256').update(await readFile(candidate+'/station-layout.json')).digest('hex');
const first=JSON.parse(await readFile(root+'/web/starter-challenges.json','utf8')).filter(c=>c.id==='atrium-first-bank').at(-1);
const seed=[{...first,layout,revision:first.revision+1,creator:'k028-local-only'}];
for(const [name,x,y,z] of [['shukobu',-65,19.585964912280705,-8],['space',66,20.5,-16],['kyoto',66,20.5,-8]]){
 const disk={center:{x,y,z},radius:.25,surface:name==='shukobu'?'muromachi-square':'east-4f-terrace'};
 seed.push({...first,id:'k028-inspect-'+name,revision:1,name:'K028 '+name+' inspection',creator:'k028-local-only',layout,start:disk,goal:disk,hint:undefined,order:10+seed.length});
}
const seedPath=scratch+'/web/starter-challenges.json';if((await lstat(seedPath).catch(()=>null))?.isSymbolicLink())await unlink(seedPath);
await writeFile(seedPath,JSON.stringify(seed,null,2));
console.log(JSON.stringify({scratch,layout,dataDir:resolve('.local/station-detail/data-'+layout.slice(0,12))}));
