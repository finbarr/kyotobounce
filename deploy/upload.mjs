import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {basename,dirname,join} from 'node:path';
const local=await readFile('.deploy.local.json','utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return {};throw error;});
const release=(await readFile('artifacts/online/latest-release.txt','utf8')).trim(),name=basename(release);
const target=process.env.KYOTO_SSH_TARGET||local.target;
const hostname=process.env.KYOTO_HOST||local.hostname;
const key=process.env.KYOTO_SSH_KEY||local.key;
if(!target||!hostname||!key)throw new Error('Set KYOTO_SSH_TARGET, KYOTO_HOST and KYOTO_SSH_KEY before deploying');
if(!/^[\dTZ.-]+$/.test(name)||!/^[a-zA-Z0-9.-]+$/.test(hostname)||!/^[a-zA-Z0-9@.-]+$/.test(target))throw new Error('Invalid deployment destination');
await readFile(join(release,'release.json'));
const remote='/opt/kyoto/releases/'+name;
// macOS resource-fork sidecars look like invalid native plugins to Unity on Linux.
const tar=spawn('tar',[...(process.platform==='darwin'?['--no-xattrs','--no-mac-metadata']:[]),'-czf','-','-C',dirname(release),name],{stdio:['ignore','pipe','inherit'],env:{...process.env,COPYFILE_DISABLE:'1'}});
const ssh=spawn('ssh',['-i',key,'-o','IdentitiesOnly=yes','-o','BatchMode=yes',target,`tar -xzf - -C /opt/kyoto/releases && bash ${remote}/deploy/activate.sh ${remote} ${hostname}`],{stdio:['pipe','inherit','inherit']});
tar.stdout.pipe(ssh.stdin);ssh.stdin.on('error',()=>tar.kill());
const wait=child=>new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Deployment command exited '+code)));});
try{await Promise.all([wait(tar),wait(ssh)]);console.log('Activated https://'+hostname);}
catch(error){tar.kill();ssh.kill();throw error;}
