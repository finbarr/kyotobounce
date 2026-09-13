import * as THREE from 'three';
import {resultBoard} from './result-board.js';
import {fetchReplay,copyReplay,replayURL} from './replay-links.js';
import {arcadeFeedback} from './arcade-feedback.js';
import {waypointTargets} from './waypoint-targets.js';
import {scoreAt,collectedIds} from './waypoint-score.js';
const $=id=>document.getElementById(id),v=p=>new THREE.Vector3(p.x,p.y,-p.z);
export function competitionUI({scene,send,cancel,notice,getGuestId,getLiveTime,getPhase,resetView,overview,sound,sharedReplay=false,getLayout=()=>null}){
 const feedback=arcadeFeedback(sound);
 const host=document.createElement('aside');host.id='competition';host.innerHTML=`
 <div id="course-view"><div class="panel-top"><span class="eyebrow">STAGE SELECT / 選択</span><button id="new-challenge">＋ Create</button></div><h2 id="course-title">PICK YOUR LINE.</h2><div id="turn-status"></div><label class="campaign-picker" id="campaign-picker" hidden><span id="campaign-count"></span><select id="campaign-chapter" aria-label="Campaign chapter"></select></label><div id="course-list"></div><div class="actions"><button id="explore">Free exploration</button></div><div id="challenge-detail" hidden><p id="challenge-description"></p><button id="show-overview">◎ View course overview</button><button id="use-hint" hidden>Set suggested aim <kbd>H</kbd></button><p id="hint-note"></p><div id="timing-hint" hidden><span class="eyebrow">ESCALATOR RELEASE TIMING</span><div class="timing-track"><i id="timing-window"></i><b id="timing-cursor"></b></div><p id="timing-caption"></p></div><div class="board-title"><span class="eyebrow">HIGH SCORES</span><button id="edit-challenge" hidden>Revise</button></div><div id="leaderboard"></div><details id="score-guide"><summary>HOW TO SCORE</summary><p><strong>10,000 base × 1.75 per distinct bank × landing accuracy.</strong> Five banks can earn hundreds of thousands; longer chains can reach millions.</p><p>Keep 100% inside the gold bullseye. The outer rings show 75%, 50% and 25%, fading to zero at the edge. Height counts too. Tagging the target guarantees 25% even if it rolls out.</p><p>Spaced banks count once per surface; a flight of treads counts as one. Movement adds 100 points per second outside every multiplier. Waiting and spinning in place add nothing. Banks freeze at the first target hit. A far miss without a tag earns zero.</p><p>The score locks only when the ball stops moving and spinning. Recall forfeits the shot.</p></details></div></div>
 <div id="editor-view" hidden><div class="panel-top"><span class="eyebrow">CREATE A CHALLENGE</span><button id="close-editor">✕</button></div><h2>BUILD A STAGE.</h2><label class="field">Scoring<select id="challenge-scoring"><option value="waypoint-v3">Waypoint chain · optional destination</option><option value="combo-v7">Classic · destination accuracy</option></select></label><label class="field">Name<input id="challenge-name" maxlength="64" placeholder="The impossible bank"></label><div class="circle-control"><button id="place-start">1 · Place start</button><label>Radius <output id="start-radius-label">0.75 m</output><input id="start-radius" type="range" min="0.25" max="3" step="0.05" value="0.75"></label></div><label id="destination-toggle"><input id="has-destination" type="checkbox" checked> Add one destination bonus</label><div class="circle-control" id="destination-controls"><button id="place-goal">Place destination</button><label>Radius <output id="goal-radius-label">0.75 m</output><input id="goal-radius" type="range" min="0.1" max="2" step="0.05" value="0.75"></label></div><div id="waypoint-editor"><div class="panel-top"><b id="waypoint-editor-count">0 / 32 waypoints</b><button id="add-waypoint">＋ Waypoint</button></div><div id="waypoint-list"></div><label class="field">Waypoint radius <output id="waypoint-radius-label">0.75 m</output><input id="waypoint-radius" type="range" min="0.1" max="2" step="0.05" value="0.75"></label><button id="replace-waypoint" disabled>Move selected waypoint</button><p>Optional, any order, once per shot. Click a fixed floor, wall or ceiling. Moving treads are not supported.</p></div><p id="placement-status" role="status">Choose a circle, then click a fixed floor. Walk or orbit to reach another view.</p><button id="save-challenge">Save challenge</button></div>
 <div id="replay-view" hidden><div class="panel-top"><span class="eyebrow">REPLAY / リプレイ</span><button id="close-replay">✕</button></div><h2 id="replay-title"></h2><div id="replay-score"></div><input id="replay-scrub" type="range" aria-label="Replay time" step="0.005" value="0"><div class="actions"><button id="replay-play">Pause</button><select id="replay-speed" aria-label="Replay speed"><option value="0.25">¼ speed</option><option value="0.5">½ speed</option><option value="1" selected>Normal</option></select><button id="replay-recenter">Recenter</button></div><div class="replay-share actions"><button id="share-replay">Copy replay link ↗</button><a id="play-replay-level" href="/">Play this level →</a></div><p id="replay-status" role="status">Right-drag or use arrows to orbit. Scroll to zoom. Space to pause.</p></div>
 <div id="result-card" hidden><span class="eyebrow" id="result-label"></span><div class="result-rank" id="result-rank"></div><h2 id="result-title"></h2><p id="result-breakdown"></p><div id="result-math"></div><p class="result-tip" id="result-tip"></p><div class="actions"><button id="try-result">Try again <kbd>R</kbd></button><button id="watch-result">Watch replay</button><button id="share-result">Copy replay link ↗</button><button id="next-challenge">Next challenge <kbd>SPACE</kbd> →</button></div></div>`;document.body.append(host);
 const results=document.createElement('div');results.id='results-screen';document.body.append(results);results.append($('result-card'));
 const ranking=resultBoard({host:results,watch:openReplay,sound});
 const classicScoreGuide=$('score-guide').innerHTML;
 const state={chapter:null,mode:'play',session:null,challenges:[],selected:null,board:[],draft:{start:null,goal:null,waypoints:[],scoring:'waypoint-v3'},selectedWaypoint:null,editId:null,placing:null,replay:null,replayTime:0,replayPlaying:false,lastResult:null,hint:null};
 const powerMarker=document.createElement('b');powerMarker.id='hint-power-marker';powerMarker.hidden=true;document.querySelector('.power-track').append(powerMarker);
 let replayFeedbackTime=-Infinity,liveScore=null,scoreAttempt='',scoreEpoch=0,pendingPlacement=null;
 // A canceled request still owns its reply slot until the server responds.
 function cancelPendingPlacement(){if(pendingPlacement)pendingPlacement.cancelled=true;}
 const targetMarkers=waypointTargets(scene);
 const waypointHud=document.createElement('div');waypointHud.id='waypoint-progress';waypointHud.hidden=true;waypointHud.setAttribute('aria-label','Waypoint progress and earned score');document.body.append(waypointHud);
 const markers=new THREE.Group();scene.add(markers);
 function drawDisks(challenge){
  while(markers.children.length){const o=markers.children[0];markers.remove(o);o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}
  targetMarkers.draw(challenge?.waypoints||[],state.mode==='editor'?state.selectedWaypoint:null);
  if(!challenge)return;
  const arcade=['combo-v7'].includes(challenge.scoring);
  const range=challenge.start&&challenge.goal?THREE.MathUtils.clamp(v(challenge.start.center).distanceTo(v(challenge.goal.center))*.35,3,12):3;
  for(const [key,color]of [['start',0x39d9ed],['goal',0xffd260]]){
   const d=challenge[key];if(!d)continue;
   const mesh=(geometry,opacity,tint=color,height=.016)=>{
    const o=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:tint,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false}));
    o.rotation.x=-Math.PI/2;o.position.copy(v(d.center));o.position.y+=height;o.userData={key,opacity,tint};markers.add(o);return o;
   };
   mesh(new THREE.RingGeometry(Math.max(.01,d.radius-.045),d.radius+.045,96),.95);
   mesh(new THREE.CircleGeometry(d.radius,80),.16);
   if(key==='goal'&&arcade){
    for(let band=1;band<=4;band++){
     const inner=d.radius+range*(band-1)/4,outer=d.radius+range*band/4;
     mesh(new THREE.RingGeometry(inner,outer,96),band%2?.075:.035,band%2?0x69dbea:0xffcf67,.012);
     mesh(new THREE.RingGeometry(outer-.022,outer+.022,96),.48,0xa7e3dd,.014);
     if(band<4){
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#17233cec';ctx.fillRect(0,0,256,96);ctx.fillStyle='#b9fbef';ctx.font='bold 52px monospace';ctx.textAlign='center';ctx.fillText(`${100-band*25}%`,128,67);
      const label=mesh(new THREE.PlaneGeometry(.68,.255),.9,0xffffff,.025);label.material.map=new THREE.CanvasTexture(canvas);label.position.z+=outer-.22;label.userData.label=true;
     }
    }
    const pulse=mesh(new THREE.RingGeometry(d.radius-.025,d.radius+.035,96),0,0x65ff9e,.027);pulse.userData.pulse=true;
   }
  }
 }
 function presentation(){
  document.body.classList.toggle('is-results',!$('result-card').hidden);document.body.classList.toggle('is-replay',state.mode==='replay'||sharedReplay);
  if($('result-card').hidden)ranking.clear();
  $('course-view').hidden=sharedReplay||state.mode!=='play';$('editor-view').hidden=state.mode!=='editor';$('replay-view').hidden=!sharedReplay&&state.mode!=='replay';
  if(state.mode!=='play'){$('throw-panel').hidden=true;$('flight-panel').hidden=true;$('result-card').hidden=true;}
 }
 function updateSession(){
  const session=state.session;if(!session)return;if(session.busy)$('result-card').hidden=true;
  $('turn-status').textContent=session.restoring?'Restoring your attempt…':session.busy?'Your shot is in flight':session.challenge?'SOLO SHOTS · SHARED HIGH SCORES':'Explore the station freely';
  const changed=state.selected?.id!==session.challenge?.id||state.selected?.revision!==session.challenge?.revision;
  state.selected=session.challenge;
  if(changed){state.chapter=state.selected?.campaign?String(state.selected.campaign.chapter):state.selected?'community':state.chapter;feedback.reset();liveScore=null;scoreAttempt='';scoreEpoch++;state.board=[];renderBoard();$('result-card').hidden=true;}
  $('course-title').textContent=state.selected?.name||'PICK YOUR LINE.';$('challenge-detail').hidden=!state.selected;
  if(state.selected){const c=state.selected;$('challenge-description').textContent=c.scoring==='waypoint-v3'?`${c.waypoints?.length||0} optional waypoints · ${c.goal?'optional destination bonus':'no destination required'} · keep waypoint points on a destination miss`:`Start within ${c.start.radius.toFixed(2)} m · settle inside ${c.goal.radius.toFixed(2)} m${c.requiredSurface?' · required route contact':''}`;if(c.campaign)$('challenge-description').textContent=c.campaign.brief+' '+$('challenge-description').textContent;state.hint=state.selected.hint||null;$('use-hint').hidden=!state.hint;$('hint-note').textContent=state.hint?.note||'';$('edit-challenge').hidden=state.selected.creator!==getGuestId();}
  if(state.mode==='play')drawDisks(state.selected);
  $('timing-hint').hidden=!state.selected?.hint?.period;
  $('score-guide').hidden=false;
  if(state.selected?.scoring==='waypoint-v3')$('score-guide').innerHTML='<summary>HOW TO SCORE</summary><p>Collect any waypoint once: 10,000, then 20,000, then 40,000… Each distinct bank multiplies the chain by 1.75; movement adds a flat 100 points per second after multipliers. The next award doubles after every new waypoint.</p><p>The gold destination is an optional landing bonus. Missing it keeps all waypoint points. Hit a target to bank the movement bonus. Score locks at full rest; recall forfeits.</p>';
  else $('score-guide').innerHTML=classicScoreGuide;
  $('show-overview').disabled=session.busy||session.restoring;
  renderCatalog();
 }
 $('campaign-chapter').onchange=()=>{state.chapter=$('campaign-chapter').value;renderCatalog();};
 function renderCatalog(){
  const list=$('course-list');list.replaceChildren();
  const ordered=[...state.challenges].sort((a,b)=>(a.order??999)-(b.order??999));
  const chapters=new Map(ordered.filter(c=>c.campaign).map(c=>[String(c.campaign.chapter),c.campaign.chapterTitle]));
  const campaignCount=ordered.filter(c=>c.campaign).length;
  if(ordered.some(c=>!c.campaign))chapters.set('community','Player-created courses');
  $('campaign-picker').hidden=!campaignCount;
  $('campaign-count').textContent=`${campaignCount} STAGES · ${[...chapters.keys()].filter(k=>k!=='community').length} CHAPTERS`;
  if(!chapters.has(state.chapter))state.chapter=chapters.keys().next().value;
  const picker=$('campaign-chapter');picker.replaceChildren();
  for(const [key,title]of chapters){const option=document.createElement('option');option.value=key;option.textContent=key==='community'?title:`${key.padStart(2,'0')} / ${title}`;picker.append(option);}
  picker.value=state.chapter;
  for(const c of ordered){
   if(campaignCount&&(c.campaign?String(c.campaign.chapter):'community')!==state.chapter)continue;
   const button=document.createElement('button');button.className='course'+(state.selected?.id===c.id?' selected':'');
   button.dataset.stage=c.campaign?String(c.order+1).padStart(2,'0'):'＋';
   button.setAttribute('aria-label',c.name);button.setAttribute('aria-pressed',String(state.selected?.id===c.id));
   const copy=document.createElement('span'),name=document.createElement('strong');copy.className='course-copy';name.textContent=c.name;copy.append(name);
   if(c.campaign){const meta=document.createElement('small');meta.textContent=`${c.campaign.difficulty} · ${c.campaign.distance} m route`;copy.append(meta);}
   button.append(copy);button.addEventListener('click',()=>{cancel();send('select-challenge',{challengeId:c.id,revision:c.revision});});list.append(button);
  }
  if(!ordered.length){const p=document.createElement('p');p.textContent='Create a course with a start and waypoint chain or destination.';list.append(p);}
 }
 function renderBoard(){
  const board=$('leaderboard');board.replaceChildren();
  if(!state.board.length){const p=document.createElement('p');p.textContent='NO SCORES YET. Put your name on the board.';board.append(p);}
  state.board.slice(0,10).forEach((entry,i)=>{const row=document.createElement('button');row.className='score-row';const name=document.createElement('span'),score=document.createElement('b');name.textContent=`${i+1}. ${entry.name}`;score.textContent=entry.score.toLocaleString();row.append(name,score);row.title=`${entry.surfaces} surfaces · ${entry.duration.toFixed(2)} s · Watch replay`;row.onclick=()=>openReplay(entry.attempt);board.append(row);});
 }
 function openEditor(edit=false){
  const ownWindup=state.session?.busy&&['Charging','Release'].includes(getPhase());
  if(state.session?.busy&&!ownWindup){notice('Finish the active throw before creating a challenge.');return;}
  cancel();const current=edit?state.selected:null;
  state.editId=current?.id||null;state.draft=current?structuredClone({start:current.start,goal:current.goal,waypoints:current.waypoints||[],scoring:current.scoring==='waypoint-v3'?'waypoint-v3':'combo-v7'}):{start:null,goal:null,waypoints:[],scoring:'waypoint-v3'};state.selectedWaypoint=null;cancelPendingPlacement();
  $('challenge-scoring').value=state.draft.scoring;$('has-destination').checked=current?!!current.goal:true;
  state.mode='editor';state.placing=null;$('challenge-name').value=current?.name||'';
  for(const key of ['start','goal']){$(`${key}-radius`).value=state.draft[key]?.radius||.75;radiusChanged(key);}
  send('select-challenge',{challengeId:null});$('placement-status').textContent='Place a start, then optional waypoints and/or one destination.';renderEditor();drawDisks(state.draft);presentation();
 }
 $('show-overview').onclick=()=>{if(state.selected&&!state.session?.busy)overview(state.selected);};
 $('new-challenge').onclick=()=>openEditor();$('edit-challenge').onclick=()=>openEditor(true);
 $('close-editor').onclick=()=>{state.mode='play';state.placing=null;cancelPendingPlacement();drawDisks(state.selected);presentation();};
 $('explore').onclick=()=>{cancel();send('select-challenge',{challengeId:null});};
 for(const key of ['start','goal']){
  $(`place-${key}`).onclick=()=>{state.placing=key;cancelPendingPlacement();$('placement-status').textContent=`Click a fixed floor to place the ${key} circle.`;};
  $(`${key}-radius`).oninput=()=>radiusChanged(key);
 }
 function radiusChanged(key){cancelPendingPlacement();const radius=Number($(`${key}-radius`).value);$(`${key}-radius-label`).textContent=`${radius.toFixed(2)} m`;if(key==='waypoint'){const w=state.draft.waypoints.find(w=>w.id===state.selectedWaypoint);if(w)w.radius=radius;}else if(state.draft[key])state.draft[key].radius=radius;drawDisks(state.draft);}
 function renderEditor(){
  const waypoint=state.draft.scoring==='waypoint-v3';$('waypoint-editor').hidden=!waypoint;$('destination-toggle').hidden=!waypoint;
  if(!waypoint)$('has-destination').checked=true;
  $('destination-controls').hidden=!$('has-destination').checked;
  $('waypoint-editor-count').textContent=`${state.draft.waypoints.length} / 32 waypoints`;$('add-waypoint').disabled=state.draft.waypoints.length>=32;
  const list=$('waypoint-list');list.replaceChildren();
  state.draft.waypoints.forEach((w,i)=>{const row=document.createElement('div');row.className='waypoint-row';const select=document.createElement('button');select.textContent=`${String(i+1).padStart(2,'0')} · ${w.surface} · ${w.radius.toFixed(2)} m`;select.setAttribute('aria-pressed',String(w.id===state.selectedWaypoint));select.onclick=()=>{state.selectedWaypoint=w.id;$('waypoint-radius').value=w.radius;radiusChanged('waypoint');renderEditor();};const remove=document.createElement('button');remove.textContent='Remove';remove.setAttribute('aria-label',`Remove waypoint ${i+1}`);remove.onclick=()=>{state.draft.waypoints=state.draft.waypoints.filter(x=>x.id!==w.id);if(state.selectedWaypoint===w.id)state.selectedWaypoint=null;state.placing=null;cancelPendingPlacement();renderEditor();drawDisks(state.draft);};row.append(select,remove);list.append(row);});
  $('replace-waypoint').disabled=!state.selectedWaypoint;
 }
 $('challenge-scoring').onchange=()=>{state.draft.scoring=$('challenge-scoring').value;if(state.draft.scoring!=='waypoint-v3'){state.draft.waypoints=[];state.selectedWaypoint=null;}state.placing=null;cancelPendingPlacement();renderEditor();drawDisks(state.draft);};
 $('has-destination').onchange=()=>{if(!$('has-destination').checked){state.draft.goal=null;if(state.placing==='goal')state.placing=null;cancelPendingPlacement();}renderEditor();drawDisks(state.draft);};
 $('add-waypoint').onclick=()=>{if(state.draft.waypoints.length>=32)return;state.selectedWaypoint=null;state.placing='waypoint';cancelPendingPlacement();$('placement-status').textContent='Click a fixed face to add a waypoint. Floors, walls and ceilings are supported.';renderEditor();};
 $('replace-waypoint').onclick=()=>{state.placing='waypoint';cancelPendingPlacement();$('placement-status').textContent='Click a fixed face to move the selected waypoint.';};
 $('waypoint-radius').oninput=()=>radiusChanged('waypoint');
 $('save-challenge').onclick=()=>{if(pendingPlacement){$('placement-status').textContent='Wait for placement validation.';return;}if($('has-destination').checked&&!state.draft.goal){$('placement-status').textContent='Place the destination, or turn off its bonus.';return;}if(!state.draft.start||(!state.draft.goal&&!state.draft.waypoints.length)){ $('placement-status').textContent='Place a start and at least one waypoint or destination.';return;}if(state.draft.scoring!=='waypoint-v3'&&!state.draft.goal){$('placement-status').textContent='Classic courses need a destination.';return;}send('save-challenge',{name:$('challenge-name').value,editId:state.editId,...state.draft});};
 $('use-hint').onclick=()=>{if(state.hint)window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:state.hint}));};
 function replayStart(){return -Math.min(3.2,state.replay.releaseTime-state.replay.chargeTime);}
 let replayRequest=0;
 async function openReplay(attempt){
  if(state.session?.busy&&!['Aim','Result'].includes(getPhase())){notice('Finish or recall your shot before watching a replay.');return;}
  const request=++replayRequest;notice('Loading replay…');
  try{const replay=await fetchReplay(attempt);if(request!==replayRequest)return;if(state.session?.busy&&!['Aim','Result'].includes(getPhase()))throw new Error('Finish or recall your shot before watching a replay.');if(getLayout()&&replay.layout!==getLayout())throw new Error('This replay uses a station version that is no longer available.');loadReplay(replay);history.replaceState(null,'',replayURL(attempt));notice('Replay ready · Space to pause · Arrows or right-drag to orbit');}
  catch(error){if(request!==replayRequest)return;notice(error.message,15000);if(sharedReplay){$('replay-status').textContent=error.message;$('replay-title').textContent='REPLAY UNAVAILABLE';$('play-replay-level').textContent='Play Kyoto Bounce →';for(const id of ['replay-play','replay-speed','replay-scrub','replay-recenter','share-replay'])$(id).disabled=true;$('replay-view').hidden=false;$('course-view').hidden=true;}}
 }
 function loadReplay(replay){
  cancel();feedback.reset();scoreEpoch++;liveScore=null;replayFeedbackTime=-Infinity;state.replay=replay;state.mode='replay';state.replayTime=replayStart();state.replayPlaying=true;
  $('replay-title').textContent=replay.challenge.name;$('replay-score').textContent=`${replay.playerName||'Player'} · ${replay.score.toLocaleString()} PTS`;document.title=`${replay.playerName||'Player'} · ${replay.score.toLocaleString()} PTS — Kyoto Bounce`;
  for(const id of ['replay-play','replay-speed','replay-scrub','replay-recenter','share-replay'])$(id).disabled=false;
  $('play-replay-level').textContent='Play this level →';$('play-replay-level').href=`/?level=${encodeURIComponent(replay.challenge.id)}`;ranking.clear();$('replay-view').dataset.attempt=replay.attempt;
  $('replay-scrub').min=String(replayStart());$('replay-scrub').max=String(replay.duration);$('replay-scrub').value=String(state.replayTime);$('replay-play').textContent='Pause';drawDisks(replay.challenge);presentation();resetView();
 }
 if(sharedReplay){$('replay-title').textContent='LOADING REPLAY…';for(const id of ['replay-play','replay-speed','replay-scrub','replay-recenter','share-replay'])$(id).disabled=true;}
 $('close-replay').onclick=()=>{replayRequest++;if(sharedReplay){location.href=$('play-replay-level').href;return;}history.replaceState(null,'','/');document.title='Kyoto Bounce — Station Arcade';feedback.reset();state.mode='play';state.replay=null;state.replayPlaying=false;drawDisks(state.selected);presentation();resetView();};
 $('replay-play').onclick=()=>{if(state.replayTime>=state.replay.duration)state.replayTime=replayStart();state.replayPlaying=!state.replayPlaying;$('replay-play').textContent=state.replayPlaying?'Pause':'Play';};
 $('replay-scrub').oninput=()=>{scoreEpoch++;feedback.reset();state.replayTime=Number($('replay-scrub').value);state.replayPlaying=false;$('replay-play').textContent='Play';};$('replay-recenter').onclick=resetView;
 $('try-result').onclick=()=>{window.dispatchEvent(new Event('kyoto:retry'));};
 $('watch-result').onclick=()=>{if(state.lastResult)openReplay(state.lastResult.attempt);};
 $('share-result').onclick=()=>copyReplay(state.lastResult.attempt,$('share-result'));
 $('share-replay').onclick=()=>{if(state.replay)copyReplay(state.replay.attempt,$('share-replay'));};
 let nextRequested=false;
 function advanceCompleted(){
  const next=state.challenges.find(c=>c.order===(state.selected?.order??-2)+1);
  if(nextRequested)return true;
  if(state.mode!=='play'||getPhase()!=='Result'||!state.lastResult?.success||!next)return false;
  nextRequested=true;send('select-challenge',{challengeId:next.id,revision:next.revision});return true;
 }
 $('next-challenge').onclick=advanceCompleted;
 return {
  state,advanceCompleted,openReplay,
  playbackRate(){return state.mode==='replay'?(state.replayPlaying?Number($('replay-speed').value):0):1;},
  scorePresentation(){return {score:state.mode==='replay'?scoreAt(state.replay?.scoreFrames,state.replayTime):liveScore,attempt:state.mode==='replay'?state.replay?.attempt:scoreAttempt,time:state.mode==='replay'?state.replayTime:getLiveTime(),mode:state.mode,epoch:scoreEpoch};},
  dismissResult(){$('result-card').hidden=true;ranking.clear();feedback.reset();liveScore=null;scoreEpoch++;},
  message(m){
   if(m.type==='selected'||m.type==='error')nextRequested=false;
   if(m.type==='state'&&state.mode!=='replay'){if(m.liveScore){liveScore=m.liveScore;scoreAttempt=m.attempt;feedback.accept(m.liveScore,m.attempt);}if(['Aim','Charging'].includes(m.phase)){feedback.reset();liveScore=null;}}
   if(m.type==='worker-status'&&m.status!=='ready'){feedback.reset();liveScore=null;scoreEpoch++;}
   if(m.type==='session'){state.session=m;updateSession();}
   if(m.type==='catalog'){state.challenges=m.challenges;renderCatalog();}
   if(m.type==='placement'&&pendingPlacement?.slot===m.slot){
    if(pendingPlacement.cancelled||state.mode!=='editor'){pendingPlacement=null;return;}
    if(m.slot==='waypoint'){const existing=state.draft.waypoints.findIndex(w=>w.id===pendingPlacement.id);const waypoint={...m.disk,id:pendingPlacement.id||crypto.randomUUID()};if(existing>=0)state.draft.waypoints[existing]=waypoint;else if(state.draft.waypoints.length<32)state.draft.waypoints.push(waypoint);state.selectedWaypoint=waypoint.id;}
    else state.draft[m.slot]=m.disk;
    state.placing=null;pendingPlacement=null;$('placement-status').textContent=m.slot==='waypoint'?'Waypoint validated on its fixed surface.':`${m.slot==='start'?'Start':'Destination'} validated on a supported floor.`;renderEditor();drawDisks(state.draft);
   }
   if(m.type==='saved-challenge'){state.mode='play';presentation();send('select-challenge',{challengeId:m.challenge.id,revision:m.challenge.revision});notice('Challenge saved. Set the first high score.');}
   if(m.type==='selected'){replayRequest++;$('result-card').hidden=true;resetView('level');if(m.challenge)overview(state.selected||m.challenge);}
   if(m.type==='leaderboard'){if(state.selected?.id===m.challenge.id&&state.selected.revision===m.challenge.revision){state.board=m.entries;renderBoard();}}
   if(m.type==='replay'){loadReplay(m.replay);}
   if(m.type==='result'){
    if(state.mode==='replay')return;
    feedback.result(m);liveScore=m.breakdown||null;scoreAttempt=m.attempt;state.lastResult=m;$('result-card').hidden=state.mode!=='play';
    const b=m.breakdown,waypoint=b?.version==='waypoint-v3',rank=waypoint?(['forfeit','route-missed'].includes(b.outcome)?b.outcome:b.destinationReached?'perfect':m.success?'chain':'miss'):b?.outcome||(m.success?'perfect':'miss');
    $('result-card').dataset.rank=rank;
    $('result-label').textContent=m.success?'CHALLENGE COMPLETE':'SHOT FINISHED';
    $('result-rank').textContent=({chain:'WAYPOINTS BANKED',perfect:'PERFECT LANDING',tagged:'TAGGED IT!',near:'SO CLOSE',miss:'FIND YOUR LINE',forfeit:'SHOT RECALLED','route-missed':'ROUTE MISSED'})[rank];
    $('result-title').textContent=`${m.score.toLocaleString()} PTS`;
    $('result-breakdown').textContent=waypoint?(b.outcome==='forfeit'?'Recalling a live shot forfeits its points.':b.outcome==='route-missed'?'The required route contact was missed; this shot earns no points.':`${b.waypointCount} waypoints collected. ${b.destinationReached?'Destination bonus earned.':'No destination bonus; waypoint points stay yours.'}`):b?b.outcome==='perfect'?'Settled inside the target.':b.outcome==='tagged'?'Entered the target, then bounced out.':b.outcome==='forfeit'?'Recalling a live shot forfeits its points.':b.outcome==='route-missed'?'This stage requires an escalator contact.':`${b.distance.toFixed(2)} m from the target when the ball stopped.`:m.success?`1000 target + ${m.surfaces} surfaces × 100`:m.challenge?'Try another angle.':'Choose a stage to save your score.';
    $('result-math').replaceChildren();
    if(b)for(const [label,value]of waypoint?[['WAYPOINTS · '+b.waypointCount,b.waypointBase],['BANKS · '+b.styleBanks,'×'+b.bankMultiplier.toFixed(2)],['DESTINATION BONUS',b.destinationBonus]]:['combo-v7'].includes(b.version)?[['BASE',b.base],['BANKS · '+b.styleBanks,'×'+b.bankMultiplier.toFixed(2)],['LANDING',Math.round(b.landingMultiplier*100)+'%']]:[['ACCURACY',b.accuracy],['STYLE',b.style]]){
     const row=document.createElement('div'),name=document.createElement('span'),points=document.createElement('b');name.textContent=label;points.textContent=typeof value==='number'?value.toLocaleString():value;row.append(name,points);$('result-math').append(row);
    }
    if(b){const row=document.createElement('div'),name=document.createElement('span'),points=document.createElement('b');name.textContent=`MOVEMENT · ${(b.movingSeconds||0).toFixed(1)} s × 100`;points.textContent=(b.total>0?b.movementPoints||0:0).toLocaleString();row.append(name,points);$('result-math').append(row);}
    $('result-tip').textContent=waypoint?'Every waypoint is optional. Collect in any order. R · TRY AGAIN':b?.outcome==='miss'?`Finish within ${b.proximityRange.toFixed(1)} m to earn proximity points.`:'R · TRY AGAIN     ESC · REPLAY & MENUS';
    $('watch-result').hidden=!m.saved;$('share-result').hidden=!m.saved;ranking.show(m);$('next-challenge').hidden=!m.success||!state.challenges.some(c=>c.order===(state.selected?.order??-2)+1);
    sound.cue('result',rank);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const began=performance.now(),attempt=m.attempt;function count(now){if(state.lastResult?.attempt!==attempt)return;const t=Math.min(1,(now-began)/800);$('result-title').textContent=`${Math.round(m.score*(1-(1-t)**3)).toLocaleString()} PTS`;if(t<1)requestAnimationFrame(count);}requestAnimationFrame(count);}

   }
   if(m.type==='error'){const cancelled=pendingPlacement?.cancelled;pendingPlacement=null;if(state.mode==='editor'&&!cancelled)$('placement-status').textContent=m.message;}
  },
  pointer(event,ray){
   if(state.mode==='replay')return true;
   if(state.mode!=='editor')return false;
   if(state.placing&&!pendingPlacement){pendingPlacement={slot:state.placing,id:state.placing==='waypoint'?state.selectedWaypoint:null};send('place',{slot:state.placing,radius:Number($(`${state.placing}-radius`).value),...ray});}
   else if(pendingPlacement)notice('Waiting for the previous placement to finish. Click again when it responds.');
   else notice('Choose a placement button, then click a supported station surface.');
   return true;
  },
  update(dt,rate=1){
   const score=state.mode==='replay'?scoreAt(state.replay?.scoreFrames,state.replayTime):liveScore;targetMarkers.update(collectedIds(score));
   const course=state.mode==='replay'?state.replay?.challenge:state.selected;waypointHud.hidden=course?.scoring!=='waypoint-v3'||state.mode==='editor';
   if(!waypointHud.hidden)waypointHud.textContent=`${Math.round(score?.total||0).toLocaleString()} PTS · ${score?.waypointCount||0} / ${course.waypoints?.length||0} WAYPOINTS · ${score?.destinationReached?'DESTINATION BONUS':course.goal?'GOLD = OPTIONAL BONUS':'NO DESTINATION NEEDED'}${score?' · NEXT ×'+(score.waypointMultiplier||1).toLocaleString():''}`;
   if(state.mode==='replay'&&state.replay?.scoreFrames){
    if(state.replayTime<replayFeedbackTime)feedback.reset();
    const frames=state.replay.scoreFrames;let lo=0,hi=frames.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].t<=state.replayTime)lo=mid;else hi=mid-1;}
    if(frames[lo]?.t<=state.replayTime)feedback.accept(frames[lo].score,state.replay.attempt+'-replay');
    replayFeedbackTime=state.replayTime;
   }
   feedback.update(dt*rate,state.mode==='replay'?(state.replayTime>=0?'Flight':'Charging'):getPhase(),state.mode,rate);
   const f=feedback.goalFlash,green=new THREE.Color(0x65ff9e);
   for(const o of markers.children){
    const u=o.userData;if(u.key!=='goal'||u.label)continue;
    if(u.pulse){const t=1-f/.65;o.scale.setScalar(matchMedia('(prefers-reduced-motion: reduce)').matches?1:1+t*.5);o.material.opacity=f?f/.65*.9:0;}
    else{o.material.color.setHex(u.tint);if(f)o.material.color.lerp(green,Math.min(1,f*4));o.material.opacity=u.opacity+(f?Math.min(.22,f*.4):0);}
   }
   const h=state.selected?.hint;
   if(h?.period&&state.mode==='play'){
    const at=((getLiveTime()+.14)%h.period+h.period)%h.period,target=h.releasePhase;
    const difference=((at-target+h.period*1.5)%h.period)-h.period*.5;
    $('timing-cursor').style.left=`${at/h.period*100}%`;$('timing-window').style.left=`${target/h.period*100}%`;
    $('timing-caption').textContent=Math.abs(difference)<h.period*.075?'Release now at the suggested power.':'Match the green mark when you release.';
   }
   if(state.mode==='replay'&&state.replayPlaying){state.replayTime=Math.min(state.replay.duration+7,state.replayTime+dt*Number($('replay-speed').value));$('replay-scrub').value=String(Math.min(state.replay.duration,state.replayTime));if(state.replayTime===state.replay.duration+7){state.replayPlaying=false;$('replay-play').textContent='Play';}}
   presentation();
  },
  timeline(){
   if(state.mode!=='replay'||!state.replay)return null;
   const r=state.replay,t=state.replayTime,poses=r.poses;let low=0,high=poses.length-1;
   while(low+1<high){const mid=(low+high)>>1;if(poses[mid].t<=t)low=mid;else high=mid;}
   const a=poses[low],b=poses[high],alpha=THREE.MathUtils.clamp((t-a.t)/(b.t-a.t||1),0,1),phase=t<-.12?'Charging':t<0?'Release':t>=r.duration?'Result':'Flight';
   const player={...r.thrower,power:t<-.12?THREE.MathUtils.clamp((r.releaseTime+t-r.chargeTime)/(r.challenge.allowedInputs?.chargeSeconds||1.2),0,1):r.thrower.power};
   const velocity={x:(b.p.x-a.p.x)/(b.t-a.t||1),y:(b.p.y-a.p.y)/(b.t-a.t||1),z:(b.p.z-a.p.z)/(b.t-a.t||1)};
   const base={attempt:r.attempt,diagnostics:{sleeping:t>=r.duration},owner:player.id,players:[player],phase,releaseTime:r.releaseTime,chargeTime:r.chargeTime,launchPosition:r.launchPosition,velocity:t>=r.duration?{x:0,y:0,z:0}:velocity,spin:t>=r.duration?{x:0,y:0,z:0}:r.spin,challenge:r.challenge,layout:r.layout,physics:r.physics,surfaces:r.surfaces,impacts:r.impacts,flightTime:Math.max(0,t),power:player.power};
   return {before:{...base,stationTime:r.releaseTime+a.t,ball:a.p,rotation:a.q},after:{...base,stationTime:r.releaseTime+b.t,ball:b.p,rotation:b.q},alpha,time:r.releaseTime+t,phase};
  }
 };
}
