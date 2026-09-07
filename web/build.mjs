import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const editor = process.env.KYOTO_UNITY || '/Applications/Unity/Hub/Editor/6000.3.23f1/Unity.app/Contents/MacOS/Unity';
const logs = resolve(root, 'artifacts/phase3/builds');
mkdirSync(logs, { recursive: true });
const logfile = resolve(logs, `web-${new Date().toISOString().replaceAll(':', '-')}.log`);
console.log(`Building the frozen atrium for Web. Log: ${logfile}`);
const child = spawn(editor, ['-batchmode', '-projectPath', resolve(root, 'KyotoRicochet'),
  '-buildTarget', 'WebGL', '-executeMethod', 'Kyoto.Editor.BrowserMvpBuilder.Build',
  '-logFile', logfile, ...(process.argv.includes('--release') ? ['--kyoto-web-release'] : []), '-quit'], { cwd: root, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  process.exitCode = code ?? 1;
  console.log(code === 0 ? 'Browser build ready. Run npm start.' : `Browser build failed (${code ?? signal}). See ${logfile}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
