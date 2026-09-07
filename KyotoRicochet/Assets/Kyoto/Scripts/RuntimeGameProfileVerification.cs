#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEngine;

namespace Kyoto
{
    public static class GameProfileVerification
    {
        static readonly List<string> report=new List<string>();static int failed;
        static void Check(bool ok,string name,string detail="")
        {string line=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
        static T Field<T>(object obj,string name)=>(T)obj.GetType().GetField(name,BindingFlags.NonPublic|BindingFlags.Instance).GetValue(obj);
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            var args=Environment.GetCommandLineArgs();
            if(!Array.Exists(args,a=>a=="--kyoto-game-profile"))return;
            string output=null;
            foreach(var a in args)if(a.StartsWith("--kyoto-evidence="))output=a.Substring("--kyoto-evidence=".Length);
            try
            {
                if(string.IsNullOrEmpty(output))throw new ArgumentException("An explicit evidence path is required.");
                Run(output);Application.Quit(0);
            }
            catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        public static void Run(string output="../artifacts/phase2/selected-profile")
        {
            report.Clear();failed=0;
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; CPU={SystemInfo.processorType}");
            var game=UnityEngine.Object.FindFirstObjectByType<GameController>();
            if(!game||!game.phase2Layout)throw new Exception("Saved Phase 2 scene did not start.");
            var p=game.Ball.Profile;var prediction=Field<ShotSimulation>(game,"prediction");
            Check(p.id==BallProfile.Phase2Default.id&&Mathf.Abs(p.radius_m-.023f)<1e-7f&&Mathf.Abs(p.mass_kg-.0462f)<1e-7f,
                "Saved scene starts with selected 46 mm / 46.2 g specimen",p.id);
            Check(prediction.Ball.Profile.id==p.id&&prediction.Ball.Profile.Inertia==p.Inertia,"Actual gameplay preview owns the same physical profile");
            Check(Mathf.Abs(game.Ball.GetComponent<SphereCollider>().radius-p.radius_m)<1e-7f&&Vector3.Distance(game.Ball.Body.inertiaTensor,Vector3.one*p.Inertia)<1e-9f,"Live collider and Rigidbody use selected radius and inertia");
            var sphere=game.Ball.transform.Find("Striped rubber");
            Check(sphere&&Mathf.Abs(sphere.lossyScale.x-2*p.radius_m)<1e-7f,"Rendered ball diameter follows selected profile");
            Check(Field<CupCapture>(game,"capture").BallRadius==p.radius_m,"Actual cup rule receives selected radius");
            int referenceSurfaces=0,otherSurfaces=0;
            foreach(var surface in UnityEngine.Object.FindObjectsByType<Surface>(FindObjectsSortMode.None))
            {
                if(surface.gameObject.scene!=game.gameObject.scene)continue;
                if(surface.useBallReferenceResponse){referenceSurfaces++;Check(surface.surfaceId=="concourse","Only current granite concourse uses the reference pair",surface.surfaceId);}else otherSurfaces++;
            }
            Check(referenceSurfaces==1&&otherSurfaces>100,"Other station material pairs remain distinct",$"reference={referenceSurfaces}; other={otherSurfaces}");
            Lab(game);CupClearance(p);ReleaseClearance(p);
            game.Begin();game.Yaw=0;game.Pitch=0;game.Speed=1;game.Spin=-200;game.SideSpin=game.VerticalSpin=0;
            game.Throw();Check(game.Phase==GamePhase.Flight,"Selected profile launches through GameController.Throw");
            StationMotion.SetTime(prediction.Scene,game.ShotWorldTime);
            prediction.Ball.Launch(game.ShotOrigin,game.LaunchVelocity,game.LaunchSpin);
            float position=0,angle=0;ContactSample first=default;bool hit=false;
            game.Ball.Contact+=s=>{if(!hit){first=s;hit=true;}};Physics.SyncTransforms();
            for(int i=0;i<360;i++)
            {game.Ball.BeforeStep(BallBody.Step);prediction.Ball.BeforeStep(BallBody.Step);position=Mathf.Max(position,Vector3.Distance(game.Ball.Body.position,prediction.Ball.Body.position));angle=Mathf.Max(angle,Quaternion.Angle(game.Ball.Body.rotation,prediction.Ball.Body.rotation));}
            Check(position<.001f&&angle<.1f,"Saved-scene live and gameplay preview agree for two seconds",$"position={position:R}m; angle={angle:R}deg");
            Check(hit&&first.profileId==p.id&&first.surfaceId=="concourse"&&first.deformationAngularImpulse.magnitude>0,"Actual station impact uses reference granite pair",$"hit={hit}; surface={first.surfaceId}; out={first.outgoingVelocity:R}");
            Check(game.Ball.ContactBudgetExhaustions==0&&prediction.Ball.ContactBudgetExhaustions==0,"Profile migration does not exhaust contact budgets");
            Directory.CreateDirectory(output);MovingWorld(game,prediction,output);
            report.Add("Integration on the saved scene. Preset methods and Throw are called programmatically; no claim of mouse/keyboard input. Final course witnesses and all architectural gates remain separate.");
            Directory.CreateDirectory(output);File.WriteAllLines(Path.Combine(output,"game-integration.txt"),report);
            if(failed>0)throw new Exception(failed+" selected gameplay profile checks failed.");
        }
        static void MovingWorld(GameController game,ShotSimulation prediction,string output)
        {
            game.BeginVerification();game.Retry();game.Guide=false;
            var lane=game.Layout.escalators[0];
            Vector3 feet=lane.lowerCenter+lane.uphill*(lane.run*.4f)+Vector3.up*(lane.height*.4f+.03f);
            game.Walker.Place(feet);game.Yaw=Mathf.Atan2(lane.uphill.x,lane.uphill.z)*Mathf.Rad2Deg;
            game.Pitch=-35;game.Speed=2;game.Spin=-90;game.SideSpin=35;game.VerticalSpin=0;
            StationMotion.SetTime(game.gameObject.scene,5.123);Physics.SyncTransforms();game.Throw();
            Check(game.Phase==GamePhase.Flight&&Math.Abs(game.ShotWorldTime-5.123)<1e-9,"Gameplay throw records the current moving-world phase");
            StationMotion.SetTime(prediction.Scene,game.ShotWorldTime);prediction.Ball.Launch(game.ShotOrigin,game.LaunchVelocity,game.LaunchSpin);
            float position=0,angle=0;int samples=0;
            var trace=new List<string>{"sample,live_clock,prediction_clock,live_station,prediction_station,live_x,live_y,live_z,prediction_x,prediction_y,prediction_z,position_error_m,rotation_error_degrees,live_last_surface,prediction_last_surface"};
            var contacts=new List<string>();ContactSample lastLive=default,lastPredicted=default;int unclassified=0;
            Action<ContactSample> logLive=s=>{lastLive=s;if(s.surfaceId=="unclassified")unclassified++;contacts.Add("{\"world\":\"live\",\"sample\":"+(samples+1)+",\"contact\":"+JsonUtility.ToJson(s)+"}");};
            Action<ContactSample> logPredicted=s=>{lastPredicted=s;if(s.surfaceId=="unclassified")unclassified++;contacts.Add("{\"world\":\"prediction\",\"sample\":"+(samples+1)+",\"contact\":"+JsonUtility.ToJson(s)+"}");};
            game.Ball.Contact+=logLive;prediction.Ball.Contact+=logPredicted;
            while(game.Phase==GamePhase.Flight&&samples<3400)
            {
                game.SendMessage("FixedUpdate");prediction.Ball.BeforeStep(BallBody.Step);samples++;
                position=Mathf.Max(position,Vector3.Distance(game.Ball.Body.position,prediction.Ball.Body.position));
                angle=Mathf.Max(angle,Quaternion.Angle(game.Ball.Body.rotation,prediction.Ball.Body.rotation));
                var a=game.Ball.Body.position;var b=prediction.Ball.Body.position;
                trace.Add(FormattableString.Invariant($"{samples},{game.Ball.Clock:R},{prediction.Ball.Clock:R},{StationMotion.Time(game.gameObject.scene):R},{StationMotion.Time(prediction.Scene):R},{a.x:R},{a.y:R},{a.z:R},{b.x:R},{b.y:R},{b.z:R},{Vector3.Distance(a,b):R},{Quaternion.Angle(game.Ball.Body.rotation,prediction.Ball.Body.rotation):R},{lastLive.surfaceId},{lastPredicted.surfaceId}"));
            }
            game.Ball.Contact-=logLive;prediction.Ball.Contact-=logPredicted;
            File.WriteAllLines(Path.Combine(output,"moving-shot-trace.csv"),trace);
            File.WriteAllLines(Path.Combine(output,"moving-shot-contacts.jsonl"),contacts);
            Check(unclassified==0,"Moving shot contacts only classified physical surfaces",$"unclassified contacts={unclassified}");
            Check(samples>100&&game.Phase!=GamePhase.Flight&&position<.001f&&angle<.1f&&game.Score.Bounces>0,
                "Gameplay controller and preview agree through a moving-escalator shot",$"samples={samples}; position={position:R}m; rotation={angle:R}; bounces={game.Score.Bounces}; result={game.Phase}");
            var watch=System.Diagnostics.Stopwatch.StartNew();
            prediction.Run(game.ShotOrigin,game.LaunchVelocity,game.LaunchSpin,8,startWorldTime:game.ShotWorldTime);watch.Stop();
            report.Add($"DIAGNOSTIC eight-second full-station guide computation: {watch.Elapsed.TotalMilliseconds:F3}ms; single synchronous sample, not sustained frame-time acceptance.");
            double restore=StationMotion.Time(game.gameObject.scene);Vector3 positionBefore=game.Walker.transform.position;
            game.Replay();Check(game.Phase==GamePhase.Replay,"Recorded moving-world shot enters replay");
            typeof(GameController).GetField("replayTime",System.Reflection.BindingFlags.NonPublic|System.Reflection.BindingFlags.Instance).SetValue(game,.75f);
            game.SendMessage("Update");float at=Field<float>(game,"replayTime");
            Check(Math.Abs(StationMotion.Time(game.gameObject.scene)-(game.ShotWorldTime+Mathf.Min(at,game.FlightTime)))<1e-6,
                "Replay restores escalator phase alongside ball poses",$"station={StationMotion.Time(game.gameObject.scene):R}; shot={game.ShotWorldTime:R}; replay={at:R}");
            game.SendMessage("EndReplay");
            Check(Math.Abs(StationMotion.Time(game.gameObject.scene)-restore)<1e-9&&game.Walker.transform.position==positionBefore,
                "Leaving replay restores live station time and walking position");
            game.Retry();game.Walker.Place(feet);game.UIHasFocus=true;
            for(int i=0;i<30;i++){game.SendMessage("FixedUpdate");game.SendMessage("MoveWalker",BallBody.Step);}
            Vector3 start=game.Walker.transform.position;
            for(int i=0;i<180;i++){game.SendMessage("FixedUpdate");game.SendMessage("MoveWalker",BallBody.Step);}
            float carried=Vector3.Dot(game.Walker.transform.position-start,lane.uphill);
            Check(carried>.40f&&carried<.46f&&game.Walker.Grounded,"Standing transport continues while UI has focus",$"uphill travel={carried:R}m in 1s; grounded={game.Walker.Grounded}");
            game.UIHasFocus=false;
        }
        static void Lab(GameController game)
        {
            game.Begin();var feet=game.Walker.transform.position;var lab=game.GetComponent<PhysicsLab>();lab.Toggle();
            Check(lab.Ball.Profile.id==game.Ball.Profile.id,"Lab initially selects the gameplay specimen");
            var output=new Vector3[6];var lateral=new float[6];var returned=new bool[6];
            for(int i=0;i<6;i++)
            {
                lab.Preset(i);bool sampled=false;
                for(int n=0;n<360;n++)
                {
                    lab.SendMessage("FixedUpdate");
                    if(lab.ContactCount>0)
                    {
                        output[i]=lab.FirstContact.outgoingVelocity;
                        returned[i]|=lab.Ball.Body.position.z<lab.Release.z;
                        if(!sampled&&lab.Ball.Clock>=lab.FirstContact.time+.3f){lateral[i]=lab.Ball.Body.position.x-lab.Release.x;sampled=true;}
                    }
                }
                Check(lab.ContactCount>0,"Selected-profile lab preset "+i,$"firstOut={output[i]:R}; lateral@0.3s={lateral[i]:R}");
            }
            Check(returned[1]&&output[1].z<0&&!returned[0]&&output[0].z>0,"Selected rubber backspin returns with neutral control");
            Check(output[2].z>output[0].z,"Selected rubber topspin advances rebound");
            Check(lateral[3]<-.2f&&lateral[4]>.2f&&Mathf.Abs(lateral[3]+lateral[4])<.001f,"Selected rubber left/right kick clears 0.2 m per side and mirrors");
            Check(Vector3.Distance(output[0],output[5])<1e-5f,"Selected rubber vertical-spin negative control");
            lab.SelectReferenceProfile(false);Check(Mathf.Abs(lab.Ball.Profile.radius_m-.025f)<1e-7f,"Lab provisional comparison changes physical radius");
            lab.SelectReferenceProfile(true);Check(Mathf.Abs(lab.Ball.Profile.radius_m-.023f)<1e-7f,"Lab selection restores physical reference radius");
            lab.Toggle();Check(Vector3.Distance(feet,game.Walker.transform.position)<1e-7f&&game.enabled,"Lab exit preserves player location and resumes game");
        }
        static void CupClearance(BallProfile p)
        {
            // A center 76 mm from the axis fits a 100 mm cup with a 23 mm
            // sphere, but not the former 25 mm sphere. Exercise the real rule.
            bool Captures(float radius,float cupRadius=.1f)
            {
                var cup=new CupCapture {Base=Vector3.zero,InnerRadius=cupRadius,BallRadius=radius};
                cup.Reset(new Vector3(.076f,.20f,0));cup.Step(new Vector3(.076f,.16f,0),Vector3.down,.02f);
                for(int i=0;i<40;i++)cup.Step(new Vector3(.076f,CupCapture.Floor+radius,0),Vector3.zero,.02f);
                return cup.Captured;
            }
            Check(Captures(p.radius_m)&&!Captures(.025f),"Cup entry and settling distinguish selected radius from legacy radius");
            Check(!Captures(.04f,.03f),"A ball larger than the cup cannot score");
        }
        static void ReleaseClearance(BallProfile p)
        {
            var walker=new GameObject("Profile release probe").AddComponent<FirstPersonWalker>();walker.Place(new Vector3(2000,0,0));
            Vector3 desired=walker.Eye+new Vector3(.22f,-.15f,.42f);
            var wall=StationGeometry.Box(null,"Radius-sensitive release plane",desired+Vector3.right*.08f,new Vector3(.1f,1,2),Surface.Material("Test",0,0),"test","test");
            Physics.SyncTransforms();
            bool small=walker.TryRelease(0,0,out var smallRelease,p.radius_m);
            bool large=walker.TryRelease(0,0,out var largeRelease,.05f);
            Check(small&&Vector3.Distance(smallRelease,desired)<1e-5f,"Reference sphere can release beside a 30 mm clearance");
            Check(!large||Vector3.Distance(largeRelease,desired)>.01f,"Larger configured radius changes release clearance");
            UnityEngine.Object.DestroyImmediate(wall);UnityEngine.Object.DestroyImmediate(walker.gameObject);
        }
    }
}
#endif
