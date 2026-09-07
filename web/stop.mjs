import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const port=Number(process.env.KYOTO_PORT||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid KYOTO_PORT');
let pids=[];
try{pids=execFileSync('/usr/sbin/lsof',['-nP',`-i4TCP:${port}`,'-sTCP:LISTEN','-t'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split(/\s+/).filter(Boolean).map(Number);}catch{}
pids=[...new Set(pids)];
if(!pids.length){console.log('Kyoto local service is already stopped.');process.exit(0);}
const matching=pids.filter(pid=>{
 try{
  const command=execFileSync('/bin/ps',['-p',String(pid),'-o','command='],{encoding:'utf8'}).trim();
  const cwd=execFileSync('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(line=>line.startsWith('n'))?.slice(1);
  return /^(?:\S+\/)?node web\/server\.ts$/.test(command)&&cwd===process.cwd();
 }catch{return false;}
});
if(!matching.length){console.log('Kyoto local service is stopped; other applications were left running.');process.exit(0);}
if(matching.length!==1)throw new Error('More than one Kyoto service matched; stop the intended service in its terminal.');
const pid=matching[0];
let children=[];try{children=execFileSync('/usr/bin/pgrep',['-P',String(pid)],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean).map(Number);}catch{}
process.kill(pid,'SIGINT');const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
for(let i=0;i<80;i++){if(![pid,...children].some(alive)){console.log('Stopped Kyoto local service and its physics worker.');process.exit(0);}await delay(100);}
throw new Error('Shutdown is still in progress; inspect the terminal before starting another copy.');
