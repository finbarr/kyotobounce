using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor.SceneManagement;
using UnityEditor;
using UnityEngine;
namespace Kyoto.Editor
{
    [InitializeOnLoad]
    public static class FloorTessellationStudy
    {
        static string Arg(string k)=>Environment.GetCommandLineArgs().Single(a=>a.StartsWith("--kyoto-"+k+"=")).Split('=',2)[1];
        [Serializable] class Courses {public Challenge[] challenges;}
        [Serializable] class ContactRecord
        {
            public float time;public string surfaceId;public Vector3 point,normal,incomingVelocity,outgoingVelocity,incomingSpin,outgoingSpin;
            public ContactRecord(ContactSample q){time=q.time;surfaceId=q.surfaceId;point=q.point;normal=q.normal;incomingVelocity=q.incomingVelocity;outgoingVelocity=q.outgoingVelocity;incomingSpin=q.incomingSpin;outgoingSpin=q.outgoingSpin;}
        }
        [Serializable] class ProbeReport {public int attempted,tested,skipped,failed;public float maximumTiltDegrees;public Vector3 worstPoint,worstNormal;}
        static ProbeReport Probe(ShotSimulation sim)
        {
            var result=new ProbeReport();var random=new System.Random(206004);
            for(int i=0;i<2400;i++)
            {
                float Unit()=>(float)random.NextDouble();
                var origin=new Vector3(-80+200*Unit(),.06f+.34f*Unit(),-35+60*Unit());
                var direction=new Vector3((Unit()-.5f)*2,-1,(Unit()-.5f)*2).normalized;result.attempted++;
                if(!sim.Physics.SphereCast(origin,.023f,direction,out var hit,1f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore)||hit.collider.name!="concourse"||Mathf.Abs(hit.point.y)>.0001f){result.skipped++;continue;}
                var p=hit.point;bool nearOpening=false;
                foreach(float x in new[]{-15.5505f,18.85f})foreach(float z in new[]{6.5f,7.95f})
                    if(Mathf.Abs(p.x-x)<.56f&&Mathf.Abs(p.z-z)<.62f)nearOpening=true;
                if(nearOpening){result.skipped++;continue;}
                result.tested++;
                float angle=Mathf.Atan2(new Vector2(hit.normal.x,hit.normal.z).magnitude,hit.normal.y)*Mathf.Rad2Deg;
                if(angle>result.maximumTiltDegrees){result.maximumTiltDegrees=angle;result.worstPoint=hit.point;result.worstNormal=hit.normal;}
                if(angle>.05f)result.failed++;
            }
            return result;
        }
        [Serializable] class RunReport {public string layoutSha256;public int contactBudget;public Vector3 finalPosition;public ContactRecord[] contacts;public ProbeReport probes;}
        const string Key="KyotoFloorTessellationStudy";
        static FloorTessellationStudy(){EditorApplication.update+=Tick;}
        public static void Run()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            SessionState.SetBool(Key,true);EditorApplication.isPlaying=true;
        }
        static void Tick()
        {
            if(!EditorApplication.isPlaying||EditorApplication.isCompiling||EditorApplication.isUpdating||!SessionState.GetBool(Key,false))return;
            SessionState.EraseBool(Key);
            try{Execute();EditorApplication.Exit(0);}catch(Exception e){Debug.LogException(e);EditorApplication.Exit(1);}
        }
        static void Execute()
        {
            string output=Arg("evidence");if(Directory.Exists(output))throw new Exception("Fresh output required");Directory.CreateDirectory(output);

            Physics.gravity=Vector3.down*9.81f;Physics.defaultContactOffset=.001f;
            var c=JsonUtility.FromJson<Courses>(File.ReadAllText(Arg("course-candidate"))).challenges.Single(q=>q.id=="many-surfaces");
            foreach(string name in new[]{"before","after"})
            {
                string text=File.ReadAllText(Arg("layout-"+name));string hash;
                using(var sha=SHA256.Create())hash=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant();
                using(var sim=new ShotSimulation(true,JsonUtility.FromJson<StationLayout>(text),BallProfile.Phase2Default))
                {
                    var probes=Probe(sim);sim.SetCup(c.cup,c.cupRadius);var contacts=new List<ContactRecord>();sim.Ball.Contact+=q=>contacts.Add(new ContactRecord(q));
                    var trace=new List<string>{"time,x,y,z,vx,vy,vz"};
                    sim.Run(c.origin,c.witnessVelocity,c.witnessSpin,18,sample:b=>{
                        var p=b.Body.position;var v=b.Velocity;trace.Add(FormattableString.Invariant($"{b.Clock:R},{p.x:R},{p.y:R},{p.z:R},{v.x:R},{v.y:R},{v.z:R}"));
                    },startWorldTime:c.witnessWorldTime);
                    File.WriteAllLines(output+"/"+name+"-trace.csv",trace);
                    File.WriteAllText(output+"/"+name+".json",JsonUtility.ToJson(new RunReport{layoutSha256=hash,contactBudget=sim.Ball.ContactBudgetExhaustions,finalPosition=sim.Ball.Body.position,contacts=contacts.ToArray(),probes=probes},true));
                    if(name=="after"&&(probes.tested<1200||probes.failed>0))throw new Exception("Refined floor contact normals failed dense oblique sweeps.");
                }
            }
        }
    }
}
