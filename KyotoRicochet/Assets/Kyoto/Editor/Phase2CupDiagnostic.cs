using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2CupDiagnostic
    {
        [Serializable] public class Fixture
        {
            public Vector3 origin,velocity,spin,cup;
            public float cupRadius;
            public float[] phases;
        }
        public static void Run(string output="../artifacts/phase2/courses/cup-diagnostic-01",bool verify=false)
        {
            var fixture=JsonUtility.FromJson<Fixture>(File.ReadAllText("../art-source/phase2-cup-regression.json"));
            var args=Environment.GetCommandLineArgs();
            var trialPath=Array.Find(args,a=>a.StartsWith("--kyoto-cup-trial="));
            if(trialPath!=null)
            {
                var saved=JsonUtility.FromJson<Phase2CourseSearch.Result>(File.ReadAllText(trialPath.Substring("--kyoto-cup-trial=".Length)));
                var label=Array.Find(args,a=>a.StartsWith("--kyoto-cup-label="));
                if(label==null)throw new ArgumentException("Trial diagnostic needs --kyoto-cup-label.");
                var t=saved.neighbours.Find(q=>q.label==label.Substring("--kyoto-cup-label=".Length));
                if(t==null)throw new ArgumentException("No retained trial with that label.");
                fixture=new Fixture{origin=t.feet+Vector3.up*1.5f+Quaternion.Euler(0,t.yaw,0)*new Vector3(.22f,0,.42f),
                    velocity=Quaternion.Euler(-t.pitch,t.yaw,0)*Vector3.forward*t.speed,spin=SpinControls.Compose(t.yaw,t.top,t.kick,0),
                    cup=saved.challenge.cup,cupRadius=saved.challenge.cupRadius,phases=new[]{t.time}};
            }
            foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-course-output="))output=arg.Substring("--kyoto-course-output=".Length);
            Directory.CreateDirectory(output);Physics.gravity=Vector3.down*9.81f;Physics.defaultContactOffset=.001f;
            File.WriteAllText(Path.Combine(output,"fixture-used.json"),JsonUtility.ToJson(fixture,true));
            int failures=0;var controls=new List<string>();
            using(var sim=new ShotSimulation(true,StationLayout.Load(),BallProfile.Phase2Default))
            {
                sim.SetCup(fixture.cup,fixture.cupRadius);
                for(int i=0;i<fixture.phases.Length;i++)
                {
                    var capture=new CupCapture{Base=fixture.cup,InnerRadius=fixture.cupRadius,BallRadius=sim.Ball.Profile.radius_m};capture.Reset(fixture.origin);
                    var contacts=new List<string>();var trace=new List<string>{"seconds,x,y,z,vx,vy,vz,captured,floor_overlap,depth,normal_x,normal_y,normal_z,base_ray_y"};
                    var report=new List<string>();int overlaps=0;float maximum=0;bool first=true;
                    var ballCollider=sim.Ball.GetComponent<SphereCollider>();
                    Collider cupFloor=null;
                    foreach(var c in sim.Root.GetComponentsInChildren<Collider>())if(c.name=="Round cup base")cupFloor=c;
                    if(!cupFloor)throw new Exception("Missing cup floor");
                    report.Add("Cup floor bounds: "+cupFloor.bounds);report.Add("Convex: "+((MeshCollider)cupFloor).convex);
                    Action<ContactSample> hit=q=>contacts.Add(JsonUtility.ToJson(q));sim.Ball.Contact+=hit;
                    sim.Run(fixture.origin,fixture.velocity,fixture.spin,18,sample:b=>
                    {
                        var p=b.Body.position;var v=b.Velocity;capture.Step(p,v,BallBody.Step);
                        bool overlap=Physics.ComputePenetration(ballCollider,p,Quaternion.identity,cupFloor,cupFloor.transform.position,cupFloor.transform.rotation,out var normal,out float depth);
                        if(!overlap){normal=Vector3.zero;depth=0;}
                        maximum=Mathf.Max(maximum,depth);
                        if(overlap&&depth>.00005f)
                        {
                            overlaps++;
                            if(first){report.Add(FormattableString.Invariant($"First penetration: t={b.Clock:R} center={p:F8} v={v:F8} depth={depth:R} normal={normal:F8}"));first=false;}
                        }
                        float floorRayY=float.NaN;
                        if(cupFloor.Raycast(new Ray(p+Vector3.up*.2f,Vector3.down),out var ray,.4f))floorRayY=ray.point.y;
                        trace.Add(FormattableString.Invariant($"{b.Clock:R},{p.x:R},{p.y:R},{p.z:R},{v.x:R},{v.y:R},{v.z:R},{capture.Captured},{overlap},{depth:R},{normal.x:R},{normal.y:R},{normal.z:R},{floorRayY:R}"));
                    },startWorldTime:fixture.phases[i]);
                    sim.Ball.Contact-=hit;
                    bool passed=capture.Captured&&overlaps==0&&sim.Ball.ContactBudgetExhaustions==0;
                    if(!passed)failures++;
                    report.Add(FormattableString.Invariant($"{(passed?"PASS":"FAIL")} phase={fixture.phases[i]:R}; captured={capture.Captured}; penetratingSamples={overlaps}; toleranceM=0.00005; maxDepthM={maximum:R}; recoveries={sim.Ball.StaticOverlapRecoveries}; recoveryDepthM={sim.Ball.MaximumStaticOverlapDepth:R}; budgets={sim.Ball.ContactBudgetExhaustions}"));
                    File.WriteAllLines(Path.Combine(output,i+"-trace.csv"),trace);File.WriteAllLines(Path.Combine(output,i+"-contacts.jsonl"),contacts);File.WriteAllLines(Path.Combine(output,i+"-report.txt"),report);
                    Debug.Log(string.Join("\n",report));
                }
                // A separating sphere must not receive a spurious collision
                // impulse when numerical overlap alone is being corrected.
                foreach(bool separating in new[]{true,false})
                {
                    var p=fixture.cup+Vector3.up*(CupCapture.Floor+sim.Ball.Profile.radius_m-.000004f);
                    var spin=separating?Vector3.right*30:Vector3.zero;int contacts=0;
                    Action<ContactSample> hit=q=>contacts++;sim.Ball.Contact+=hit;
                    sim.Run(p,Vector3.up*(separating?2:-1),spin,BallBody.Step,startWorldTime:0);sim.Ball.Contact-=hit;
                    bool passed=sim.Ball.StaticOverlapRecoveries>0&&sim.Ball.MaximumStaticOverlapDepth<.00005f&&sim.Ball.ContactBudgetExhaustions==0&&
                        (separating?contacts==0&&Mathf.Abs(sim.Ball.Velocity.y-1.9455f)<.001f&&Vector3.Distance(sim.Ball.AngularVelocity,spin)<1e-5f:
                        contacts==1&&Mathf.Abs(sim.Ball.Velocity.y-.1855f)<.001f);
                    if(!passed)failures++;
                    controls.Add(FormattableString.Invariant($"{(passed?"PASS":"FAIL")} {(separating?"Separating overlap has no impulse":"Approaching overlap uses ceramic response")}: contacts={contacts}, vy={sim.Ball.Velocity.y:R}, recoveries={sim.Ball.StaticOverlapRecoveries}, depth={sim.Ball.MaximumStaticOverlapDepth:R}"));
                }
            }
            File.WriteAllLines(Path.Combine(output,"overlap-controls.txt"),controls);
            if(verify&&failures>0)throw new Exception(failures+" cup overlap regressions failed");
        }
    }
}
