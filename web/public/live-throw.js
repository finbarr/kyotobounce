// Local intent owns the live camera. A delayed physics phase cannot turn a
// held ball back into a throw; only release (or an explicit reconnect) can.
export class LiveThrow {
  mode='holding';attempt=null;canRestore=false;
  reset(){this.mode='holding';this.attempt=null;this.canRestore=false;}
  charge(){this.reset();this.mode='charging';}
  release(){if(this.mode==='charging')this.mode='released';}
  expect(attempt){
    if(!attempt||this.mode==='holding'||(this.attempt&&this.attempt!==attempt))return false;
    this.attempt=attempt;return true;
  }
  reconnect(){this.canRestore=true;}
  resume(attempt){
    if(!attempt)return false;
    if(this.canRestore){this.mode='released';this.attempt=attempt;this.canRestore=false;return true;}
    return this.mode==='released'&&attempt===this.attempt;
  }
  owns(attempt){return !!attempt&&attempt===this.attempt;}
  acceptsState(attempt,phase){
    if(phase==='Aim')return !attempt;
    return this.owns(attempt)&&(phase==='Charging'||this.mode==='released');
  }
  accepts(message){
    if(message.type==='state')return this.acceptsState(message.attempt,message.phase);
    if(['shot-chunk','shot-resume','impact','waypoint-hit','result'].includes(message.type)||
       (message.type==='notice'&&message.attempt))return this.mode==='released'&&this.owns(message.attempt);
    return true;
  }
  phase(frame,phase){return this.acceptsState(frame?.attempt,phase)?phase:'Aim';}
  follows(frame,phase){return this.mode==='released'&&this.owns(frame?.attempt)&&['Flight','Result'].includes(phase);}
}
