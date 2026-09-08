import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { withChallengeRules } from './types.ts';
const starterFile='web/starter-challenges.json';
const starterText=await readFile(starterFile,'utf8'),starterData=JSON.stringify(JSON.parse(starterText).map(withChallengeRules),null,2)+'\n';
if(starterText!==starterData)await writeFile(starterFile,starterData);
const files=['web/public/index.html','web/public/style.css','web/public/game.js','web/public/ball-rotation.js','web/public/throw-power.js','web/public/avatar.js','web/public/debug.js','web/public/station-look.js','web/public/station-details.js','web/public/escalators.js','web/public/competition.js','web/public/waypoint-targets.js','web/public/waypoint-score.js','web/public/ball-heat.js','web/public/arcade-audio.js','web/public/arcade-feedback.js','web/public/briefing.js','web/public/arcade.css','web/starter-challenges.json','web/public/assets/atrium.glb','web/public/assets/station.json','web/public/assets/atrium-detail.glb','web/public/assets/atrium-detail.json','web/public/assets/ori.glb','web/server.ts','web/competition.ts','web/store.ts','web/worker.ts','web/types.ts','web/scoring.ts','web/stop.mjs','package.json','package-lock.json'];
const manifest={builtUtc:new Date().toISOString(),renderer:'three-0.185.1',scope:'Local browser assets and service sources; native physics worker is built separately',files:{}};
for(const file of files){await access(file);const bytes=await readFile(file);manifest.files[file]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
await writeFile('web/public/browser-build.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Browser modules and authored assets ready:',resolve('web/public/browser-build.json'));
console.log('First-time native setup: npm run build:worker. Start local game: npm start');
