// Disposable source-only install: no Git worktree, Unity project, source art,
// symlinked dependencies or prebuilt collision data can hide missing inputs.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),output=resolve('.local/asset-setup-test');await mkdir(output,{recursive:true});
await writeFile(output+'/receipt.json',JSON.stringify({passed:false})+'\n');
const manifest=JSON.parse(await readFile('assets-manifest.json'));
const archive=resolve(process.env.KYOTO_ASSET_ARCHIVE||`.local/asset-pack/kyoto-${manifest.version}.tar.gz`);
const temp=await mkdtemp(join(tmpdir(),'kyoto-browser-install-')),log=createWriteStream(output+'/setup.log');
let active;
async function run(args){
 console.log('Fresh install: npm '+args.join(' '));
 await new Promise((done,reject)=>{
  const child=spawn('npm',args,{cwd:temp,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32',env:{...process.env,KYOTO_ASSET_ARCHIVE:archive,KYOTO_ASSET_CACHE:join(temp,'.local/download-cache'),KYOTO_V2_ASSETS:'',KYOTO_WORKER_EXECUTABLE:'/kyoto-native-runtime-disabled',UNITY_EDITOR:'/kyoto-native-runtime-disabled',KYOTO_VERIFY_URL:''}});active=child;
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log.write(chunk);process.stdout.write(chunk);});
  child.once('error',reject);child.once('close',(code,signal)=>{active=null;code===0?done():reject(Error('Fresh install command failed: '+args.join(' ')+' ('+(code??signal)+')'));});
 });
}
try{
 const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
 const include=p=>['package.json','package-lock.json','assets-manifest.json','LICENSE','README.md','AGENTS.md'].includes(p)||/^(web|tools|deploy|docs)\//.test(p);
 for(const name of new Set(paths.filter(include))){await mkdir(dirname(join(temp,name)),{recursive:true});await cp(join(root,name),join(temp,name));}
 await run(['run','setup']);
 await run(['run','assets:verify']);
 const collision=JSON.parse(await readFile(join(temp,'.local/browser-physics/station.collision.bin.json')));
 assert.equal(collision.layoutSha256,manifest.layoutSha256);
 assert.equal(collision.sha256,'62e0e5a0e623f0171ed06c282dc5ea1376b0bb03d48489d3a851e25c3fbbeb79','Installed canonical layout must reproduce the verified collision bytes');
 await run(['run','test:browser']);
 for(const [from,to] of [['receipt.json','startup.json'],['game/receipt.json','game.json'],['game/first-bounce.png','first-bounce.png']])await cp(join(temp,'.local/browser-startup-test',from),join(output,to));
 const game=JSON.parse(await readFile(output+'/game.json'));assert.equal(game.passed,true);
 await writeFile(output+'/receipt.json',JSON.stringify({passed:true,version:manifest.version,manifestSha256:createHash('sha256').update(await readFile('assets-manifest.json')).digest('hex'),archiveSha256:manifest.archive.sha256,layout:manifest.layoutSha256,collisionSha256:collision.sha256,gameplay:'game.json',sourceOnly:true,installedAssets:Object.keys(manifest.files)},null,2)+'\n');
 console.log('PASS fresh source-only setup, six installed assets, exact regenerated collision and offline browser gameplay');
}finally{
 if(active){if(process.platform==='win32')active.kill('SIGTERM');else process.kill(-active.pid,'SIGTERM');}
 await new Promise(resolve=>log.end(resolve));
 await rm(temp,{recursive:true,force:true});
}
