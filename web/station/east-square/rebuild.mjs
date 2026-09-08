// Sequential isolated build: one Blender editor/export at a time.
import {spawnSync} from 'node:child_process';
const dir='.local/station-detail/candidate';
const steps=[
 ['python3',['web/tests/east-square-support.py']],
 ['blender',['-b','--python','web/station/east-square/build.py']],
 ['python3',['web/tests/east-square-support.py']],
 ['blender',['-b','--python','tools/export_browser_art.py','--','--source',`${dir}/assembled.blend`,'--layout',`${dir}/station-layout.json`,'--output',`${dir}/browser`]],
 ['blender',['-b','--python','tools/build_atrium_detail.py','--','--layout',`${dir}/station-layout.json`,'--output',`${dir}/browser`,'--source-output',`${dir}/hardware`]],
 ['node',['web/tests/east-square-geometry.mjs']],
 ['node',['web/tests/east-square-preservation.mjs']]
];
for(const [cmd,args] of steps){console.log('K027:',cmd,...args);const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
console.log('PASS K027 sequential candidate build and geometry checks');
