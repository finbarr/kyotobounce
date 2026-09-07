using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
namespace Kyoto.Editor
{
    // Real Unity scene queries at the two reported locations. Starts are outside
    // solid geometry: the old escalator coordinate was already inside two shells.
    public static class FlightContactVerification
    {
        [Serializable] class Report {public string status="running";public List<Trial> trials=new List<Trial>();}
        [Serializable] class Trial {public string name,lastSurface,penetratedSurface;public Vector3 end,velocity,spin;public int overlaps,budget;public float seconds,maxPenetration,firstRest=-1;public bool sleeping;}
        static void Require(bool ok,string message){if(!ok)throw new Exception(message);}
        public static void Run()
        {
            var output=Environment.GetEnvironmentVariable("KYOTO_CONTACT_REPORT");
            var layout=JsonUtility.FromJson<StationLayout>(File.ReadAllText(Environment.GetEnvironmentVariable("KYOTO_LAYOUT")));
            var report=new Report();
            try{
                using(var sim=new ShotSimulation(true,layout))
                {
                    Physics.SyncTransforms();
                    Trial TrialAt(string name,Vector3 start,Vector3 velocity,Vector3 spin,float duration)
                    {
                        var trial=new Trial{name=name};report.trials.Add(trial);
                        float lastSpin=spin.magnitude;bool verticalRest=name.Contains("roof-spin");
                        var near=new Collider[128];var sphere=sim.Ball.GetComponent<SphereCollider>();
                        sim.Run(start,velocity,spin,duration,sample:b=>{
                            if(verticalRest){
                                Require(b.AngularVelocity.y>=-.001f,name+": friction reversed stationary spin");
                                Require(b.AngularVelocity.magnitude<=lastSpin+.005f,name+": contact added spin energy");
                                lastSpin=b.AngularVelocity.magnitude;
                            }
                            if(b.Sleeping&&trial.firstRest<0)trial.firstRest=b.Clock;
                            int count=sim.Physics.OverlapSphere(b.Body.position,b.Profile.radius_m,near,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore);
                            for(int i=0;i<count;i++)if(Physics.ComputePenetration(sphere,b.Body.position,Quaternion.identity,near[i],near[i].transform.position,near[i].transform.rotation,out _,out float depth)&&depth>trial.maxPenetration){trial.maxPenetration=depth;trial.penetratedSurface=near[i].name;}
                        });
                        var ball=sim.Ball;trial.end=ball.Body.position;trial.velocity=ball.Velocity;trial.spin=ball.AngularVelocity;trial.overlaps=ball.StaticOverlapRecoveries;trial.budget=ball.ContactBudgetExhaustions;trial.sleeping=ball.Sleeping;trial.lastSurface=ball.LastContactSurface;trial.seconds=ball.Clock;
                        Require(trial.maxPenetration<.002f,name+": penetrated a solid by "+trial.maxPenetration+" m");
                        Require(trial.budget<3,name+": exhausted contact budget "+trial.budget+" times");
                        return trial;
                    }
                    var roof=new Vector3(46.542f,9.203f,-20.487f);
                    var rest=TrialAt("reported-roof-spin",roof,new Vector3(0,-.016f,0),Vector3.up*85.679f,8);
                    Require(rest.sleeping&&rest.spin==Vector3.zero&&rest.velocity==Vector3.zero,"Spinning floor contact must stop completely");
                    Require(rest.firstRest>1&&rest.firstRest<5,"Spin must dissipate over time, not disappear or linger indefinitely");
                    var maxSpin=TrialAt("maximum-roof-spin",roof,Vector3.zero,Vector3.up*200,10);
                    Require(maxSpin.sleeping&&maxSpin.firstRest<9,"Maximum stationary spin must decay without reversing or restarting");
                    var air=TrialAt("airborne-spin",new Vector3(0,30,0),Vector3.up*10,Vector3.up*85.679f,.8f);
                    Require(Mathf.Abs(air.spin.magnitude-85.679f)<.01f,"Ground friction must not damp airborne spin");
                    var roll=TrialAt("spin-drives-rolling",roof,Vector3.zero,Vector3.forward*85.679f,.5f);
                    Require(roll.velocity.magnitude>.2f&&Vector3.Distance(roll.end,roof)>.05f,"Tangential spin must move the ball across the floor");
                    var drop=TrialAt("drop-above-escalator-skirt",new Vector3(34.480f,5.8f,2.497f),Vector3.down,Vector3.zero,20);
                    Require(drop.sleeping&&drop.end.y>5.49f,"Skirt impact must return to the landing, not get stuck below it");
                    TrialAt("slow-escalator-side",new Vector3(36f,6.1f,4.4f),new Vector3(0,0,-2),Vector3.up*30,6);
                    TrialAt("fast-escalator-side",new Vector3(36f,6.1f,4.4f),new Vector3(0,0,-100),Vector3.up*150,6);
                }
                report.status="pass";
            }finally{Directory.CreateDirectory(Path.GetDirectoryName(output));File.WriteAllText(output,JsonUtility.ToJson(report,true));}
        }
    }
}
