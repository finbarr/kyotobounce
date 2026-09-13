// Bounded operational measurements. No player names, tokens, positions or inputs.
export class Samples {
  private values:number[]=[];private count=0;private maximum=0;
  add(value:number){if(!Number.isFinite(value)||value<0)return;this.count++;this.maximum=Math.max(this.maximum,value);if(this.values.length<512)this.values.push(value);}
  take(){const values=this.values.sort((a,b)=>a-b),n=values.length;const result={count:this.count,p50:Math.round(values[Math.floor(n*.5)]||0),p95:Math.round(values[Math.min(n-1,Math.floor(n*.95))]||0),max:Math.round(this.maximum)};this.values=[];this.count=this.maximum=0;return result;}
}
const types=new Set(['hello','input','charge','release','cancel','recall','home','select-challenge','replay','name','save-challenge','place','leaderboard','ping','leave','client-performance']);
export class ConnectionMetrics {
  readonly tag:string;received:Record<string,number>={};total:Record<string,number>={};bytesIn=0;bytesOut=0;droppedStates=0;queueMax=0;bufferMax=0;lastState=0;closeCause='peer';
  readonly snapshotGaps=new Samples();readonly simulationGaps=new Samples();private lastSimulation?:number;
  constructor(id:string){this.tag=id.slice(0,8);}
  message(type:string,bytes:number){const key=types.has(type)?type:'unknown';this.received[key]=(this.received[key]||0)+1;this.total[key]=(this.total[key]||0)+1;this.bytesIn+=bytes;}
  state(time:number,simulation:number){if(this.lastState)this.snapshotGaps.add(time-this.lastState);if(this.lastSimulation!==undefined&&simulation>=this.lastSimulation)this.simulationGaps.add((simulation-this.lastSimulation)*1000);this.lastState=time;this.lastSimulation=simulation;}
  take(){const result={connection:this.tag,received:this.received,bytesIn:this.bytesIn,bytesOut:this.bytesOut,droppedStates:this.droppedStates,queueMax:this.queueMax,bufferMax:this.bufferMax,snapshotGapMs:this.snapshotGaps.take(),simulationStepMs:this.simulationGaps.take()};this.received={};this.bytesIn=this.bytesOut=this.droppedStates=this.queueMax=this.bufferMax=0;return result;}
}
const fields=['shotUnderrunMs','shotBufferMs','shotComplete','windowMs','frames','frameP50Ms','frameP95Ms','frameMaxMs','renderMaxMs','poseMaxMs','cameraMaxMs','shadowMaxMs','states','stateGapMaxMs','stateAgeMs','simulationGapMaxMs','rttMs','outgoingBufferedBytes','longTasks','longTaskMaxMs','visibilityChanges','closeCode'];
export function clientPerformance(value:any){
  if(!value||typeof value!=='object')return null;
  const result:Record<string,number|string|boolean>={};
  for(const key of fields){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>100_000_000)return null;result[key]=Math.round(n);}
  if(!['loading','Aim','Charging','Release','Flight','Result','replay'].includes(value.phase)||typeof value.hidden!=='boolean')return null;
  result.phase=value.phase;result.hidden=value.hidden;return result;
}
