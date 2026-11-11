import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
// Rebuild the small source bundle and validate the current asset receipt before
// streaming an explicit build context. No repository-wide context, credentials,
// art trees or second copy of the collision pack is sent to the image builder.
await import('./build.mjs');
const runtime=process.env.KYOTO_CONTAINER_RUNTIME||'podman';if(!['podman','docker'].includes(runtime))throw Error('Choose podman or docker');
const tar=spawn('tar',['-cf','-',
 '-C',resolve('deploy/verification'),'Dockerfile',
 '-C',resolve('.local/verification/build'),'server.mjs','release.json',
 '-C',resolve('.'),'package.json','package-lock.json','LICENSE',
 '-C',resolve('web'),'starter-challenges.json',
 '-C',resolve('web/public'),'credits.html',
 '-C',resolve('.local/browser-physics'),'station.collision.bin'
],{stdio:['ignore','pipe','inherit']});
const builder=spawn(runtime,['build','--platform','linux/amd64','--tag','localhost/kyoto-verifier:local','-'],{stdio:['pipe','inherit','inherit']});
const complete=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(Error(`Image build process failed: ${code??signal}`)));});
tar.stdout.pipe(builder.stdin);builder.stdin.on('error',()=>{});
try{await Promise.all([complete(tar),complete(builder)]);}finally{if(tar.exitCode===null)tar.kill();if(builder.exitCode===null)builder.kill();}
