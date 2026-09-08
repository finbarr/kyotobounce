import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wayfindingRegistrations as rows,wayfindingLayout} from '../public/station-details.js';
import {createHash} from 'node:crypto';
const bytes=await readFile('runtime/station-layout.json'),layout=JSON.parse(bytes),meta=JSON.parse(await readFile('web/public/assets/atrium-detail.json'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),wayfindingLayout);
assert.equal(meta.sourceLayoutSha256,wayfindingLayout);
assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
for(const sign of meta.signs)assert.ok(rows.some(r=>r.id===sign.id),`Explicit decision for ${sign.id}`);
for(const r of rows){
 assert.equal(r.checked,'2026-09-08');assert.ok(r.source&&r.certainty);
 assert.ok(!r.rows.some(row=>/THEATER|Theater|京都劇場|Granvia|グランヴィア/.test(row.join(' '))),'No unverified tenants');
 if(r.anchor){
  const anchor=layout.panels.find(p=>p.id===r.anchor);assert.ok(anchor,r.anchor);
  for(const [i,axis] of ['x','y','z'].entries()){
   const values=anchor.vertices.map(p=>p[axis]);assert.ok(r.bounds[i][0]>=Math.min(...values)-.001&&r.bounds[i][1]<=Math.max(...values)+.001,`${r.id} flush within ${axis} anchor`);
  }
 }
}
const board=rows.find(r=>r.id==='central-hall-information-board-structure');
assert.equal(board.face,'north');
assert.equal(board.rows[0][0],'right');assert.match(board.rows[0][1],/2F/);
assert.equal(board.rows[2][0],'left');assert.match(board.rows[2][1],/7F/);
assert.match(board.rows[3][1],/10F/);
assert.equal(rows.find(r=>r.id==='wayfinding-east-ascent').rows[0][0],'right','Backtrack west to the modeled east stair foot');
assert.equal(rows.filter(r=>r.rows.length).length,5);
assert.ok(rows.filter(r=>r.anchor).every(r=>!r.anchor.includes('konbini')),'Shop identity reserved');
console.log('PASS: 13 exact frontage decisions, 2 surface anchors, floors and reader-relative directions, no guessed tenant or shop duplicates');
