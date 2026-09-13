// Keep release feedback on the input clock. Buffered Charging snapshots can
// still arrive after key-up; they must not rewind the meter and start it again.
export class ChargeMeter {
  startedAt=null;
  releasedPower=null;
  duration=2800;
  get charging(){return this.startedAt!==null;}
  get released(){return this.releasedPower!==null;}
  start(now,duration){this.startedAt=now;this.duration=duration;this.releasedPower=null;}
  reset(){this.startedAt=null;this.releasedPower=null;}
  release(now){
    if(!this.charging)return;
    this.releasedPower=this.sample(now);this.startedAt=null;
  }
  sample(now,phase='Aim'){
    if(this.charging)return Math.max(0,Math.min(1,(now-this.startedAt)/this.duration));
    if(phase==='Flight'||phase==='Result')return 0;
    return this.releasedPower??0;
  }
}
