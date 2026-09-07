import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client} from './api-client.mjs';
const prior=new DatabaseSync(process.env.KYOTO_MIGRATION_BACKUP||'artifacts/phase3/arcade/before-scoring.sqlite',{readOnly:true}),current=new DatabaseSync('web/data/kyoto.sqlite',{readOnly:true});
const challenges=prior.prepare('SELECT * FROM challenges').all(),attempts=prior.prepare('SELECT * FROM attempts').all();
for(const c of challenges)assert.deepEqual(current.prepare('SELECT * FROM challenges WHERE id=? AND revision=?').get(c.id,c.revision),c);
for(const a of attempts)assert.deepEqual(current.prepare('SELECT * FROM attempts WHERE id=?').get(a.id),a);
const candidates=prior.prepare("SELECT id,replay FROM attempts WHERE json_extract(replay,'$.animation')='ori-carry-v2' AND json_extract(replay,'$.scoring') IN ('distinct-v1','accuracy-v2') GROUP BY json_extract(replay,'$.scoring')").all();
assert.ok(candidates.length);const c=new Client();try{
 await c.join();for(const candidate of candidates){const replay=(await c.request('replay',{attempt:candidate.id},'replay')).replay;assert.deepEqual(replay,JSON.parse(candidate.replay));}
 await writeFile(process.env.KYOTO_MIGRATION_EVIDENCE||'artifacts/phase3/arcade/migration.json',JSON.stringify({status:'pass',unchangedChallenges:challenges.length,unchangedAttempts:attempts.length,legacyReplayAccepted:true},null,2));console.log(`PASS ${challenges.length} historical challenge revisions and ${attempts.length} attempts unchanged; old replay accepted by current service`);
}finally{c.close();prior.close();current.close();}
