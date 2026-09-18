import {startMarker} from './start-marker.js';
import {completedCourse,nextCampaignCourse} from './level-progress.js';
import {copyLevel,levelURL,fetchLevel} from './level-links.js';
import {designGeometry} from './design-geometry.js';
import * as THREE from 'three';
import {resultBoard} from './result-board.js';
import {fetchReplay,copyReplay,replayURL} from './replay-links.js';
import {arcadeFeedback} from './arcade-feedback.js';
import {waypointTargets} from './waypoint-targets.js';
import {scoreAt,collectedIds,allWaypointsCollected} from './waypoint-score.js';
const $=id=>document.getElementById(id),v=p=>new THREE.Vector3(p.x,p.y,-p.z);
export function competitionUI({onModeChange=()=>{},focusTarget=()=>{},resume=()=>{},scene,send,cancel,notice,getGuestId,getLiveTime,getPhase,resetView,overview,sound,sharedReplay=false,getLayout=()=>null}){
 const feedback=arcadeFeedback(sound);
 const host=document.createElement('aside');host.id='competition';host.innerHTML=`
 <div id="course-view"><div class="panel-top"><span class="eyebrow">STAGE SELECT / 選択</span><button id="new-challenge">＋ Create</button></div><h2 id="course-title">PICK YOUR LINE.</h2><div id="turn-status"></div><label class="campaign-picker" id="campaign-picker" hidden><span id="campaign-count"></span><select id="campaign-chapter" aria-label="Campaign chapter"></select></label><div id="course-list"></div><div id="challenge-detail" hidden><p id="challenge-description"></p><button id="show-overview">◎ View course overview</button><button id="use-hint" hidden>Set suggested aim <kbd>H</kbd></button><p id="hint-note"></p><div id="timing-hint" hidden><span class="eyebrow">ESCALATOR RELEASE TIMING</span><div class="timing-track"><i id="timing-window"></i><b id="timing-cursor"></b></div><p id="timing-caption"></p></div><div class="actions"><button id="share-challenge">Copy level link ↗</button><button id="edit-challenge" hidden>Revise</button></div><details id="score-guide"><summary>HOW TO SCORE</summary><p><strong>10,000 base × (1 + 0.5 per distinct bank) × landing accuracy.</strong> Banks add to the multiplier; impact speed does not multiply it.</p><p>Keep 100% inside the gold bullseye. The outer rings show 75%, 50% and 25%, fading to zero at the edge. Height counts too. Tagging the target guarantees 25% even if it rolls out.</p><p>Spaced banks count once per surface; a flight of treads counts as one. Movement adds 100 points per second outside every multiplier. Waiting and spinning in place add nothing. Banks freeze at the first target hit. A far miss still banks its movement points.</p><p>The score locks only when the ball stops moving and spinning. Recall forfeits the shot.</p></details></div></div>
 <div id="editor-view" hidden><div class="panel-top"><span class="eyebrow">DESIGN BALL / REVIEW YOUR ROUTE</span><button id="close-editor" aria-label="Discard design and return to game">✕</button></div><h2 id="design-review-title">YOUR SHOT. YOUR LEVEL.</h2><p id="design-proof" role="status" hidden></p><p id="design-review-status" role="status"></p><div class="actions"><button id="fly-start">View start</button><button id="fly-finish">View finish</button></div><div id="design-targets"><b id="design-target-count"></b><div id="design-target-list"></div></div><label class="field">Level name<input id="challenge-name" maxlength="64" placeholder="The impossible bank"></label><button id="save-challenge" disabled>Save &amp; play level →</button><button id="launch-design-ball">Throw another design ball <kbd>R</kbd></button><p>Fly along the cyan path to inspect the course. Targets come from your actual shot. Throw again to change the route.</p></div>
 <div id="design-shot-view" hidden><span class="eyebrow">DESIGN BALL / RECORD YOUR LINE</span><h2 id="design-shot-title">THROW THE LEVEL.</h2><p id="design-shot-status" role="status">Walk to your launch spot. Hold Space or the mouse to charge, then release. F scouts without moving the robot.</p><p id="design-shot-help">Spaced banks become waypoints. A clear landing becomes an optional finish bonus.</p><button id="design-back">Exit creator <kbd>ESC</kbd></button></div>

 <div id="result-card" hidden><span class="eyebrow" id="result-label"></span><div class="result-rank" id="result-rank"></div><h2 id="result-title"></h2><p id="result-breakdown"></p><div id="result-math"></div><p class="result-tip" id="result-tip"></p><div class="actions"><button id="try-result">Try again <kbd>R</kbd></button><button id="watch-result">Watch replay</button><button id="share-result">Copy replay link ↗</button><button id="next-challenge">Next level <kbd>SPACE / N</kbd> →</button></div></div>`;document.body.append(host);
 const completionAction=document.createElement('div');completionAction.id='result-next';$('result-label').after(completionAction);completionAction.append($('next-challenge'));
 const results=document.createElement('div');results.id='results-screen';document.body.append(results);results.append($('result-card'));
 const levelsButton=document.createElement('button');levelsButton.id='toggle-levels';levelsButton.type='button';levelsButton.innerHTML='LEVELS <kbd>L</kbd>';levelsButton.setAttribute('aria-keyshortcuts','L');levelsButton.setAttribute('aria-controls','competition');levelsButton.setAttribute('aria-expanded','false');document.querySelector('.session').prepend(levelsButton);
 const closeLevels=document.createElement('button');closeLevels.id='close-levels';closeLevels.type='button';closeLevels.textContent='×';closeLevels.setAttribute('aria-label','Close levels');$('course-view').querySelector('.panel-top').append(closeLevels);
 const levelHelp=document.createElement('p');levelHelp.id='level-key-help';levelHelp.innerHTML='<kbd>↑ ↓</kbd> Stages · <kbd>← →</kbd> Chapters<br><kbd>ENTER</kbd> Choose · <kbd>L / ESC</kbd> Back to game';$('course-view').querySelector('.panel-top').after(levelHelp);
 let levelsOpen=false,selectingLevel=false;
 function focusLevel(index){const choices=[...$('course-list').children].filter(b=>b.matches('button'));const button=choices[index]||choices.find(b=>b.classList.contains('selected'))||choices[0];if(button){button.focus({preventScroll:true});button.scrollIntoView({block:'nearest'});}}
 function showLevels(open){
  if(levelsOpen===open)return;
  levelsOpen=open;document.body.classList.toggle('levels-open',open);levelsButton.setAttribute('aria-expanded',String(open));
  if(open){cancel();$('result-card').hidden=true;host.scrollTop=0;focusLevel();}
 }
 levelsButton.onclick=()=>{if(levelsOpen){showLevels(false);resume();}else showLevels(true);};
 closeLevels.onclick=()=>{showLevels(false);resume();};
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement)showLevels(false);});
 for(const id of ['show-overview','use-hint'])$(id).addEventListener('click',()=>showLevels(false));
 const ranking=resultBoard({host:document.body,watch:openReplay,sound,getGuestId,share:copyLevel});
 // A single layout owns replay panels; the game restores these shared widgets on exit.
 const replayView=document.createElement('section');replayView.id='replay-view';replayView.hidden=true;
 replayView.innerHTML=`<div id="replay-stage" aria-label="Replay scene"></div>
 <aside id="replay-sidebar"><div id="replay-summary"><div class="replay-description"><span class="eyebrow">WATCH THE SHOT / リプレイ</span><h2 id="replay-title">LOADING REPLAY…</h2><p id="replay-score"></p></div><a id="play-replay-level" href="/">PLAY KYOTO BOUNCE <span>→</span><small>Take your shot. Beat this score.</small></a><button id="close-replay">← Back to game</button></div><div id="replay-metrics"></div></aside>
 <div id="replay-transport"><div class="replay-timeline"><button id="replay-play" disabled>Pause</button><button id="replay-restart" aria-label="Restart replay" title="Restart replay" disabled>↺</button><input id="replay-scrub" type="range" aria-label="Replay time" step="any" value="0" disabled><output id="replay-time">0:00 / 0:00</output></div><div class="replay-tools"><div class="replay-camera" role="group" aria-label="Replay camera"><button id="replay-recenter" aria-pressed="true" disabled>Follow ball</button><button id="replay-free" aria-pressed="false" disabled>Free camera <kbd>F</kbd></button></div><div id="replay-speed-slot"></div><button id="share-replay" disabled>Copy replay link ↗</button></div><p id="replay-status" role="status">Mouse over scene to orbit · Click to capture · Esc for controls · Scroll to zoom · Hold Space for 2×</p></div>`;
 document.body.append(replayView);$('close-replay').hidden=sharedReplay;
 let replayViewport=null;
 new ResizeObserver(()=>{const r=$('replay-stage').getBoundingClientRect();replayViewport=r.width&&r.height?{x:r.x,y:r.y,width:r.width,height:r.height}:null;}).observe($('replay-stage'));
 const replayControls=['replay-play','replay-restart','replay-scrub','replay-recenter','replay-free','share-replay'];
 function replayTimeLabel(){const duration=state.replay?.duration||0,t=Math.max(0,Math.min(duration,state.replayTime));const clock=t=>{t=Math.round(t*10)/10;return `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;},label=`${clock(t)} / ${clock(duration)}`;if($('replay-time').textContent!==label){$('replay-time').textContent=label;$('replay-scrub').setAttribute('aria-valuetext',`${t.toFixed(1)} of ${duration.toFixed(1)} seconds`);}}
 const classicScoreGuide=$('score-guide').innerHTML;
 const state={chapter:null,mode:'play',session:null,challenges:[],progress:new Map(),selected:null,board:[],personal:null,draft:{start:null,goal:null,waypoints:[],scoring:'waypoint-v3'},selectedWaypoint:null,editId:null,replay:null,replayTime:0,replayPlaying:false,lastResult:null,hint:null};
 const designPath=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x5fffe3,transparent:true,opacity:.8,depthWrite:false}));scene.add(designPath);designPath.visible=false;
 let capturedDesign=null,designRequest=null,designSaving=false,designNotice='';
 function setMode(mode){showLevels(false);state.mode=mode;onModeChange(mode);}
 function clearDesign(){capturedDesign=null;designPath.geometry.dispose();designPath.geometry=new THREE.BufferGeometry();designPath.visible=false;$('design-proof').hidden=true;}
 function proofUnchanged(){return capturedDesign&&capturedDesign.geometry===designGeometry(state.draft);}
 function showProof(){$('design-proof').hidden=!capturedDesign;$('design-proof').textContent='✓ RECORDED ROUTE · Your shot reached every generated target. Its aim and power are saved with the level.';$('design-proof').dataset.verified=String(!!proofUnchanged());}
 const powerMarker=document.createElement('b');powerMarker.id='hint-power-marker';powerMarker.hidden=true;document.querySelector('.power-track').append(powerMarker);
 let replayFeedbackTime=-Infinity,liveScore=null,scoreAttempt='',scoreEpoch=0;
 const targetMarkers=waypointTargets(scene);
 const markers=new THREE.Group();scene.add(markers);
 function drawDisks(challenge){
  while(markers.children.length){const o=markers.children[0];markers.remove(o);o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}
  targetMarkers.draw(challenge?.waypoints||[],state.mode==='editor'?state.selectedWaypoint:null);
  if(!challenge)return;
  const arcade=['combo-v7'].includes(challenge.scoring);
  const range=challenge.start&&challenge.goal?THREE.MathUtils.clamp(v(challenge.start.center).distanceTo(v(challenge.goal.center))*.35,3,12):3;
  for(const [key,color]of [['start',0x39d9ed],['goal',0xffd260]]){
   const d=challenge[key];if(!d)continue;
   if(key==='start'){markers.add(startMarker(d,challenge.hint?.yaw||0));continue;}
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
  const replaying=state.mode==='replay'||sharedReplay;
  const throwing=['Release','Flight'].includes(getPhase());
  if(throwing||replaying||document.body.classList.contains('is-briefing')||document.body.classList.contains('mobile-ui'))showLevels(false);
  levelsButton.hidden=replaying||state.mode!=='play';levelsButton.disabled=throwing||!!state.session?.restoring;
  levelsButton.title=throwing?'Finish your shot, or press R to recall it':'L · Choose a level or robot';
  document.body.classList.toggle('is-results',!replaying&&!$('result-card').hidden);document.body.classList.toggle('is-replay',replaying);
  host.hidden=replaying;
  if(host.dataset.mode!==state.mode)host.dataset.mode=state.mode;
  for(const [id,destination] of [['combo-hud','replay-metrics'],['result-leaderboard','replay-metrics'],['shot-speed','replay-speed-slot'],['combo-spectacle','replay-stage']]){const element=$(id),parent=replaying?$(destination):document.body;if(element.parentElement!==parent)parent.append(element);}
  $('result-leaderboard').hidden=state.mode==='replay'?!state.replay:state.mode!=='play'||!state.selected;
  $('course-view').hidden=sharedReplay||state.mode!=='play';$('editor-view').hidden=state.mode!=='editor';$('replay-view').hidden=!sharedReplay&&state.mode!=='replay';
  designPath.visible=state.mode==='editor'&&!!capturedDesign;$('design-shot-view').hidden=state.mode!=='design';document.body.classList.toggle('is-designer',state.mode==='editor');
  document.body.classList.toggle('is-design-shot',state.mode==='design');
  if(state.mode==='design'){const phase=getPhase(),inFlight=['Release','Flight'].includes(phase);$('design-shot-title').textContent=designRequest?'GETTING READY…':inFlight?'RECORDING YOUR SHOT.':'THROW THE LEVEL.';$('design-shot-status').textContent=designNotice||(inFlight?'The route is recording. Wait for the ball to settle, or hold Space for 2× playback.':'Walk to your launch spot. Hold Space or the mouse to charge, then release. F scouts the station.');$('design-shot-help').textContent=inFlight?'R · Discard this shot and try again':'Spaced banks become waypoints. A clear landing becomes an optional finish bonus.';}
  if(!['play','design'].includes(state.mode)){$('throw-panel').hidden=true;$('flight-panel').hidden=true;$('result-card').hidden=true;}
 }
 function updateSession(){
  const session=state.session;if(!session)return;if(session.busy)$('result-card').hidden=true;
  $('turn-status').textContent=session.restoring?'Restoring your attempt…':session.busy?'Your shot is in flight':session.challenge?'READY TO THROW · SHARED SCORES':'Choose a level to start';
  const changed=state.selected?.id!==session.challenge?.id||state.selected?.revision!==session.challenge?.revision;
  state.selected=session.challenge;
  if(changed){state.lastResult=null;showLevels(false);state.chapter=state.selected?.campaign?String(state.selected.campaign.chapter):state.selected?'community':state.chapter;feedback.reset();liveScore=null;scoreAttempt='';scoreEpoch++;state.board=[];state.personal=null;renderBoard();$('result-card').hidden=true;}
  $('course-title').textContent=state.selected?.name||'PICK YOUR LINE.';$('challenge-detail').hidden=!state.selected;
  if(state.selected){const c=state.selected;$('challenge-description').textContent=c.scoring==='waypoint-v3'?`Throw from anywhere · ${c.waypoints?.length||0} waypoints · ${c.goal?(c.waypoints?.length?'optional destination bonus':'destination required'):'no destination required'} · all shots can rank · collect every waypoint to clear`:`Throw from anywhere · settle inside ${c.goal.radius.toFixed(2)} m${c.requiredSurface?' · required route contact':''}`;if(c.campaign)$('challenge-description').textContent=c.campaign.brief+' '+$('challenge-description').textContent;state.hint=state.selected.hint||null;$('use-hint').hidden=!state.hint;$('hint-note').textContent=state.hint?.note||'';$('edit-challenge').hidden=state.selected.creator!==getGuestId();}
  if(state.mode==='play')drawDisks(state.selected);
  $('timing-hint').hidden=!state.selected?.hint?.period;
  $('score-guide').hidden=false;
  if(state.selected?.scoring==='waypoint-v3')$('score-guide').innerHTML='<summary>HOW TO SCORE</summary><p>10,000 base × (waypoint multiplier + bank bonus). Each unique waypoint doubles the waypoint multiplier: ×2, ×4, ×8… Each distinct bank adds +0.5× separately. Waypoints never double the bank bonus. Movement adds a flat 100 points per second after multipliers.</p><p>The gold destination is an optional landing bonus equal to your target score (10,000 × combo if no waypoints). Every shot that settles inside the station enters the leaderboard, even with zero targets (×1 base). Collect every waypoint to clear the course; destination-only courses need a landing to clear. Score locks at full rest; recall and leaving the station forfeit.</p>';
  else $('score-guide').innerHTML=classicScoreGuide;
  $('show-overview').disabled=session.busy||session.restoring;
  renderCatalog();
 }
 $('campaign-chapter').onchange=()=>{state.chapter=$('campaign-chapter').value;renderCatalog();};
 function chooseLevel(c){
  if(selectingLevel||state.session?.restoring||['Release','Flight'].includes(getPhase()))return;
  cancel();selectingLevel=true;renderCatalog();
  if(!send('select-challenge',{challengeId:c.id,revision:c.revision})){selectingLevel=false;renderCatalog();notice('Reconnect before changing levels.');}
 }
 function navigateLevels(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const choices=[...$('course-list').querySelectorAll('button')];if(!choices.length)return;
  const index=Math.max(0,choices.indexOf(document.activeElement));
  if(['ArrowLeft','ArrowRight','PageUp','PageDown'].includes(e.code)){
   e.preventDefault();const picker=$('campaign-chapter'),at=picker.selectedIndex+(['ArrowLeft','PageUp'].includes(e.code)?-1:1);
   if(at>=0&&at<picker.options.length){state.chapter=picker.options[at].value;renderCatalog();focusLevel(0);}return;
  }
  if(['ArrowUp','ArrowDown','Home','End'].includes(e.code)){
   e.preventDefault();focusLevel(e.code==='Home'?0:e.code==='End'?choices.length-1:Math.max(0,Math.min(choices.length-1,index+(e.code==='ArrowDown'?1:-1))));return;
  }
  if(['Enter','Space'].includes(e.code)&&document.activeElement?.matches('.course')){e.preventDefault();if(!e.repeat)document.activeElement.click();}
 }
 function renderCatalog(){
  const list=$('course-list'),focusedId=list.contains(document.activeElement)?document.activeElement.dataset.challenge:null;list.replaceChildren();
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
   button.dataset.challenge=c.id;
   button.disabled=selectingLevel||!!state.session?.restoring||['Release','Flight'].includes(getPhase());
   button.setAttribute('aria-pressed',String(state.selected?.id===c.id));
   const copy=document.createElement('span'),name=document.createElement('strong');copy.className='course-copy';name.textContent=c.name;copy.append(name);
   if(c.campaign){const meta=document.createElement('small');meta.textContent=`${c.campaign.difficulty} · ${c.campaign.distance} m route`;copy.append(meta);}
   const saved=state.progress.get(c.id),progress=saved?.revision===c.revision?saved:null;
   const status=document.createElement('span'),completion=document.createElement('span'),rank=document.createElement('span');
   status.className='course-status';completion.className='course-completion';rank.className='course-rank';
   completion.dataset.completed=String(!!progress?.completed);rank.dataset.first=String(progress?.rank===1);
   completion.textContent=progress?(progress.completed?'✓ COMPLETED':'○ NOT COMPLETED'):'CHECKING…';
   rank.textContent=progress?(progress.rank?`${progress.rank===1?'★ ':''}RANK #${progress.rank.toLocaleString()}`:'NO SCORE'):'RANK —';
   status.append(completion,rank);copy.append(status);
   button.setAttribute('aria-label',`${c.name}. ${progress?(progress.completed?'Completed':'Not completed'):'Checking completion'}. ${progress?.rank?`Your rank: ${progress.rank}`:progress?'No score yet':'Checking rank'}.`);
   if(progress?.bestScore)button.title=`Your best: ${progress.bestScore.toLocaleString()} points`;
   button.append(copy);button.addEventListener('click',()=>chooseLevel(c));list.append(button);
  }
  if(!ordered.length){const p=document.createElement('p');p.textContent='Create a course with a start and waypoint chain or destination.';list.append(p);}
  if(focusedId){const i=[...list.children].findIndex(b=>b.dataset.challenge===focusedId);if(i>=0)focusLevel(i);}
 }
 function renderBoard(){if(state.mode==='play')ranking.update(state.selected,state.board,state.personal);}
 $('share-challenge').onclick=()=>{if(state.selected)copyLevel(state.selected.id,$('share-challenge'));};
 function startDesign(start=null){
  if(designRequest||designSaving)return;
  if(state.session?.busy&&state.mode!=='design'){notice('Finish or recall the active shot first.');return;}
  cancel();designRequest='start';designNotice='';renderEditor();
  if(!send('design-start',{start})){designRequest=null;renderEditor();notice('Reconnect before starting a design ball.');}
 }
 function openEditor(edit=false){
  if(designRequest||state.session?.busy){notice('Finish or recall the active shot first.');return;}
  const current=edit?state.selected:null;clearDesign();state.editId=current?.id||null;
  state.draft={start:current?.start||null,goal:null,waypoints:[],scoring:'waypoint-v3'};state.selectedWaypoint=null;
  $('challenge-name').value=current?.name||'';startDesign(state.draft.start);
 }
 function exitDesign(){
  if(designRequest||designSaving)return;
  cancel();designRequest='cancel';renderEditor();
  if(!send('design-cancel')){designRequest=null;renderEditor();notice('Reconnect before leaving the creator.');}
 }
 $('show-overview').onclick=()=>{if(state.selected&&!state.session?.busy)overview(state.selected);};
 $('new-challenge').onclick=()=>openEditor();$('edit-challenge').onclick=()=>openEditor(true);
 $('close-editor').onclick=exitDesign;$('design-back').onclick=exitDesign;
 function renderEditor(){
  showProof();$('fly-start').disabled=!capturedDesign;$('fly-finish').disabled=!capturedDesign||!state.draft.goal;
  $('design-targets').hidden=!capturedDesign;
  $('design-target-count').textContent=`${state.draft.waypoints.length} waypoint${state.draft.waypoints.length===1?'':'s'}${state.draft.goal?' · optional finish bonus':''}`;
  const list=$('design-target-list');list.replaceChildren();
  state.draft.waypoints.forEach((w,i)=>{const button=document.createElement('button');button.textContent=`${String(i+1).padStart(2,'0')} · ${w.normal.y>.5?'Floor':w.normal.y<-.5?'Ceiling':'Wall'} waypoint`;button.setAttribute('aria-pressed',String(w.id===state.selectedWaypoint));button.onclick=()=>{state.selectedWaypoint=w.id;focusTarget(w);renderEditor();drawDisks(state.draft);};list.append(button);});
  $('save-challenge').disabled=!proofUnchanged()||!$('challenge-name').value.trim()||!!designRequest||designSaving;
  $('save-challenge').textContent=designSaving?'Saving…':'Save & play level →';
  for(const id of ['launch-design-ball','close-editor','design-back','new-challenge','edit-challenge'])$(id).disabled=!!designRequest||designSaving;
 }
 $('challenge-name').oninput=renderEditor;
 $('save-challenge').onclick=()=>{if(!proofUnchanged()||designSaving||designRequest)return;designSaving=true;renderEditor();if(!send('save-challenge',{name:$('challenge-name').value,editId:state.editId,...state.draft,designProof:capturedDesign.proof})){designSaving=false;renderEditor();$('design-review-status').textContent='Reconnect before saving your level.';}};
 $('fly-start').onclick=()=>{if(state.draft.start)focusTarget(state.draft.start);};
 $('fly-finish').onclick=()=>{if(state.draft.goal)focusTarget(state.draft.goal);};
 $('launch-design-ball').onclick=()=>startDesign(state.draft.start);
 $('use-hint').onclick=()=>{if(state.hint)window.dispatchEvent(new CustomEvent('kyoto:hint',{detail:state.hint}));};
 function replayStart(){return -Math.min(3.2,state.replay.releaseTime-state.replay.chargeTime);}
 let replayRequest=0;
 async function openReplay(attempt){
  if(state.session?.busy&&!['Aim','Result'].includes(getPhase())){notice('Finish or recall your shot before watching a replay.');return;}
  const request=++replayRequest;notice('Loading replay…');
  try{const replay=await fetchReplay(attempt);if(request!==replayRequest)return;if(state.session?.busy&&!['Aim','Result'].includes(getPhase()))throw new Error('Finish or recall your shot before watching a replay.');if(getLayout()&&replay.layout!==getLayout())throw new Error('This replay uses a station version that is no longer available.');loadReplay(replay);history.replaceState(null,'',replayURL(attempt));notice('Replay ready · Following the ball');}
  catch(error){if(request!==replayRequest)return;notice(error.message,15000);if(sharedReplay){$('replay-status').textContent=error.message;$('replay-title').textContent='REPLAY UNAVAILABLE';for(const id of replayControls)$(id).disabled=true;$('replay-view').hidden=false;$('course-view').hidden=true;}}
 }
 function loadReplay(replay){
  cancel();feedback.reset();scoreEpoch++;liveScore=null;replayFeedbackTime=-Infinity;state.replay=replay;setMode('replay');state.replayTime=replayStart();state.replayPlaying=true;
  $('replay-title').textContent=replay.challenge.name;$('replay-score').textContent=`${replay.playerName||'Player'} · ${replay.score.toLocaleString()} PTS FINAL`;document.title=`${replay.playerName||'Player'} · ${replay.score.toLocaleString()} PTS — Kyoto Bounce`;
  for(const id of replayControls)$(id).disabled=false;
  $('play-replay-level').href=levelURL(replay.challenge.id);ranking.clear();$('replay-view').dataset.attempt=replay.attempt;
  $('replay-scrub').min=String(replayStart());$('replay-scrub').max=String(replay.duration);$('replay-scrub').value=String(state.replayTime);$('replay-play').textContent='Pause';drawDisks(replay.challenge);ranking.update(replay.challenge,replay.standings?.after||[]);fetchLevel(replay.challenge.id).then(board=>{if(state.replay===replay&&state.mode==='replay')ranking.update(board.challenge,board.entries);}).catch(()=>{});presentation();resetView();
 }
 if(sharedReplay)presentation();
 $('close-replay').onclick=()=>{replayRequest++;if(sharedReplay){location.href=$('play-replay-level').href;return;}history.replaceState(null,'',state.selected?levelURL(state.selected.id):'/');document.title=state.selected?`${state.selected.name} — Kyoto Bounce`:'Kyoto Bounce — Station Arcade';feedback.reset();setMode('play');state.replay=null;state.replayPlaying=false;renderBoard();drawDisks(state.selected);presentation();resetView('level');if(completed()){$('result-card').hidden=false;updateCompletionAction();}};
 function restartReplay(){cancel();scoreEpoch++;feedback.reset();state.replayTime=replayStart();state.replayPlaying=true;$('replay-play').textContent='Pause';resetView('replay');}
 $('replay-restart').onclick=restartReplay;
 $('replay-play').onclick=()=>{cancel();if(!state.replayPlaying&&state.replayTime>=state.replay.duration){restartReplay();return;}state.replayPlaying=!state.replayPlaying;$('replay-play').textContent=state.replayPlaying?'Pause':'Play';};
 $('replay-scrub').oninput=()=>{cancel();scoreEpoch++;feedback.reset();state.replayTime=Number($('replay-scrub').value);state.replayPlaying=false;$('replay-play').textContent='Play';resetView('seek');};$('replay-recenter').onclick=()=>resetView('replay');

 $('try-result').onclick=()=>{window.dispatchEvent(new Event('kyoto:retry'));};
 $('watch-result').onclick=()=>{if(state.lastResult)openReplay(state.lastResult.attempt);};
 $('share-result').onclick=()=>copyReplay(state.lastResult.attempt,$('share-result'));
 $('share-replay').onclick=()=>{if(state.replay)copyReplay(state.replay.attempt,$('share-replay'));};
 let nextRequested=false;
 function completed(){return completedCourse(state.mode,state.lastResult,state.selected);}
 function updateCompletionAction(){
  const button=$('next-challenge');button.hidden=!completed();
  const next=nextCampaignCourse(state.challenges,state.selected);
  button.innerHTML=next?'Next level <kbd>SPACE / N</kbd> →':state.selected?.campaign?'Campaign complete · Choose a level <kbd>SPACE / N</kbd>':'Level complete · Choose a level <kbd>SPACE / N</kbd>';
 }
 function advanceCompleted(){
  if(nextRequested)return true;
  if(!completed())return false;
  const next=nextCampaignCourse(state.challenges,state.selected);
  if(!next){showLevels(true);return true;}
  nextRequested=true;
  if(!send('select-challenge',{challengeId:next.id,revision:next.revision})){nextRequested=false;notice('Reconnect to continue to the next level.');}
  return true;
 }
 $('next-challenge').onclick=advanceCompleted;
 return {
  openLevels:()=>showLevels(true),closeLevels:()=>showLevels(false),get levelsOpen(){return levelsOpen;},focusLevel,navigateLevels,
  state,advanceCompleted,get completed(){return completed();},openReplay,exitDesign,retryDesign:()=>startDesign(state.draft.start),replayViewport:()=>replayViewport,
  playbackRate(fastForward=false){return state.mode==='replay'?(state.replayPlaying?(fastForward?2:1):0):1;},
  scorePresentation(){return {score:state.mode==='replay'?scoreAt(state.replay?.scoreFrames,state.replayTime):liveScore,challenge:state.mode==='replay'?state.replay?.challenge:state.selected,attempt:state.mode==='replay'?state.replay?.attempt:scoreAttempt,time:state.mode==='replay'?state.replayTime:getLiveTime(),mode:state.mode,epoch:scoreEpoch};},
  dismissResult(){state.lastResult=null;$('result-card').hidden=true;ranking.reset();feedback.reset();liveScore=null;scoreEpoch++;},
  message(m){
   if(m.type==='selected'||m.type==='error'){nextRequested=false;selectingLevel=false;renderCatalog();}
   if(m.type==='state'&&state.mode!=='replay'){if(m.liveScore){liveScore=m.liveScore;scoreAttempt=m.attempt;feedback.accept(m.liveScore,m.attempt,state.selected);}if(['Aim','Charging'].includes(m.phase)){feedback.reset();liveScore=null;}}
   if(m.type==='worker-status'&&m.status!=='ready'){feedback.reset();liveScore=null;scoreEpoch++;if(['design','editor'].includes(state.mode)){designRequest=null;designSaving=false;clearDesign();setMode('editor');$('design-review-status').textContent='Recording interrupted. Throw another design ball after reconnecting.';renderEditor();}}
   if(m.type==='welcome'&&!m.resumed&&['design','editor'].includes(state.mode)){designRequest=null;designSaving=false;clearDesign();setMode('editor');$('design-review-status').textContent='The recording session ended. Throw a new design ball before saving.';renderEditor();}
   if(m.type==='session'){state.session=m;if(m.designing&&state.mode==='play')setMode('design');updateSession();}
   if(m.type==='catalog'){state.challenges=m.challenges;renderCatalog();if(!sharedReplay)send('course-progress');}
   if(m.type==='course-progress'){
    if(m.full)state.progress.clear();
    for(const entry of m.entries)state.progress.set(entry.challengeId,entry);
    renderCatalog();
   }
   if(m.type==='design-ready'){
    designRequest=null;clearDesign();state.draft={start:state.draft.start,goal:null,waypoints:[],scoring:'waypoint-v3'};state.selectedWaypoint=null;setMode('design');drawDisks(null);renderEditor();presentation();notice('Design ball ready · Walk, aim and throw.');
   }
   if(m.type==='design-cancelled'){
    designRequest=null;clearDesign();setMode('play');resetView('level');drawDisks(state.selected);renderEditor();presentation();resume();
   }
   if(m.type==='saved-challenge'){designSaving=false;clearDesign();renderEditor();setMode('play');presentation();send('select-challenge',{challengeId:m.challenge.id,revision:m.challenge.revision});notice('Level saved. Copy its level link to share it.');}
   if(m.type==='selected'){history.replaceState(null,'',m.challenge?levelURL(m.challenge.id):'/');document.title=m.challenge?`${m.challenge.name} — Kyoto Bounce`:'Kyoto Bounce — Station Arcade';replayRequest++;$('result-card').hidden=true;resetView('level');if(m.challenge&&state.mode==='play')overview(state.selected||m.challenge);}
   if(m.type==='leaderboard'){if(state.selected?.id===m.challenge.id&&state.selected.revision===m.challenge.revision){state.board=m.entries;state.personal=m.personal||null;renderBoard();}}
   if(m.type==='replay'){loadReplay(m.replay);}
   if(m.type==='result'){
    if(state.mode==='design'||m.design){
     setMode('editor');cancel();$('result-card').hidden=true;
     if(m.design&&!m.design.error){
      const d=m.design;state.draft={start:d.start,goal:d.goal,waypoints:d.waypoints||[],scoring:'waypoint-v3'};state.selectedWaypoint=null;
      capturedDesign={proof:d.proof,geometry:designGeometry(state.draft)};designPath.geometry.dispose();designPath.geometry=new THREE.BufferGeometry().setFromPoints(d.path.map(v));
      $('design-review-status').textContent=`Recorded ${state.draft.waypoints.length} spaced waypoint${state.draft.waypoints.length===1?'':'s'}${d.goal?' and a finish zone':''}. ${d.note||'Explore the cyan path, name your level, then save and play.'}`;
      focusTarget(state.draft.start);sound.cue('start');
     }else {clearDesign();$('design-review-status').textContent=m.design?.error||'This shot could not produce a valid course. Try another design ball.';}
     renderEditor();drawDisks(state.draft);presentation();return;
    }
    if(state.mode==='replay')return;
    feedback.result(m);liveScore=m.breakdown||null;scoreAttempt=m.attempt;state.lastResult=m;$('result-card').hidden=state.mode!=='play';
    const b=m.breakdown,waypoint=b?.version==='waypoint-v3',rank=waypoint?(['forfeit','route-missed','incomplete'].includes(b.outcome)?b.outcome:b.destinationReached?'perfect':b.waypointCount?'chain':'miss'):b?.outcome||(m.success?'perfect':'miss');
    const allClear=allWaypointsCollected(b,m.challenge);$('result-card').dataset.clear=String(allClear);
    $('result-card').dataset.rank=rank;
    $('result-label').textContent=allClear?'100% WAYPOINT CLEAR':m.success?'CHALLENGE COMPLETE':'SHOT FINISHED';
    $('result-rank').textContent=allClear?'ALL WAYPOINTS!':({chain:'WAYPOINTS BANKED',perfect:'PERFECT LANDING',tagged:'TAGGED IT!',near:'SO CLOSE',miss:m.score>0?'SCORE BANKED':'FIND YOUR LINE',incomplete:m.challenge?.waypoints?.length?'WAYPOINTS MISSED':'DESTINATION MISSED',forfeit:'SHOT RECALLED','route-missed':'ROUTE MISSED'})[rank];
    $('result-title').textContent=`${m.score.toLocaleString()} PTS`;
    $('result-breakdown').textContent=waypoint?(b.outcome==='forfeit'?'Recalled or out-of-bounds shots forfeit their points.':`${b.waypointCount} / ${m.challenge?.waypoints?.length||0} waypoints collected. ${b.destinationReached?'Destination bonus earned.':'Score banked at full rest.'} ${m.success?'Course cleared.':'Your shot counts on the leaderboard.'}`):b?b.outcome==='perfect'?'Settled inside the target.':b.outcome==='tagged'?'Entered the target, then bounced out.':b.outcome==='forfeit'?'Recalled or out-of-bounds shots forfeit their points.':`${b.distance.toFixed(2)} m from the target. Movement points banked.`:'Choose a stage to save your score.';
    $('result-math').replaceChildren();
    if(b)for(const [label,value]of waypoint?[['WAYPOINTS · '+b.waypointCount,'×'+b.waypointMultiplier.toLocaleString()],['BANKS · '+b.styleBanks,'+'+b.bankBonus.toFixed(2)+'×'],['COMBINED MULTIPLIER','×'+b.comboMultiplier.toLocaleString()],['DESTINATION BONUS',b.destinationBonus]]:['combo-v7'].includes(b.version)?[['BASE',b.base],['BANK BONUS · '+b.styleBanks,'+'+b.bankBonus.toFixed(2)+'×'],['LANDING',Math.round(b.landingMultiplier*100)+'%']]:[['ACCURACY',b.accuracy],['STYLE',b.style]]){
     const row=document.createElement('div'),name=document.createElement('span'),points=document.createElement('b');name.textContent=label;points.textContent=typeof value==='number'?value.toLocaleString():value;row.append(name,points);$('result-math').append(row);
    }
    if(b){const row=document.createElement('div'),name=document.createElement('span'),points=document.createElement('b');name.textContent=`MOVEMENT · ${(b.movingSeconds||0).toFixed(1)} s × 100`;points.textContent=(b.total>0?b.movementPoints||0:0).toLocaleString();row.append(name,points);$('result-math').append(row);}
    $('result-tip').textContent=waypoint?(m.challenge?.waypoints?.length?'Collect EVERY waypoint to clear. All in-bounds shots rank. R · TRY AGAIN':'Land in the destination to clear. All in-bounds shots rank. R · TRY AGAIN'):b?.outcome==='miss'?`Finish within ${b.proximityRange.toFixed(1)} m to earn proximity points.`:'R · TRY AGAIN     ESC · REPLAY & MENUS';
    $('watch-result').hidden=!m.saved;$('share-result').hidden=!m.saved;ranking.show(m);updateCompletionAction();
    if(!feedback.clearing)sound.cue('result',rank);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const began=performance.now(),attempt=m.attempt;function count(now){if(state.lastResult?.attempt!==attempt)return;const t=Math.min(1,(now-began)/800);$('result-title').textContent=`${Math.round(m.score*(1-(1-t)**3)).toLocaleString()} PTS`;if(t<1)requestAnimationFrame(count);}requestAnimationFrame(count);}

   }
   if(m.type==='notice'&&state.mode==='design'&&!designRequest)designNotice=m.message+' Aim and throw again, or press R to restart.';
   if(m.type==='state'&&m.phase==='Charging')designNotice='';
   if(m.type==='error'){
    const pending=designRequest;designRequest=null;designSaving=false;renderEditor();
    if(state.mode==='editor')$('design-review-status').textContent=m.message;
    else if(state.mode==='design')designNotice=m.message;
    if(pending)notice(m.message);
   }
  },
  update(dt,rate=1){
   const score=state.mode==='replay'?scoreAt(state.replay?.scoreFrames,state.replayTime):liveScore;targetMarkers.update(collectedIds(score));
   if(state.mode==='replay'&&state.replay?.scoreFrames){
    if(state.replayTime<replayFeedbackTime)feedback.reset();
    const frames=state.replay.scoreFrames;let lo=0,hi=frames.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].t<=state.replayTime)lo=mid;else hi=mid-1;}
    if(frames[lo]?.t<=state.replayTime)feedback.accept(frames[lo].score,state.replay.attempt+'-replay',state.replay.challenge,!state.replayPlaying);
    replayFeedbackTime=state.replayTime;
   }
   feedback.update(dt*rate,state.mode==='replay'?(state.replayTime>=state.replay.duration?'Result':state.replayTime>=0?'Flight':'Charging'):getPhase(),state.mode,rate);
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
   if(state.mode==='replay'&&state.replayPlaying){state.replayTime=Math.min(state.replay.duration+7,state.replayTime+dt*rate);$('replay-scrub').value=String(Math.min(state.replay.duration,state.replayTime));if(state.replayTime===state.replay.duration+7){state.replayPlaying=false;$('replay-play').textContent='Play';}}
   if(state.mode==='replay')replayTimeLabel();
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
