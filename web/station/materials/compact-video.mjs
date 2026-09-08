// Keep original-speed, fixed-resolution excerpts around each movement capture.
// Stream copy preserves encoded pixels/cadence; raw recordings are removed only
// after every excerpt has a readable WebM header. No new imagery is synthesized.
import {readdir,stat,mkdir,writeFile,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='artifacts/station-detail/photorealism/candidate',ffmpeg='.local/station-detail/playwright/ffmpeg-1011/ffmpeg-linux';
const videos=await Promise.all((await readdir(dir)).filter(n=>n.startsWith('page@')&&n.endsWith('.webm')).map(async name=>({name,...await stat(`${dir}/${name}`)})));
const clips=[];await mkdir(`${dir}/motion`,{recursive:true});
for(const view of ['hall','escalator-lower','escalator-upper','doorway','garden','shop-gallery']){
 const png=await stat(`${dir}/${view}-moving.png`);
 const source=videos.filter(v=>v.birthtimeMs<=png.mtimeMs&&v.mtimeMs>=png.mtimeMs).sort((a,b)=>b.birthtimeMs-a.birthtimeMs)[0];assert(source,view);
 const seconds=Math.max(0,(png.mtimeMs-source.birthtimeMs)/1000-20),path=`${dir}/motion/${view}.webm`;
 const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss',String(seconds),'-i',`${dir}/${source.name}`,'-t','35','-c','copy',path],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const header=spawnSync(ffmpeg,['-hide_banner','-i',path],{encoding:'utf8'}).stderr;assert.match(header,/Video: vp8/);assert.match(header,/1280x800/);assert((await stat(path)).size>10000);
 clips.push({view,path,source:source.name,startSeconds:seconds,requestedSeconds:35,bytes:(await stat(path)).size,method:'WebM stream copy; original pixels, resolution and playback cadence'});
}
await writeFile('artifacts/station-detail/photorealism/motion-receipt.json',JSON.stringify(clips,null,2));
for(const video of videos)await unlink(`${dir}/${video.name}`);
console.log('PASS six original-speed 1280x800 movement excerpts; superseded raw recordings removed',clips.reduce((n,c)=>n+c.bytes,0),'bytes');
