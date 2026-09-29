#if !UNITY_WEBGL || UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kyoto
{
    public sealed partial class BrowserSession
    {
        [Serializable] public sealed class ReplayLiftFrame {public float t;public LiftPose[] poses;}
        sealed class LiftHistoryFrame {public double time;public LiftPose[] poses;public LiftState[] states;}
        LiftState[] liftStates=Array.Empty<LiftState>(),shotLiftStates=Array.Empty<LiftState>();
        readonly List<LiftHistoryFrame> liftHistory=new List<LiftHistoryFrame>();
        readonly List<ReplayLiftFrame> replayLiftFrames=new List<ReplayLiftFrame>();
        double lastLiftSample=-1;
        LiftState[] CopyLifts()=>Array.ConvertAll(liftStates,s=>s.Copy());
        void CreateLiftStates()
        {if(layout.lifts!=null)liftStates=Array.ConvertAll(layout.lifts,s=>new LiftState{id=s.id});}
        void RequestLift(Command c,Player player)
        {
            bool ok=false;string message="Finish or recall your throw before using the lift.";
            if(state.phase=="Aim")
            {
                var lift=StationMotion.FindLift(gameObject.scene,c.lift);
                if(lift)ok=lift.Request(player.walker.transform.position,stationTime,out message);
                else message="Lift unavailable.";
            }
            Send(new RpcReply{request=c.request,ok=ok,message=message});
        }
        void HoldLiftDoors()
        {
            foreach(var s in liftStates)
            {
                var lift=StationMotion.FindLift(gameObject.scene,s.id);if(!lift)continue;bool blocked=false;
                foreach(var p in players.Values)blocked|=lift.InDoorway(p.walker.transform.position,.24f,1.8f,stationTime);
                if(state.phase=="Flight")blocked|=lift.InDoorway(ball.Body.position-Vector3.up*state.radius,state.radius,state.radius*2,stationTime);
                lift.HoldDoor(stationTime,BallBody.Step,blocked);
            }
        }
        void RecordLiftPoses(bool force=false)
        {
            if(liftStates.Length==0)return;
            double time=StationMotion.Time(gameObject.scene);if(!force&&time-lastLiftSample<1.0/30-.0001)return;
            var poses=StationMotion.LiftPoses(gameObject.scene);
            liftHistory.Add(new LiftHistoryFrame{time=time,poses=poses,states=CopyLifts()});lastLiftSample=time;
            // Sixty seconds of ahead simulation plus the rewind/presentation margin.
            while(liftHistory.Count>0&&liftHistory[0].time<time-70)liftHistory.RemoveAt(0);
            if(state.phase=="Flight")replayLiftFrames.Add(new ReplayLiftFrame{t=(float)(time-state.releaseTime),poses=poses});
        }
        void BeginLiftRecording()
        {
            shotLiftStates=CopyLifts();replayLiftFrames.Clear();
            foreach(var f in liftHistory)if(f.time>=state.releaseTime-3.5&&f.time<state.releaseTime)
                replayLiftFrames.Add(new ReplayLiftFrame{t=(float)(f.time-state.releaseTime),poses=f.poses});
            RecordLiftPoses(true);
        }
        void RewindLifts(double time)
        {
            liftStates=Array.ConvertAll(shotLiftStates,s=>s.Copy());
            for(int i=liftHistory.Count-1;i>=0;i--)if(liftHistory[i].time<=time)
            {liftStates=Array.ConvertAll(liftHistory[i].states,s=>s.Copy());break;}
            liftHistory.RemoveAll(f=>f.time>time);lastLiftSample=liftHistory.Count==0?-1:liftHistory[liftHistory.Count-1].time;
        }
    }
}
#endif
