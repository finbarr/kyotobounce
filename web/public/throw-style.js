const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Pure, shot-clock poses. No simulation or launch parameters are changed.
export function throwStyle(range,phase,power,releaseProgress=0,flightTime=0){
 const full=range==='full',charge=clamp(power),drive=smooth(releaseProgress);
 const following=phase==='Flight',recovery=following?1-smooth((flightTime-.25)/.85):1;
 const winding=phase==='Charging'?smooth(charge):phase==='Release'?smooth(charge)*(1-drive):0;
 const throwing=phase==='Release'?drive:following?recovery:0;
 const active=['Aim','Charging','Release','Flight'].includes(phase);
 const stance=active&&full?(following?recovery:1):0;
 return {full,charge,winding,throwing,recovery:following?recovery:0,stance,
  crouch:stance*(.045+.085*winding+.018*throwing),
  twist:full?stance*(-.12-.52*winding+.48*throwing):-.045*winding+.045*throwing,
  lean:full?-.10*winding+.22*throwing:.025*throwing,
  shift:full?-.035*winding+.055*throwing:0,
 };
}
