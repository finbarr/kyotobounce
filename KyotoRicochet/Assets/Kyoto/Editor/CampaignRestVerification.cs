using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto.Editor
{
    // Replay real launch coordinates through the production sphere and station.
    // No presentation clock, timed finish, or artificial damping is involved.
    public static class CampaignRestVerification
    {
        [Serializable] class Inputs {public Vector3 origin;public float yaw,pitch,minHoldMs,maxHoldMs,stepMs,observeSeconds;}
        [Serializable] class Sample {public float time,contactAge,supportDistance;public Vector3 position,velocity,spin,normal,supportNormal;public bool supported,supportCast;public string surface;public int budget,overlaps;}
        [Serializable] class Trial {public float holdMs;public bool sleeping;public Sample final;public List<Sample> samples=new List<Sample>();}
        [Serializable] class Report {public string status="running";public RailwayMeshVerification.Report geometry;public List<Trial> trials=new List<Trial>();}
        static Sample Read(BallBody b){
            bool cast=b.gameObject.scene.GetPhysicsScene().SphereCast(b.Body.position,b.Profile.radius_m,-b.ContactNormal,out var hit,.0004f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore);
            return new Sample{time=b.Clock,contactAge=b.Clock-b.LastContactTime,position=b.Body.position,velocity=b.Velocity,spin=b.AngularVelocity,normal=b.ContactNormal,supported=b.Supported,supportCast=cast,supportNormal=hit.normal,supportDistance=hit.distance,surface=b.LastContactSurface,budget=b.ContactBudgetExhaustions,overlaps=b.StaticOverlapRecoveries};
        }
        public static void Run()
        {
            var input=JsonUtility.FromJson<Inputs>(File.ReadAllText(Environment.GetEnvironmentVariable("KYOTO_REST_INPUT")));
            var output=Environment.GetEnvironmentVariable("KYOTO_REST_REPORT");
            var layout=JsonUtility.FromJson<StationLayout>(File.ReadAllText(Environment.GetEnvironmentVariable("KYOTO_LAYOUT")));
            foreach(float value in new[]{input.minHoldMs,input.maxHoldMs,input.stepMs})
                if(float.IsNaN(value)||float.IsInfinity(value))throw new Exception("Invalid charge scan");
            if(input.stepMs<=0||input.minHoldMs+input.stepMs<=input.minHoldMs
                ||input.minHoldMs<0||input.maxHoldMs>2800||input.maxHoldMs<input.minHoldMs
                ||(input.maxHoldMs-input.minHoldMs)/input.stepMs>1000)throw new Exception("Invalid charge scan");
            float duration=input.observeSeconds==0?40:input.observeSeconds;
            if(float.IsNaN(duration)||duration<20||duration>120)throw new Exception("Invalid rest observation window");
            var report=new Report();
            try{
                using(var sim=new ShotSimulation(true,layout)){
                    if(Environment.GetEnvironmentVariable("KYOTO_VERIFY_RAILWAY_BASE")=="1")report.geometry=RailwayMeshVerification.Check(sim.Root,layout);
                    for(float hold=input.minHoldMs;hold<=input.maxHoldMs;hold+=input.stepMs){
                        var trial=new Trial{holdMs=hold};report.trials.Add(trial);
                        float speed=Mathf.Lerp(.5f,12f,hold/2800);
                        var velocity=Quaternion.Euler(-input.pitch,input.yaw,0)*Vector3.forward*speed;
                        sim.Run(input.origin,velocity,Vector3.zero,duration,sample:b=>{
                            if(trial.samples.Count==0||b.Clock>duration-1||b.Clock-trial.samples[trial.samples.Count-1].time>=1)trial.samples.Add(Read(b));
                        });
                        trial.sleeping=sim.Ball.Sleeping;trial.final=Read(sim.Ball);
                        Debug.Log("CAMPAIGN_REST "+JsonUtility.ToJson(trial.final)+" hold="+hold);
                        if(!trial.sleeping){report.status="unsettled";throw new Exception("Campaign shot is still moving: "+hold+" ms");}
                    }
                }
                report.status="pass";
            }finally{Directory.CreateDirectory(Path.GetDirectoryName(output));File.WriteAllText(output,JsonUtility.ToJson(report,true));}
        }
    }
}
