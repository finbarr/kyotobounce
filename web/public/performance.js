// Rolling diagnostics only: no recording of player identity, controls or world positions.
export function clientPerformance({now=()=>performance.now(),document=globalThis.document}={}){
  let started=now(),frames=[],frameCount=0,frameMax=0,states=0,lastState=null,lastSimulation=null,stateGapMax=0,simulationGapMax=0,rtt=0,buffered=0,closeCode=0,phase='loading';
  let maxima={},longTasks=0,longTaskMax=0,visibilityChanges=0,server=null;
  const observer=globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')?new PerformanceObserver(list=>{for(const e of list.getEntries()){longTasks++;longTaskMax=Math.max(longTaskMax,e.duration);}}):null;
  observer?.observe({type:'longtask',buffered:false});
  document?.addEventListener('visibilitychange',()=>{visibilityChanges++;lastState=null;lastSimulation=null;});
  return {
    frame(dt,costs,currentPhase){phase=currentPhase||'loading';if(document?.hidden)return;frameCount++;frameMax=Math.max(frameMax,dt);if(frames.length<512)frames.push(dt);for(const [key,value]of Object.entries(costs))maxima[key]=Math.max(maxima[key]||0,value);},
    traffic(direction,type,bytes,message,queueBytes){buffered=Math.max(buffered,queueBytes||0);if(direction!=='receive'||type!=='state')return;const time=now();if(lastState!==null)stateGapMax=Math.max(stateGapMax,time-lastState);if(lastSimulation!==null&&message.stationTime>=lastSimulation)simulationGapMax=Math.max(simulationGapMax,(message.stationTime-lastSimulation)*1000);lastState=time;lastSimulation=message.stationTime;states++;},
    status(status,extra={}){if(status==='latency'){rtt=extra.rttMs;server=extra.server||null;}if(extra.closeCode)closeCode=extra.closeCode;},
    get current(){return {stateAgeMs:lastState===null?0:Math.max(0,now()-lastState),rttMs:rtt,closeCode,server};},
    report(){const time=now(),sorted=frames.sort((a,b)=>a-b),n=sorted.length;
      const result={windowMs:time-started,frames:frameCount,frameP50Ms:sorted[Math.floor(n*.5)]||0,frameP95Ms:sorted[Math.min(n-1,Math.floor(n*.95))]||0,frameMaxMs:frameMax,renderMaxMs:maxima.render||0,poseMaxMs:maxima.pose||0,cameraMaxMs:maxima.camera||0,shadowMaxMs:maxima.shadows||0,states,stateGapMaxMs:stateGapMax,stateAgeMs:lastState===null?0:Math.max(0,time-lastState),simulationGapMaxMs:simulationGapMax,rttMs:rtt,outgoingBufferedBytes:buffered,longTasks,longTaskMaxMs:longTaskMax,visibilityChanges,closeCode,phase,hidden:document?.hidden===true};
      started=time;frames=[];frameCount=frameMax=states=stateGapMax=simulationGapMax=buffered=longTasks=longTaskMax=visibilityChanges=0;maxima={};return result;
    }
  };
}
