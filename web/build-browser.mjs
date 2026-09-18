import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {socialPage} from './social-metadata.ts';
import { withChallengeRules } from './types.ts';
import {buildRuntimeAssets} from '../tools/optimize-browser-assets.mjs';
await buildRuntimeAssets();
const shellPath='web/public/index.html',shell=await readFile(shellPath,'utf8'),socialShell=socialPage(shell,{});
if(shell!==socialShell)await writeFile(shellPath,socialShell);
const starterFile='web/starter-challenges.json';
const starterText=await readFile(starterFile,'utf8'),starterData=JSON.stringify(JSON.parse(starterText).map(withChallengeRules),null,2)+'\n';
if(starterText!==starterData)await writeFile(starterFile,starterData);
const files=['web/social-metadata.ts','web/public/brand/kyoto-bounce-social.jpg','web/public/favicon.svg','web/public/favicon.ico','web/public/apple-touch-icon.png','web/public/loading.js','web/public/loading.css','web/public/mobile.css','web/public/mobile-controls.js','web/public/touch-input.js','web/public/waypoint-card.js','web/public/static-transforms.js','web/public/camera-obstacles.js','web/public/fly-camera.js','web/public/design-geometry.js','web/public/speed-blur.js','web/public/throw-style.js','web/public/replay-links.js','web/public/level-links.js','web/public/level-entry.js','web/public/level-progress.js','web/public/result-board.js','web/public/player-name.js','web/public/celebration.js','web/public/replays.css','web/public/index.html','web/public/style.css','web/public/game.js','web/public/connection.js','web/public/performance.js','web/public/shot-playback.js','web/public/live-throw.js','web/public/concourse-details.js','web/public/ball-rotation.js','web/public/throw-power.js','web/public/charge-meter.js','web/public/aim-reticle.js','web/public/avatar.js','web/public/character-picker.js','web/public/debug.js','web/public/station-look.js','web/public/station-materials.js','web/public/station-lighting.js','web/public/station-installations.js','web/public/station-details.js','web/public/escalators.js','web/public/competition.js','web/public/start-marker.js','web/public/waypoint-targets.js','web/public/waypoint-score.js','web/public/ball-heat.js','web/public/arcade-audio.js','web/public/arcade-feedback.js','web/public/arcade-particles.js','web/public/briefing.js','web/public/arcade.css','web/starter-challenges.json','web/public/assets/runtime/atrium.glb','web/public/assets/runtime/optimization.json','web/public/assets/station.json','web/public/assets/runtime/atrium-detail.glb','web/public/assets/atrium-detail.json','web/public/assets/runtime/ori.glb','web/server.ts','web/connection-queue.ts','web/performance.ts','web/shot-stream.ts','web/competition.ts','web/store.ts','web/replay-cache.ts','web/replay-http.ts','web/level-http.ts','web/worker.ts','web/types.ts','web/scoring.ts','web/stop.mjs','package.json','package-lock.json'];
const manifest={builtUtc:new Date().toISOString(),renderer:'three-0.185.1',scope:'Local browser assets and service sources; native physics worker is built separately',files:{}};
for(const file of files){await access(file);const bytes=await readFile(file);manifest.files[file]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
await writeFile('web/public/browser-build.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Browser modules and authored assets ready:',resolve('web/public/browser-build.json'));
console.log('First-time native setup: npm run build:worker. Start local game: npm start');
