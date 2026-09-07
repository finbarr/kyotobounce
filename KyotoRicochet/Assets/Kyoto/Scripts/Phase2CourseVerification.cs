#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto
{
    public sealed class Phase2CourseVerification:MonoBehaviour
    {
        static readonly List<string> report=new List<string>();static int failures;
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Install()
        {
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-phase2-courses"))new GameObject("Course verification").AddComponent<Phase2CourseVerification>();
        }
        IEnumerator Start()
        {
            yield return null;string output=null;
            foreach(var a in Environment.GetCommandLineArgs())if(a.StartsWith("--kyoto-evidence="))output=a.Substring("--kyoto-evidence=".Length);
            try
            {
                if(string.IsNullOrEmpty(output))throw new Exception("Explicit evidence directory required");
                Run(FindFirstObjectByType<GameController>(),output);Application.Quit(0);
            }
            catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        static void Check(bool ok,string label,string detail="")
        {var line=(ok?"PASS ":"FAIL ")+label+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failures++;}
        static void Fly(GameController game,List<PoseSample> poses=null,List<string> trace=null,bool camera=false)
        {
            int frames=0;
            while(game.Phase==GamePhase.Flight&&frames++<Mathf.CeilToInt(18/BallBody.Step)+2)
            {
                game.SendMessage("FixedUpdate");
                if(camera)game.GetComponent<FlightCamera>().SendMessage("LateUpdate");
                var body=game.Ball.Body;poses?.Add(new PoseSample(body.position,body.rotation,game.FlightTime));
                if(trace!=null){var p=body.position;var q=body.rotation;trace.Add(FormattableString.Invariant($"{game.FlightTime:R},{game.ShotWorldTime+game.FlightTime:R},{p.x:R},{p.y:R},{p.z:R},{q.x:R},{q.y:R},{q.z:R},{q.w:R},{game.Phase},{game.Score.Bounces},{game.Score.Unique}"));}
            }
        }
        static void Ready(GameController game,int index)
        {game.LoadLevel(index);game.Coach(false);StationMotion.SetTime(game.gameObject.scene,game.Level.witnessWorldTime);Physics.SyncTransforms();}
        public static void Run(GameController game,string output)
        {
            Directory.CreateDirectory(output);report.Clear();failures=0;
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; CPU={SystemInfo.processorType}");
            if(!game||!game.HasAuthoredCourse)throw new Exception("Saved scene lacks eight current-layout challenges");
            report.Add("layout_sha256="+game.LayoutSha256);report.Add("Programmatic game/control-method integration; native keyboard/mouse focus and continuous recorded walkthrough are separate gates.");
            game.BeginVerification();game.enabled=false;game.GetComponent<FlightCamera>().enabled=false;game.Guide=false;game.StartChallenges();
            int expectedBanked=0;
            try
            {
                Check(game.InChallenge&&game.Index==0,"Challenge mode starts at route one");
                for(int index=0;index<8;index++)
                {
                    Ready(game,index);var c=game.Level;int attempts=game.Attempts;
                    game.Walker.Place(c.launchFeet+Vector3.right*(c.launchRadius+.20f));game.Throw();
                    Check(game.Phase==GamePhase.Aim&&game.Attempts==attempts,c.id+" rejects walking outside launch area");
                    Ready(game,index);game.Yaw=c.aimYaw+180;game.Throw();
                    Check(game.Phase==GamePhase.Aim&&game.Attempts==attempts,c.id+" rejects bypassing launch direction");
                    if(index>=1&&index<=3)
                    {
                        Ready(game,index);game.Spin=game.SideSpin=game.VerticalSpin=0;game.Throw();Fly(game);
                        Check(game.Phase!=GamePhase.Success,c.id+" no-spin control misses the lesson cup");
                    }
                    List<PoseSample> baseline=null;
                    foreach(var mode in new[]{ViewMode.Observer,ViewMode.Ride,ViewMode.Tumble})
                    {
                        Ready(game,index);game.SetMode(mode);var feet=game.Walker.transform.position;
                        var poses=new List<PoseSample>();var trace=new List<string>{"seconds,station_seconds,x,y,z,qx,qy,qz,qw,phase,bounces,surfaces"};
                        game.Throw();
                        Check(game.Phase==GamePhase.Flight&&Vector3.Distance(game.ShotOrigin,c.origin)<.0002f,c.id+" "+mode+" launches from actual hand",$"hand_error_m={Vector3.Distance(game.ShotOrigin,c.origin):R}");
                        Fly(game,poses,trace,true);
                        Check(game.Phase==GamePhase.Success&&game.Ball.ContactBudgetExhaustions==0,c.id+" "+mode+" physically settles and scores",$"phase={game.Phase}; time={game.FlightTime:R}; bounces={game.Score.Bounces}; surfaces={game.Score.Unique}; points={game.Score.Points}; overlap_recoveries={game.Ball.StaticOverlapRecoveries}");
                        File.WriteAllLines(Path.Combine(output,c.id+"-"+mode+".csv"),trace);
                        if(baseline==null){baseline=poses;expectedBanked+=game.Score.Points;}
                        else
                        {
                            float position=0,angle=0;
                            for(int j=0;j<Mathf.Min(poses.Count,baseline.Count);j++){position=Mathf.Max(position,Vector3.Distance(poses[j].position,baseline[j].position));angle=Mathf.Max(angle,Quaternion.Angle(poses[j].rotation,baseline[j].rotation));}
                            Check(poses.Count==baseline.Count&&position<=.001f&&angle<=.1f,c.id+" "+mode+" cannot alter ball motion",$"samples={poses.Count}; position_m={position:R}; angle_deg={angle:R}");
                        }
                        if(mode==ViewMode.Observer&&game.Phase==GamePhase.Success)
                        {
                            int banked=game.Banked;double station=StationMotion.Time(game.gameObject.scene);
                            game.Replay();game.SendMessage("Update");
                            Check(game.Phase==GamePhase.Replay&&game.Banked==banked,c.id+" replay awards no extra points");
                            game.Retry();
                            Check(game.Banked==banked&&Math.Abs(StationMotion.Time(game.gameObject.scene)-station)<1e-6&&Vector3.Distance(feet,game.Walker.transform.position)<1e-5f,c.id+" retry restores phase and walking position without banking again");
                        }
                    }
                    game.Next();
                    Check(index==7?game.Phase==GamePhase.Complete:game.Phase==GamePhase.Aim&&game.Index==index+1,c.id+" advances progression");
                }
                Check(game.Phase==GamePhase.Complete&&game.Banked==expectedBanked,"All eight routes complete; repeated solutions cannot farm banked points",$"banked={game.Banked}; expected={expectedBanked}");
                ScoreControls();
                var lastFeet=game.Walker.transform.position;game.Explore();
                Check(game.FreeExploration&&game.Phase==GamePhase.Aim&&Vector3.Distance(lastFeet,game.Walker.transform.position)<1e-5f,"Free exploration remains available and preserves location after the course");
            }
            finally{File.WriteAllLines(Path.Combine(output,"verification.txt"),report);}
            if(failures>0)throw new Exception(failures+" game course checks failed");
        }
        static void ScoreControls()
        {
            var go=new GameObject("Score control");var surface=go.AddComponent<Surface>();var score=new ShotScore();
            surface.surfaceId="first";score.Register(surface,1,0);int points=score.Points;score.Register(surface,1,.02f);
            Check(score.Bounces==1&&score.Points==points,"Seam chatter cannot manufacture impacts");
            surface.surfaceId="second";score.Register(surface,1,.03f);
            Check(score.Unique==2&&score.Points>points,"A distinct physical surface earns an additional bonus");
            points=score.Points;surface.scores=false;surface.surfaceId="cup";score.Register(surface,3,.2f);
            Check(score.Points==points,"Cup walls never earn bank-shot bonuses");
            surface.scores=true;surface.surfaceId="east-skyway-escalator-1-skirt-1";score.Register(surface,3,.3f);
            Check(!score.HasSurface("east-skyway-escalator-1"),"Static escalator casing cannot satisfy moving-tread contact");
            UnityEngine.Object.DestroyImmediate(go);
        }
    }
}
#endif
