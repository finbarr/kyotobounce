// Optional local diagnostics, also exposed in the DOM for browser inspection.
export function shotDetails(cancel){
  const panel=document.getElementById('shot-details'),output=document.getElementById('shot-state');
  let report=null,lastFlight=null,lastUpdate=0;
  panel.addEventListener('toggle',()=>{if(panel.open)cancel();});
  document.getElementById('save-shot-report').onclick=()=>{
    if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify({current:report,lastShot:lastFlight},null,2)],{type:'application/json'}));
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
    if(active)lastFlight=report;
    // Inspect through the DOM without an executable browser debugging backdoor.
    output.dataset.report=JSON.stringify({phase:s?.phase,aim:{yaw:render?.yaw,pitch:render?.pitch},thrower:s?.players?.find(p=>p.id===s.id),camera:render?.camera,rotationSamples:render?.rotationSampleCount,renderedSpin:render?.renderedSpin,spinMarkOpacity:render?.spinMarkOpacity,spin:s?.spin,ball:s?.ball,renderBall:render?.renderBall,diagnostics:d,lastShot:lastFlight?{phase:lastFlight.snapshot?.phase,ball:lastFlight.snapshot?.ball,diagnostics:lastFlight.snapshot?.diagnostics}:null});
    output.textContent=s?[
      `Session: ${s.id}`,
      `View: ${render?.mode||'play'} · Worker: ${worker}`,
      `Phase: ${s.phase} · ${active&&d?.sleeping?'At rest':d?.simulating?'Simulating':'Inactive'}`,
      `Camera: ${render?.camera?.mode||'—'} · Aim: ${number(render?.yaw)}°, ${number(render?.pitch)}°`,
      `Ball time: ${number(s.flightTime)} s`,
      `Result: ${d?.endReason||'—'}${d?.endReason?` at ${number(d.endedAt)} s`:''}`,
      `Position (m): ${vector(s.ball)}`,
      `Velocity (m/s): ${vector(s.velocity)}`,
      `Speed: ${speed(s.velocity)} m/s · Spin: ${speed(s.spin)} rad/s`,
      `Angular velocity (rad/s): ${vector(s.spin)}`,
      `Rendered spin: ${number(render?.renderedSpin)} rad/s · Rotation samples: ${render?.rotationSampleCount??0}`,
      `Supported: ${active?String(d?.supported??false):'—'}`,
      `Last surface: ${active?d?.lastSurface||'—':'—'}`,
      `Last contact slope: ${active&&d?.contactAge>=0?number(d.slopeDegrees)+'°':'—'}`,
      `Contact normal: ${active?vector(d?.contactNormal):'—'}`,
      `Contact age: ${active&&d?.contactAge>=0?number(d.contactAge)+' s':'—'}`,
      `Spin friction: ${active?number(d?.torsionalResistance):'—'}`,
      `Surface velocity (m/s): ${active?vector(d?.surfaceVelocity):'—'}`,
      `Contact budget overruns: ${d?.contactBudgetExhaustions??0} · Overlap recoveries: ${d?.overlapRecoveries??0}`,
      ...(!active&&lastFlight?['Previous shot preserved in saved report.']:[])
    ].join('\n'):'Waiting for the game…';
  };
}
