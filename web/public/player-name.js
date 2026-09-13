export function playerName({send,cancel,notice}){
 const dialog=document.createElement('dialog');dialog.id='player-name-dialog';dialog.innerHTML='<form><span class="eyebrow">WELCOME TO THE STATION ARCADE</span><h2>MAKE A NAME<br>FOR YOURSELF.</h2><p>Your name appears on the high scores and shared replays.</p><label>PLAYER NAME<input name="player" maxlength="32" required autocomplete="nickname" placeholder="Your arcade name"></label><p class="name-status" role="status"></p><button type="submit">LET’S PLAY →</button></form>';document.body.append(dialog);
 const input=dialog.querySelector('input'),status=dialog.querySelector('[role=status]'),submit=dialog.querySelector('button'),nickname=document.getElementById('nickname');let confirmed='',pending=false;
 const edit=document.createElement('button');edit.id='edit-player-name';edit.textContent='PLAYER NAME';nickname.after(edit);
 function open(){cancel();input.value=confirmed;status.textContent='';if(!dialog.open)dialog.showModal();input.focus();input.select();}
 function save(value){const name=value.trim();if(!name||name.length>32||/[\u0000-\u001f\u007f]/.test(name)){status.textContent='Use 1–32 characters for your name.';return;}
  if(!send('name',{name})){status.textContent='Connecting… Try again in a moment.';return;}pending=true;submit.disabled=true;status.textContent='Saving your name…';}
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();save(input.value);};dialog.addEventListener('cancel',e=>{if(!confirmed)e.preventDefault();});edit.onclick=open;nickname.onchange=()=>{input.value=nickname.value;open();input.value=nickname.value;};
 return {get active(){return dialog.open;},message(m){
  if(m.type==='welcome'){pending=false;submit.disabled=false;confirmed=m.nameChosen?m.name:'';nickname.value=m.name;edit.textContent=m.nameChosen?m.name:'PLAYER NAME';if(!m.nameChosen)open();}
  if(m.type==='named'){confirmed=m.name;nickname.value=m.name;edit.textContent=m.name;submit.disabled=false;pending=false;dialog.close();notice('Your name is on the board. Go make it count.');}
  if(m.type==='error'&&pending){pending=false;submit.disabled=false;status.textContent=m.message;}
 }};
}
