import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname, resolve} from 'node:path';

const run=promisify(execFile);
export const macWorkerBundle=resolve('Builds/PhysicsWorker/Kyoto Physics Worker.app');

// Batch mode suppresses Unity graphics, but the macOS bundle must also opt out
// of foreground activation. Do not silently modify a shared worker at launch.
export async function assertBackgroundWorker(executable:string) {
  if(process.platform!=='darwin')return;
  const contents=dirname(dirname(executable)),bundle=dirname(contents);
  if(!bundle.endsWith('.app')||!contents.endsWith('/Contents'))
    throw new Error('macOS physics requires a background-only worker app bundle.');
  let background=false;
  try {
    const {stdout}=await run('/usr/bin/plutil',['-extract','LSBackgroundOnly','raw','-expect','bool','-o','-',resolve(contents,'Info.plist')]);
    background=stdout.trim()==='true';
  } catch {}
  if(!background)throw new Error('Physics worker is not background-only. Stop it, then run node web/prepare-macos-worker.mjs or rebuild with npm run build:worker.');
}

export async function prepareBackgroundWorker(bundle=macWorkerBundle) {
  if(process.platform!=='darwin')throw new Error('Only macOS worker bundles need this preparation.');
  const plist=resolve(bundle,'Contents/Info.plist');
  const {stdout}=await run('/usr/bin/plutil',['-extract','CFBundleName','raw','-o','-',plist]);
  if(stdout.trim()!=='Kyoto Physics Worker')throw new Error('Refusing to modify a bundle other than Kyoto Physics Worker.');
  await run('/usr/bin/plutil',['-replace','LSBackgroundOnly','-bool','true',plist]);
  // Updating Info.plist invalidates Unity's local ad-hoc signature.
  await run('/usr/bin/codesign',['--force','--sign','-',bundle]);
  await run('/usr/bin/codesign',['--verify','--deep','--strict',bundle]);
}
