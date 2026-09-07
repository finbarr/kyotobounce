using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class BrowserMotionVerification
    {
        const BindingFlags Private=BindingFlags.Instance|BindingFlags.NonPublic;
        static readonly List<string> report=new List<string>();
        static int failed;
        static T Field<T>(object o,string name)=>(T)o.GetType().GetField(name,Private).GetValue(o);
        static void Check(bool ok,string name,string detail="")
        {string line=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
        public static void Run()
        {
            report.Clear();failed=0;Check(Application.isPlaying,"Real Unity collision queries in Play mode");
            Incline(30,0);Incline(10,1.5f);SlowGoal(false);SlowGoal(true);Cancellation();
            Directory.CreateDirectory("../artifacts/phase3/at-rest");
            File.WriteAllLines("../artifacts/phase3/at-rest/native-verification.txt",report);
            if(failed>0)throw new Exception(failed+" shot-at-rest checks failed.");
        }
        static void Begin(BrowserSession session,Vector3 position,Vector3 velocity,Vector3 spin)
        {
            session.Handle(new BrowserSession.Command{type="charge",id="fixture",request="rest-fixture"});
            var state=Field<BrowserSession.Snapshot>(session,"state");state.phase="Flight";state.launchPosition=position;
            Field<BallBody>(session,"ball").Launch(position,velocity,spin);
            typeof(BrowserSession).GetMethod("BeginRecording",Private).Invoke(session,null);Physics.SyncTransforms();
        }
        static void Incline(float degrees,float uphillSpeed)
        {
            var root=new GameObject("Incline regression");var material=Surface.Material("Stone",.76f,.24f);
            var floor=StationGeometry.Box(root.transform,"Floor",Vector3.down*.1f,new Vector3(500,.2f,500),material,"test-floor","FLOOR");
            floor.GetComponent<Surface>().useBallReferenceResponse=true;
            var rotation=Quaternion.Euler(-degrees,0,0);Vector3 normal=rotation*Vector3.up,uphill=rotation*Vector3.forward;
            var center=Vector3.up*(6*uphill.y-.1f*normal.y);
            var ramp=StationGeometry.Box(root.transform,"Incline",center,new Vector3(4,.2f,12),material,"test-incline","INCLINE");
            ramp.transform.rotation=rotation;ramp.GetComponent<Surface>().useBallReferenceResponse=true;
            int results=0;object result=null;
            var session=new BrowserSession(new StationLayout{spawn=new Vector3(10,0,0)},"fixture","fixture",o=>{if(o.GetType().Name=="ThrowResult"){result=o;results++;}});
            try
            {
                var state=Field<BrowserSession.Snapshot>(session,"state");var ball=Field<BallBody>(session,"ball");
                var start=center+uphill*2+normal*(.1f+ball.Profile.radius_m+.0002f);
                Begin(session,start,uphill*uphillSpeed,Vector3.Cross(normal,uphill*uphillSpeed)/ball.Profile.radius_m);
                // Cross the old deadline on the real ramp without waiting 30 wall seconds.
                typeof(BallBody).GetField("<Clock>k__BackingField",Private).SetValue(ball,29.8f);
                for(int i=0;i<54;i++)session.Step();
                Check(state.phase=="Flight"&&results==0,degrees+"° no result at the old 30-second deadline");
                Vector3 atDeadline=ball.Body.position;int poses=Field<ICollection>(session,"replayPoses").Count;
                for(int i=0;i<540;i++)session.Step();session.Publish();
                Check(ball.Body.position.y<atDeadline.y-.3f&&!ball.Sleeping,degrees+"° continues naturally downhill",ball.Body.position.ToString("F4"));
                Check(state.phase=="Flight"&&results==0&&state.diagnostics.simulating&&ball.Clock>33,degrees+"° shot remains live while moving");
                Check(Field<ICollection>(session,"replayPoses").Count>poses,degrees+"° replay records motion beyond 30 seconds");
                for(int i=0;i<180*120&&state.phase=="Flight";i++)session.Step();session.Publish();
                Check(state.phase=="Result"&&results==1&&ball.Sleeping&&ball.Velocity==Vector3.zero&&ball.AngularVelocity==Vector3.zero,degrees+"° one result only at full physical rest");
                Check(Mathf.Abs(ball.Body.position.y-ball.Profile.radius_m)<.004f&&ball.LastContactSurface=="test-floor",degrees+"° final position is the floor",ball.Body.position.ToString("F4"));
                Check(!state.diagnostics.simulating&&state.diagnostics.endReason=="Ball stopped outside the goal",degrees+"° diagnostics describe a stopped result");
                var stopped=ball.Body.position;var ended=ball.Clock;var saved=JsonUtility.ToJson(result);poses=Field<ICollection>(session,"replayPoses").Count;
                for(int i=0;i<180;i++)session.Step();
                Check(ball.Body.position==stopped&&ball.Clock==ended&&results==1&&JsonUtility.ToJson(result)==saved&&Field<ICollection>(session,"replayPoses").Count==poses,degrees+"° final ball and full replay remain stable");
                Check(ball.ContactBudgetExhaustions==0,degrees+"° no contact budget exhaustion");
                session.Handle(new BrowserSession.Command{type="recall",id="fixture"});session.Publish();
                Check(state.phase=="Aim"&&!state.diagnostics.simulating&&state.diagnostics.endReason=="",degrees+"° retry resets the shot");
            }
            finally{session.Dispose();UnityEngine.Object.DestroyImmediate(root);UnityEngine.Object.DestroyImmediate(material);}
        }
        static void SlowGoal(bool spinOnly)
        {
            var root=new GameObject("Goal rest regression");var material=Surface.Material("Floor",.76f,.24f);
            var floor=StationGeometry.Box(root.transform,"Floor",Vector3.down*.1f,new Vector3(100,.2f,100),material,"goal-floor","FLOOR").GetComponent<Surface>();
            floor.useBallReferenceResponse=true;floor.rollingResistance=0;floor.torsionalResistance=.00001f;
            int results=0;object result=null;
            var session=new BrowserSession(new StationLayout{spawn=new Vector3(10,0,0)},"fixture","fixture",o=>{if(o.GetType().Name=="ThrowResult"){results++;result=o;}});
            try
            {
                var ball=Field<BallBody>(session,"ball");var state=Field<BrowserSession.Snapshot>(session,"state");
                typeof(BrowserSession).GetField("activeChallenge",Private).SetValue(session,new BrowserChallenge{start=new BrowserDisk{center=new Vector3(10,0,0),radius=1,surface="goal-floor"},goal=new BrowserDisk{center=Vector3.zero,radius=.1f,surface="goal-floor"}});
                var speed=spinOnly?Vector3.zero:Vector3.right*.12f;
                Begin(session,Vector3.up*(ball.Profile.radius_m+.0002f),speed,spinOnly?Vector3.up*100:Vector3.Cross(Vector3.up,speed)/ball.Profile.radius_m);
                for(int i=0;i<270;i++)session.Step();
                Check(results==0&&state.phase=="Flight"&&!ball.Sleeping,spinOnly?"Rotation in place does not finish a goal":"Slow 0.12 m/s roll through goal does not finish early");
                Check(spinOnly?ball.AngularVelocity.magnitude>1:ball.Body.position.x>.1f,spinOnly?"Spin is still physically active":"Slow goal visitor exits before stopping");
                floor.rollingResistance=.012f;floor.torsionalResistance=.1f;
                for(int i=0;i<180*30&&state.phase=="Flight";i++)session.Step();
                Check(results==1&&ball.Sleeping&&state.phase=="Result",(spinOnly?"Spinning":"Rolling")+" goal fixture eventually finishes at rest");
                bool success=result!=null&&(bool)result.GetType().GetField("success").GetValue(result);
                Check(success==spinOnly,spinOnly?"Stopped ball inside goal succeeds":"Stopped ball outside goal is a miss, despite earlier visit");
            }
            finally{session.Dispose();UnityEngine.Object.DestroyImmediate(root);UnityEngine.Object.DestroyImmediate(material);}
        }
        static void Cancellation()
        {
            int results=0,notes=0;
            var session=new BrowserSession(new StationLayout{spawn=new Vector3(10,0,0)},"fixture","fixture",o=>{if(o.GetType().Name=="ThrowResult")results++;if(o.GetType().Name=="Notice")notes++;});
            try
            {
                Begin(session,Vector3.up*10,Vector3.zero,Vector3.zero);session.Step();
                Check(results==0&&Field<BrowserSession.Snapshot>(session,"state").phase=="Flight","Momentarily stationary airborne ball stays in play");
                session.Handle(new BrowserSession.Command{type="recall",id="fixture"});
                Check(results==0&&notes==1&&Field<BrowserSession.Snapshot>(session,"state").phase=="Aim","Recall cancels without a moving-ball result");
                Begin(session,Vector3.down*6,Vector3.down,Vector3.zero);session.Step();
                Check(results==0&&notes==2&&Field<BrowserSession.Snapshot>(session,"state").phase=="Aim","Lost ball cancels without a scored finish");
            }
            finally{session.Dispose();}
        }
    }
}
