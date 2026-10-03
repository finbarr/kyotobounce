// Exercise the opening campaign course in the current station preview.
import {readFile} from 'node:fs/promises';
const [opening]=JSON.parse(await readFile('web/starter-challenges.json'));
process.argv=[process.argv[0],process.argv[1],opening.name,'.local/v2/browser',String(opening.hint.holdMs)];
await import('../levels/browser-proof.mjs');
