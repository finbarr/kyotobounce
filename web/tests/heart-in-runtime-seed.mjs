// Add a private local revision of the unchanged First Bank for the runtime suite.
// Run with this task's service stopped. Never accepts a DB path or remote origin.
import{Store}from'../store.ts';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
const store=new Store('.local/4281/data/kyoto.sqlite'),old=store.challenge('atrium-first-bank');
const hash=createHash('sha256').update(await readFile('.local/station-detail/candidate/station-layout.json')).digest('hex');
if(old.layout!==hash)store.saveChallenge({...old,revision:old.revision+1,layout:hash});
store.db.close();
