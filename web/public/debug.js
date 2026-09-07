// Optional local diagnostics, also exposed in the DOM for browser inspection.
export function shotDetails(cancel){
  const panel=document.getElementById('shot-details'),output=document.getElementById('shot-state');
  let report=null,lastUpdate=0;
  panel.addEventListener('toggle',()=>{if(panel.open)cancel();});
  document.getElementById('save-shot-report').onclick=()=>{
    if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`kyoto-bounce-shot-${Date.now()}.json`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const number=n=>Number.isFinite(n)?n.toFixed(3):'—';
  const vector=v=>v?`${number(v.x)}, ${number(v.y)}, ${number(v.z)}`:'—';
  const speed=v=>v?number(Math.hypot(v.x,v.y,v.z)):'—';
  return ({snapshot:s,render,lastImpact,result,worker})=>{
    if(performance.now()-lastUpdate<250)return;
    lastUpdate=performance.now();
    report={capturedAt:new Date().toISOString(),worker,snapshot:s,render,lastImpact,result};
    const d=s?.diagnostics,active=['Flight','Result'].includes(s?.phase);
    output.textContent=s?[
      `Session: ${s.id}`,
      `View: ${render?.mode||'play'} · Worker: ${worker}`,
      `Phase: ${s.phase} · ${active&&d?.sleeping?'At rest':d?.simulating?'Simulating':'Inactive'}`,
      `Ball time: ${number(s.flightTime)} s`,
      `Result: ${d?.endReason||'—'}${d?.endReason?` at ${number(d.endedAt)} s`:''}`,
      `Position (m): ${vector(s.ball)}`,
      `Velocity (m/s): ${vector(s.velocity)}`,
      `Speed: ${speed(s.velocity)} m/s · Spin: ${speed(s.spin)} rad/s`,
      `Supported: ${active?String(d?.supported??false):'—'}`,
      `Last surface: ${active?d?.lastSurface||'—':'—'}`,
      `Last contact slope: ${active&&d?.contactAge>=0?number(d.slopeDegrees)+'°':'—'}`,
      `Contact normal: ${active?vector(d?.contactNormal):'—'}`,
      `Contact age: ${active&&d?.contactAge>=0?number(d.contactAge)+' s':'—'}`,
      `Surface velocity (m/s): ${active?vector(d?.surfaceVelocity):'—'}`,
      `Contact budget overruns: ${d?.contactBudgetExhaustions??0} · Overlap recoveries: ${d?.overlapRecoveries??0}`
    ].join('\n'):'Waiting for the game…';
  };
}
