import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const portText=process.argv[2]||process.env.KYOTO_PORT||'4173',port=Number(portText);
if(!/^\d+$/.test(portText)||!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a local port from 1024 to 65535');
if(process.platform!=='darwin')throw new Error('Use Ctrl-C in the preview terminal on this platform. npm stop currently supports macOS.');
let pids=[];
try{pids=execFileSync('/usr/sbin/lsof',['-nP',`-i4TCP:${port}`,'-sTCP:LISTEN','-t'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split(/\s+/).filter(Boolean).map(Number);}catch{}
pids=[...new Set(pids)];
if(!pids.length){console.log('Kyoto local service is already stopped.');process.exit(0);}
const matching=pids.filter(pid=>{
 try{
  const command=execFileSync('/bin/ps',['-p',String(pid),'-o','command='],{encoding:'utf8'}).trim();
  const cwd=execFileSync('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(line=>line.startsWith('n'))?.slice(1);
  return /^(?:\S+\/)?node web\/browser-dev\.mjs(?: \d+)?$/.test(command)&&cwd===process.cwd();
 }catch{return false;}
});
if(!matching.length){console.log('Kyoto local service is stopped; other applications were left running.');process.exit(0);}
if(matching.length!==1)throw new Error('More than one Kyoto service matched; stop the intended service in its terminal.');
const pid=matching[0];
process.kill(pid,'SIGINT');const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
for(let i=0;i<80;i++){if(!alive(pid)){console.log('Stopped Kyoto browser preview.');process.exit(0);}await delay(100);}
throw new Error('Shutdown is still in progress; inspect the terminal before starting another copy.');
