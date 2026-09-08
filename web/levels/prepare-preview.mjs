// Seed only a fresh isolated K019 database; shared starter JSON is untouched.
import { readFile,mkdir,access,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Store } from '../store.ts';
const [candidateFile,layoutFile,physics]=process.argv.slice(2);
if(!candidateFile||!layoutFile||!['kyoto-p3-1','kyoto-p3-2'].includes(physics))throw Error('Usage: node web/levels/prepare-preview.mjs candidate.json layout.json physics-version');
const dir=resolve('.local/4284/data'),db=resolve(dir,'kyoto.sqlite');
try{await access(db);throw Error('Refusing existing preview DB; preserve its replays and use a reviewed migration');}catch(e){if(e.code!=='ENOENT')throw e;}
const candidates=JSON.parse(await readFile(candidateFile,'utf8'));
const layout=createHash('sha256').update(await readFile(layoutFile)).digest('hex');
const original=JSON.parse(await readFile('web/starter-challenges.json','utf8'));
const pairs=new Set(original.map(c=>`${c.id}/${c.revision}`));
for(const c of candidates){if(pairs.has(`${c.id}/${c.revision}`))throw Error('Historical revision collision');pairs.add(`${c.id}/${c.revision}`);if(c.scoring!=='waypoint-v1')throw Error('K019 candidates must use waypoint-v1');}
await mkdir(dir,{recursive:true});const store=new Store(db);
try{for(const c of original)store.saveChallenge(c);for(const c of candidates)store.saveChallenge({...c,layout,physics});}finally{store.close();}
await writeFile(resolve('.local/4284/seed.json'),JSON.stringify({scope:'Isolated review candidate seed; no public publication',candidateFile,layoutFile,layout,physics,ids:candidates.map(c=>`${c.id}/${c.revision}`)},null,2));
console.log('Prepared isolated DB on port 4284; set KYOTO_LAYOUT and explicit compatible worker when starting dev.');
