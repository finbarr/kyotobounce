export function playerName({send,cancel,notice,initialHost=null,onReady=()=>{}}){
 const dialog=document.createElement('dialog');dialog.id='player-name-dialog';dialog.innerHTML='<form><span class="eyebrow">WELCOME TO THE STATION ARCADE</span><h2>MAKE A NAME<br>FOR YOURSELF.</h2><p>Your name appears on the high scores and shared replays.</p><label>PLAYER NAME<input name="player" maxlength="32" required autocomplete="nickname" placeholder="Your arcade name"></label><p class="name-status" role="status"></p><button type="submit">LET’S PLAY →</button></form>';document.body.append(dialog);
 const form=dialog.querySelector('form'),input=form.querySelector('input'),status=form.querySelector('[role=status]'),submit=form.querySelector('button'),nickname=document.getElementById('nickname');let confirmed='',pending=false,mounted=!!initialHost,touched=false;
 if(initialHost)initialHost.append(form);
 const edit=document.createElement('button');edit.id='edit-player-name';edit.textContent='PLAYER NAME';nickname.after(edit);
 function open(){cancel();input.value=confirmed;status.textContent='';if(!dialog.open)dialog.showModal();input.focus();input.select();}
 function accepted(){if(mounted){submit.disabled=true;submit.textContent='YOU’RE READY ✓';status.textContent='Name saved. You can still change your robot.';onReady(true);}else{dialog.close();notice('Your name is on the board. Go make it count.');}}
 function save(value){const name=value.trim();if(!name||name.length>32||/[\u0000-\u001f\u007f]/.test(name)){status.textContent='Use 1–32 characters for your name.';return;}
  if(name===confirmed){accepted();return;}
  if(!send('name',{name})){status.textContent='Connecting… Try again in a moment.';return;}pending=true;input.disabled=true;submit.disabled=true;status.textContent='Saving your name…';}
 form.onsubmit=e=>{e.preventDefault();save(input.value);};input.addEventListener('input',()=>{touched=true;if(mounted){onReady(false);submit.disabled=pending;submit.textContent='LET’S PLAY →';status.textContent='';}});
 dialog.addEventListener('cancel',e=>{if(!confirmed)e.preventDefault();});edit.onclick=open;nickname.onchange=()=>{input.value=nickname.value;open();input.value=nickname.value;};
 return {get active(){return mounted||dialog.open;},finishStartup(){mounted=false;dialog.append(form);input.disabled=false;submit.disabled=false;submit.textContent='LET’S PLAY →';status.textContent='';},message(m){
  if(m.type==='welcome'){pending=false;input.disabled=false;submit.disabled=false;confirmed=m.nameChosen?m.name:'';nickname.value=m.name;edit.textContent=m.nameChosen?m.name:'PLAYER NAME';if(mounted){if(!touched)input.value=confirmed;if(input.value.trim()!==confirmed)onReady(false);}else if(!m.nameChosen)open();}
  if(m.type==='named'){confirmed=m.name;nickname.value=m.name;edit.textContent=m.name;input.disabled=false;submit.disabled=false;pending=false;accepted();}
  if(m.type==='error'&&pending){pending=false;input.disabled=false;submit.disabled=false;status.textContent=m.message;}
 }};
}
