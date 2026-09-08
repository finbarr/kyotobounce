import { ROBOT_CHARACTERS } from './avatar.js';
const storageKey='kyoto-robot-character-v1';
export function readCharacterChoice(){
  try{const id=localStorage.getItem(storageKey);if(ROBOT_CHARACTERS.some(c=>c.id===id))return id;}catch{}
  return 'ori';
}
// A menu-only cosmetic preference. No input, score, replay or network payload changes.
export function createCharacterPicker({onChange=()=>{}}={}){
  let selected=readCharacterChoice();const element=document.createElement('div'),root=element.attachShadow({mode:'open'});
  element.id='robot-character-picker';
  root.innerHTML=`<style>
   :host{display:block;margin:16px 0;color:#f7e8ca;font:12px system-ui,sans-serif}
   h3{font-size:10px;letter-spacing:.16em;margin:0 0 9px;color:#f9cd64}p{margin:8px 0 0;font-size:10px;color:#bfcad5;line-height:1.4}
   .cast{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
   button{font:inherit;color:inherit;border:1px solid #506078;border-radius:7px;background:#182c42;padding:8px 3px;cursor:pointer}
   button[aria-pressed=true]{border:2px solid #f5c366;padding:7px 2px;background:#263d50}
   button:hover{background:#30495c}button:focus-visible{outline:3px solid #91e7db;outline-offset:2px}button:disabled{opacity:.5;cursor:default}
   svg{display:block;width:58px;max-width:100%;height:50px;margin:auto auto 5px}strong{display:block;letter-spacing:.1em}small{display:block;font-size:9px;color:#a8c3c9;margin-top:2px}
  </style><h3>CHOOSE YOUR ROBOT</h3><div class="cast" role="group" aria-label="Robot character"></div><p role="status"></p>`;
  const cast=root.querySelector('.cast'),status=root.querySelector('[role=status]');
  for(const c of ROBOT_CHARACTERS){
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`${c.name} · ${c.title}`);button.dataset.character=c.id;
    const detail=c.id==='ori'?'<path d="M12 12h40v7H12z" fill="#dd5438"/><circle cx="9" cy="28" r="8" fill="#d9573a"/><circle cx="55" cy="28" r="8" fill="#d9573a"/>':c.id==='koma'?'<path d="M13 17 14 2 28 15M36 15 50 2 51 17" fill="#fff0d2" stroke="#d9573a" stroke-width="3"/>':'<path d="M10 12h44v7H10z" fill="#233e63"/><path d="M10 15h44" stroke="#fff0d2" stroke-width="2"/><ellipse cx="32" cy="46" rx="13" ry="5" fill="#d9573a" stroke="#e6c477" stroke-width="2"/>';
    button.innerHTML=`<svg viewBox="0 0 64 52" aria-hidden="true"><rect x="12" y="10" width="40" height="35" rx="10" fill="#eee2c9"/>${detail}<rect x="17" y="21" width="30" height="18" rx="5" fill="#0a2330"/><path d="M22 28h5m10 0h5M28 33q4 4 8 0" fill="none" stroke="#9fead8" stroke-width="3"/></svg><strong>${c.name}</strong><small>${c.kana}</small>`;
    button.onclick=()=>{selected=c.id;try{localStorage.setItem(storageKey,selected);}catch{}render();onChange(selected);};cast.append(button);
  }
  function render(){for(const b of cast.children)b.setAttribute('aria-pressed',String(b.dataset.character===selected));status.textContent=ROBOT_CHARACTERS.find(c=>c.id===selected).description;}
  render();
  return {element,get value(){return selected;},setDisabled(disabled){for(const b of cast.children)b.disabled=disabled;}};
}
