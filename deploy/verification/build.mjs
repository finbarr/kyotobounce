import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {hashFile} from '../station.mjs';
import {BROWSER_PHYSICS} from '../../web/public/physics/shot.js';
const output='.local/verification/build';await mkdir(output,{recursive:true});
const collision='.local/browser-physics/station.collision.bin',receipt=JSON.parse(await readFile(collision+'.json','utf8'));
assert.equal((await stat(collision)).size,receipt.bytes);assert.equal(await hashFile(collision),receipt.sha256,'The collision pack must match its receipt');
const campaignBytes=await readFile('web/starter-challenges.json'),catalog=JSON.parse(campaignBytes);
assert.equal(catalog.length,30);assert(catalog.every(c=>c.layout===receipt.layoutSha256&&c.scoring==='waypoint-v4'),'The verifier must use the current station and campaign');
await build({entryPoints:['web/online-server.mjs'],bundle:true,packages:'external',format:'esm',platform:'node',target:'node22',outfile:output+'/server.mjs',legalComments:'eof'});
const release={kind:'kyoto-verifier-v1',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),physics:BROWSER_PHYSICS,layout:receipt.layoutSha256,
 campaignSha256:createHash('sha256').update(campaignBytes).digest('hex'),collision:{bytes:receipt.bytes,sha256:receipt.sha256},serverSha256:await hashFile(output+'/server.mjs')};
await writeFile(output+'/release.json',JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({output,...release},null,2));
