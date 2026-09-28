import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const courses=JSON.parse(await readFile(new URL('../starter-challenges.json',import.meta.url)));
assert.deepEqual(courses,[],'V2 starts in exploration with no retired campaign');
console.log('PASS v2 exploration catalog');
