// Local intent owns the live camera. A delayed physics phase cannot turn a
// held ball back into a throw; only a local release can.
export class LiveThrow {
  mode='holding';attempt=null;
  reset(){this.mode='holding';this.attempt=null;}
  charge(){this.reset();this.mode='charging';}
  release(){if(this.mode==='charging')this.mode='released';}
  expect(attempt){
    if(!attempt||this.mode==='holding'||(this.attempt&&this.attempt!==attempt))return false;
    this.attempt=attempt;return true;
  }
  owns(attempt){return !!attempt&&attempt===this.attempt;}
  acceptsState(attempt,phase){
    if(phase==='Aim')return !attempt;
    return this.owns(attempt)&&(phase==='Charging'||this.mode==='released');
  }
  accepts(message){
    if(message.type==='state')return this.acceptsState(message.attempt,message.phase);
    if(['shot-chunk','impact','waypoint-hit','result'].includes(message.type)||
       (message.type==='notice'&&message.attempt))return this.mode==='released'&&this.owns(message.attempt);
    return true;
  }
  phase(frame,phase){return this.acceptsState(frame?.attempt,phase)?phase:'Aim';}
  follows(frame,phase){return this.mode==='released'&&this.owns(frame?.attempt)&&['Flight','Result'].includes(phase);}
}
