import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
// Every worktree defaults to its own database, logs, assets and native project.
const port=process.argv[2]||process.env.KYOTO_PORT||'4173';
if(!/^\d+$/.test(port)||Number(port)<1024||Number(port)>65535)throw new Error('Choose a port from 1024 to 65535');
const child=spawn(process.execPath,['web/server.ts'],{stdio:'inherit',env:{...process.env,KYOTO_PORT:port,KYOTO_DATA_DIR:process.env.KYOTO_DATA_DIR||resolve('.local',port,'data'),KYOTO_WORKER_LOG:process.env.KYOTO_WORKER_LOG||resolve('.local',port,'worker.log')}});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
