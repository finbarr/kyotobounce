import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rename,rm,access,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const directory=resolve('.local/verification');await mkdir(directory,{recursive:true});
const jar=resolve(process.env.KYOTO_FIRESTORE_EMULATOR_JAR||directory+'/firestore.jar');
const hash='9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c';
async function valid(){try{const b=await readFile(jar);return b.length===136707194&&createHash('sha256').update(b).digest('hex')===hash;}catch{return false;}}
if(!await valid()){
 const response=await fetch('https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.22.0.jar');if(!response.ok)throw Error('Unable to download the official Firestore emulator');
 const temporary=jar+'.download';try{await writeFile(temporary,response.body);const b=await readFile(temporary);if(b.length!==136707194||createHash('sha256').update(b).digest('hex')!==hash)throw Error('Firestore emulator checksum differs');await rename(temporary,jar);}finally{await rm(temporary,{force:true});}
}
let java=process.env.KYOTO_JAVA||'java';if(!process.env.KYOTO_JAVA&&process.platform==='darwin'){try{await access('/opt/homebrew/opt/openjdk/bin/java');java='/opt/homebrew/opt/openjdk/bin/java';}catch{}}
const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const log=await open(directory+'/emulator.log','w'),child=spawn(java,['-Xms32m','-Xmx256m','-jar',jar,'--host=127.0.0.1','--port='+port,'--project_id=demo-kyoto-verification'],{stdio:['ignore',log.fd,log.fd]});
let failure,test;const exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',error=>{failure=error;resolve();});});
const interrupt=()=>{test?.kill('SIGTERM');child.kill('SIGTERM');};
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,interrupt);
try{
 const until=Date.now()+45000;while(true){if(failure)throw failure;if(child.exitCode!==null)throw Error('Firestore emulator stopped; inspect .local/verification/emulator.log');try{await fetch(`http://127.0.0.1:${port}/`);break;}catch{}if(Date.now()>until)throw Error('Firestore emulator did not become ready');await delay(100);}
 const script=process.argv.includes('--container')?'./verifier-container.mjs':process.argv.includes('--browser-courses')?'./browser-course-sharing.mjs':process.argv.includes('--browser')?'./browser-online.mjs':process.argv.includes('--browser-sync')?'./browser-score-sync.mjs':'./online-service.mjs';
 test=spawn(process.execPath,[fileURLToPath(new URL(script,import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,FIRESTORE_EMULATOR_HOST:`127.0.0.1:${port}`,GOOGLE_CLOUD_PROJECT:'demo-kyoto-verification'}});
 const code=await new Promise((resolve,reject)=>{test.once('error',reject);test.once('exit',resolve);});if(code!==0)throw Error('On-demand verification checks failed');
}finally{interrupt();await exited;await log.close();for(const signal of ['SIGINT','SIGTERM'])process.removeListener(signal,interrupt);}
