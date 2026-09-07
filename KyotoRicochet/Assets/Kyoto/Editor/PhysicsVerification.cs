using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class PhysicsVerification
    {
        static readonly List<string> results=new List<string>();
        static int failures;
        static void Check(bool pass,string name,string detail="")
        {string line=(pass?"PASS ":"FAIL ")+name+" "+detail;results.Add(line);Debug.Log(line);if(!pass)failures++;}
        public static void Run()
        {
            results.Clear();failures=0;Physics.gravity=Vector3.down*9.81f;Physics.bounceThreshold=.15f;Physics.defaultContactOffset=.001f;
            Check(Application.isPlaying,"Tests execute in Play mode","dedicated sphere solver and live Unity geometry queries");
            Drop();Spin();Convergence();Energy();ThinGeometry();CaptureRules();Scoring();Routes();
            Directory.CreateDirectory("../artifacts");File.WriteAllLines("../artifacts/physics-verification.txt",results);
            if(failures>0)throw new Exception(failures+" physics checks failed");
        }
        static ShotSimulation Slab(float restitution=.75f,float friction=.3f)
        {
            var sim=new ShotSimulation(false);StationGeometry.Box(sim.Root,"Test slab",new Vector3(0,-.25f,0),new Vector3(100,.5f,100),Surface.Material("Test",restitution,friction),"floor","FLOOR");return sim;
        }
        static void Drop()
        {
            foreach(float height in new[]{.5f,1f,2f})
            using(var sim=Slab())
            {
                bool hit=false;float peak=0;sim.Ball.Impact+=(s,p,v)=>hit=true;
                sim.Run(new Vector3(0,height+BallBody.Radius,0),Vector3.zero,Vector3.zero,1.8f,sample:b=>{if(hit)peak=Mathf.Max(peak,b.Body.position.y-BallBody.Radius);});
                float e=Mathf.Sqrt(peak/height);Check(Mathf.Abs(e-.75f)<.045f,"Drop restitution",$"height={height} effective_e={e:F5}");
            }
        }
        static Vector3 Bounce(float spin,float step=BallBody.Step)
        {
            using(var sim=Slab())
            {
                bool hit=false,saved=false;Vector3 result=Vector3.zero;
                sim.Ball.Impact+=(s,p,v)=>hit=true;
                sim.Run(new Vector3(0,.25f,0),new Vector3(4,-3,0),new Vector3(0,0,spin),.2f,step,b=>{if(hit&&!saved){result=new Vector3(b.Velocity.x,b.Velocity.y,b.AngularVelocity.z);saved=true;}});
                Check(saved,"Spin collision callback",$"incoming_spin={spin} outgoing={result:F5}");return result;
            }
        }
        static void Spin()
        {
            Vector3 back=Bounce(100),neutral=Bounce(0),top=Bounce(-100);
            Check(neutral.z < -1,"Oblique contact generates rotation",neutral.ToString("F5"));
            Check(top.x>back.x+.15f,"Spin changes rebound direction/speed",$"backspin_vx={back.x:F5} topspin_vx={top.x:F5}");
            Vector3 slow=Bounce(0,1f/90),fast=Bounce(0,1f/360);
            Check(Mathf.Abs(slow.x-fast.x)<.12f,"Impact velocity convergence 90 to 360 Hz",$"difference={Mathf.Abs(slow.x-fast.x):F5}m/s");
        }
        static void Energy()
        {
            using(var sim=Slab())
            {
                float inertia=.4f*BallBody.Mass*BallBody.Radius*BallBody.Radius;
                float initial=.5f*BallBody.Mass*(new Vector3(6,3,1)).sqrMagnitude+.5f*inertia*160*160+BallBody.Mass*9.81f*2;
                float maximum=initial;
                sim.Run(new Vector3(0,2,0),new Vector3(6,3,1),new Vector3(160,0,0),8,sample:b=>
                {float e=.5f*BallBody.Mass*b.Velocity.sqrMagnitude+.5f*inertia*b.AngularVelocity.sqrMagnitude+BallBody.Mass*9.81f*b.Body.position.y;maximum=Mathf.Max(maximum,e);});
                Check(maximum<=initial*1.01f,"Passive total energy",$"initial={initial:F6} max={maximum:F6}");
                Check(sim.Ball.ContactBudgetExhaustions==0,"Contact budget holds through settling",sim.Ball.ContactBudgetExhaustions.ToString());
            }
        }
        static void Convergence()
        {
            Vector3[] positions=new Vector3[3];int index=0;
            foreach(float step in new[]{1f/90,1f/180,1f/360})
            using(var sim=Slab())
            {
                sim.Run(new Vector3(0,.25f,0),new Vector3(4,-3,0),new Vector3(0,0,-100),.5f,step);
                positions[index++]=sim.Ball.Body.position;
            }
            float error=Vector3.Distance(positions[0],positions[2]);
            Check(error<.005f,"Oblique flight position convergence 90 to 360 Hz",$"error={error:F6}m");
            using(var sim=Slab())
            {
                sim.Run(new Vector3(0,.2f,0),new Vector3(2,0,0),Vector3.zero,18);
                Check(sim.Ball.Sleeping,"Rolling friction brings the ball to rest",$"v={sim.Ball.Velocity:F6} spin={sim.Ball.AngularVelocity:F6}");
            }
        }
        static void ThinGeometry()
        {
            foreach(float speed in new[]{8f,16f})
            using(var sim=new ShotSimulation(false))
            {
                StationGeometry.Box(sim.Root,"Thin rail",new Vector3(0,1,0),new Vector3(.03f,3,8),Surface.Material("Rail",.6f,.2f),"rail","RAIL");
                bool hit=false;float maxX=-10;sim.Ball.Impact+=(s,p,v)=>hit=true;
                sim.Run(new Vector3(-.7f,1,0),new Vector3(speed,0,0),new Vector3(0,100,0),.3f,sample:b=>maxX=Mathf.Max(maxX,b.Body.position.x));
                Check(hit&&maxX<.03f,"Fast thin-surface collision",$"speed={speed} furthest_x={maxX:F5}");
            }
        }
        static void CaptureRules()
        {
            var capture=new CupCapture{Base=Vector3.zero,InnerRadius=.10f};capture.Reset(new Vector3(0,.3f,0));
            capture.Step(new Vector3(0,.1f,0),Vector3.down,.01f);
            int awards=0;for(int i=0;i<200;i++)if(capture.Step(new Vector3(0,.04f,0),Vector3.zero,.01f))awards++;
            Check(awards==1,"Cup capture awards exactly once");
            capture.Reset(new Vector3(.2f,.1f,0));for(int i=0;i<200;i++)capture.Step(new Vector3(0,.04f,0),Vector3.zero,.01f);
            Check(!capture.Captured,"Sideways interior overlap cannot score");
            capture.Reset(new Vector3(0,.3f,0));capture.Step(new Vector3(0,.1f,0),Vector3.down,.01f);capture.Step(new Vector3(.12f,.2f,0),Vector3.up,.01f);
            for(int i=0;i<200;i++)capture.Step(new Vector3(.2f,.04f,0),Vector3.zero,.01f);
            Check(!capture.Captured,"Rim-out cannot score");
            using(var sim=new ShotSimulation(false))
            {
                sim.SetCup(Vector3.zero,.10f);var physical=new CupCapture{Base=Vector3.zero,InnerRadius=.10f};physical.Reset(new Vector3(0,.6f,0));
                sim.Run(new Vector3(0,.6f,0),Vector3.zero,Vector3.zero,4,sample:b=>physical.Step(b.Body.position,b.Velocity,BallBody.Step));
                Check(physical.Captured,"Physical hollow cup captures a falling ball",sim.Ball.Body.position.ToString("F5"));
            }
        }
        static void Scoring()
        {
            var obj=new GameObject("Score surface");var s=obj.AddComponent<Surface>();var score=new ShotScore();
            s.surfaceId="floor";score.Register(s,2,0);score.Register(s,2,.01f);score.Register(s,.1f,1);
            Check(score.Bounces==1,"Duplicate and micro impacts filtered");
            for(int i=1;i<8;i++)score.Register(s,2,i);
            Check(score.Bounces==3&&score.Unique==1,"Repeated surface bonus capped");
            score.Clear();for(int i=0;i<3;i++){s.surfaceId="surface"+i;score.Register(s,2,i);}
            Check(score.Points==425,"Three-surface score equals 425");
            s.scores=false;score.Register(s,5,10);Check(score.Bounces==3,"Cup excluded from surface score");UnityEngine.Object.DestroyImmediate(obj);
        }
        static void Routes()
        {
            var course=AssetDatabase.LoadAssetAtPath<Course>("Assets/Kyoto/Course.asset");
            Check(course&&course.challenges!=null&&course.challenges.Length==5,"Five authored challenges");
            if(!course||course.challenges==null)return;
            using(var sim=new ShotSimulation())
            foreach(var c in course.challenges)
            {
                sim.SetCup(c.cup,c.cupRadius);Vector3 first=Vector3.zero;
                for(int attempt=0;attempt<2;attempt++)
                {
                    var score=new ShotScore();Action<Surface,Vector3,float> hit=(s,p,v)=>score.Register(s,v,sim.Ball.Clock);sim.Ball.Impact+=hit;
                    var capture=new CupCapture{Base=c.cup,InnerRadius=c.cupRadius};capture.Reset(c.origin);
                    sim.Run(c.origin,c.witnessVelocity,c.witnessSpin,18,sample:b=>capture.Step(b.Body.position,b.Velocity,BallBody.Step));
                    sim.Ball.Impact-=hit;
                    Check(capture.Captured&&score.Bounces>=c.requiredBounces&&score.Unique>=c.requiredSurfaces,"Witness "+c.title,$"attempt={attempt+1} capture={capture.Captured} bounces={score.Bounces} surfaces={score.Unique}");
                    Check(sim.Ball.ContactBudgetExhaustions==0,"Route contact budget",sim.Ball.ContactBudgetExhaustions.ToString());
                    if(attempt==0)first=sim.Ball.Body.position;else Check(Vector3.Distance(first,sim.Ball.Body.position)<.001f,"Repeated throw agrees",$"error={Vector3.Distance(first,sim.Ball.Body.position):F6}");
                }
            }
        }
    }
}
