#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto
{
    public static class MovingLiftVerification
    {
        [Serializable] sealed class Sample {public double time;public LiftPose pose;}
        [Serializable] sealed class Evidence {public bool pass;public string[] checks;public Sample[] samples;}
        static readonly List<string> checks=new List<string>();
        static void Check(bool condition,string name){if(!condition)throw new Exception(name);checks.Add(name);Debug.Log("PASS LIFT "+name);}
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            string specPath=null,output=null;bool requested=false;
            foreach(var a in Environment.GetCommandLineArgs()){if(a=="--kyoto-lifts")requested=true;if(a.StartsWith("--kyoto-lift-spec="))specPath=a.Substring(18);if(a.StartsWith("--kyoto-evidence="))output=a.Substring(17);}
            if(!requested)return;
            foreach(var worker in UnityEngine.Object.FindObjectsByType<BrowserPhysicsWorker>(FindObjectsSortMode.None))worker.enabled=false;
            try{Run(specPath,output);Application.Quit(0);}catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        public static void Run(string specPath,string output)
        {
            var spec=JsonUtility.FromJson<StationLayout.Lift>(File.ReadAllText(specPath));spec.origin=Vector3.zero;checks.Clear();Directory.CreateDirectory(output);
            var samples=new List<Sample>();
            using(var sim=new ShotSimulation(false))
            {
                var lift=MovingLift.Create(sim.Root,spec,Surface.Material("Lift test",.64f,.2f),true,false);
                lift.state=new LiftState{id=spec.id,from=0,to=1,startTime=0};
                for(int i=0;i<=240;i++){
                    double t=i/240.0*(lift.TotalSeconds+1);var pose=lift.Pose(t,out _);samples.Add(new Sample{time=t,pose=pose});
                    if(pose.moving&&Math.Max(pose.lowerDoor,Math.Max(pose.upperDoor,pose.carDoor))>1e-6)throw new Exception("Door open between floors");
                }
                Check(samples[0].pose.lowerDoor==1&&samples[0].pose.upperDoor==0&&samples[240].pose.upperDoor==1&&samples[240].pose.lowerDoor==0,"Doors open only at the occupied landing");
                bool hit=lift.Sweep(new Vector3(0,6,spec.doorZ-1),new Vector3(0,0,2),.023f,0,.02f,out var contact);
                Check(hit&&contact.surface.surfaceId.Contains("upper-door")&&contact.normal.z<-.99f,"Closed empty landing stops a fast ball");
                Check(Mathf.Abs(contact.time-.00987f)<.00002f,"Door CCD finds the front surface at the expected time");
                double start=spec.waitSeconds+spec.doorSeconds+2;
                StationMotion.SetTime(sim.Scene,start);float floor=lift.Pose(start,out _).height;
                sim.Ball.Launch(new Vector3(0,floor+.25f,0),Vector3.down,Vector3.zero);
                int moving=0;bool settled=false;
                for(int i=0;i<3000;i++){
                    sim.Ball.BeforeStep(BallBody.Step);var pose=lift.Pose(StationMotion.Time(sim.Scene),out _);
                    if(sim.Ball.Body.position.y-sim.Ball.Profile.radius_m<pose.height-.006f)throw new Exception("Ball passed through rising car floor");
                    if(pose.moving){moving++;if(sim.Ball.Sleeping)throw new Exception("Moving ball finished on a moving car");}
                    else if(sim.Ball.Sleeping){settled=true;break;}
                }
                Check(moving>300&&settled,"Ball rides the car and settles only after it stops");
                start=StationMotion.Time(sim.Scene);lift.state=new LiftState{id=spec.id,from=1,to=0,startTime=start-spec.waitSeconds-spec.doorSeconds-2};
                floor=lift.Pose(start,out _).height;sim.Ball.Launch(new Vector3(0,floor+.2f,0),Vector3.down,Vector3.right*20);moving=0;settled=false;
                for(int i=0;i<3000;i++){
                    sim.Ball.BeforeStep(BallBody.Step);var pose=lift.Pose(StationMotion.Time(sim.Scene),out _);
                    if(sim.Ball.Body.position.y-sim.Ball.Profile.radius_m<pose.height-.006f)throw new Exception("Ball passed through descending car floor");
                    if(pose.moving){moving++;if(sim.Ball.Sleeping)throw new Exception("Moving ball finished on a descending car");}
                    else if(sim.Ball.Sleeping){settled=true;break;}
                }
                Check(moving>300&&settled,"Spinning ball rides the descending car and reaches full rest after arrival");
            }
            // CharacterController walking queries use the default physics scene.
            var root=new GameObject("Lift walker fixture");var lane=MovingLift.Create(root.transform,spec,Surface.Material("Lift walking test",.64f,.2f),true,true);
            for(int floor=0;floor<2;floor++)StationGeometry.Box(root.transform,"landing "+floor,new Vector3(0,floor*spec.height-.1f,-2.3f),new Vector3(5,.2f,2.2f),Surface.Material("Landing",.7f,.4f),"landing "+floor,"LANDING");
            var walker=new GameObject("Lift walker").AddComponent<FirstPersonWalker>();walker.FallLimitY=-10;walker.Place(new Vector3(0,.03f,-2.4f));
            var scene=root.scene;StationMotion.SetAnalyticOnly(scene,true);StationMotion.SetTime(scene,0);Physics.SyncTransforms();
            void Step(float forward=0,float yaw=0){StationMotion.Advance(scene,BallBody.Step);walker.Move(new Vector2(0,forward),yaw,false,BallBody.Step);}
            for(int i=0;i<400&&walker.transform.position.z<-.1f;i++)Step(1);
            Check(walker.transform.position.z>-.15f&&walker.Grounded,"Walk from the lower landing into the car");
            Check(lane.Request(walker.transform.position,StationMotion.Time(scene),out _),"Inside button starts the upper-floor trip");
            var own=lane.state;int riding=0;
            for(int i=0;i<2400;i++){
                Step();double time=StationMotion.Time(scene);var pose=lane.Pose(time,out _);
                if(!walker.Grounded||Mathf.Abs(walker.transform.position.y-pose.height)>.06f)throw new Exception("Rider lost car floor at "+time+" "+walker.transform.position);
                if(pose.moving)riding++;
                if(i==700){
                    var other=new[]{new LiftState{id=spec.id}};StationMotion.UseLifts(scene,other);StationMotion.SetAnalyticTime(scene,0);
                    Check(lane.Pose(0,out _).height==0,"A second private session starts with its own lift");
                    StationMotion.UseLifts(scene,new[]{own});StationMotion.SetAnalyticTime(scene,time);
                    Check(Mathf.Abs(lane.Pose(time,out _).height-pose.height)<1e-6f,"Switching sessions preserves the first trip");
                }
                if(!lane.Busy(time))break;
            }
            Check(riding>1000&&walker.transform.position.y>4.99f,"Idle rider completes the upward trip grounded");
            for(int i=0;i<400&&walker.transform.position.z> -2.3f;i++)Step(1,180);
            Check(walker.transform.position.z< -2.2f&&Mathf.Abs(walker.transform.position.y-5)<.06f,"Walk out onto the upper landing");
            walker.Place(new Vector3(0,.03f,-2.3f));Step();
            Check(lane.Request(walker.transform.position,StationMotion.Time(scene),out _),"Lower call button recalls the upper car");
            for(int i=0;i<Mathf.CeilToInt(lane.TotalSeconds/BallBody.Step)+400;i++){
                Step(1);var pose=lane.Pose(StationMotion.Time(scene),out _);
                if(pose.height>.05f&&walker.transform.position.z>spec.doorZ-.20f)throw new Exception("Player entered the empty shaft");
                if(walker.transform.position.y<-.01f)throw new Exception("Player fell through the lower threshold");
            }
            Check(walker.Grounded&&walker.transform.position.z>-.2f,"Closed lower door protects the empty shaft until arrival");
            lane.state=new LiftState{id=spec.id,from=0,to=1,startTime=StationMotion.Time(scene)-spec.waitSeconds-.3};
            float held=lane.Pose(StationMotion.Time(scene),out _).carDoor;
            for(int i=0;i<180;i++){lane.HoldDoor(StationMotion.Time(scene),BallBody.Step,true);Step();}
            Check(lane.state.blocked&&Mathf.Abs(lane.Pose(StationMotion.Time(scene),out _).carDoor-held)<.0001f,"Obstructed doorway holds the doors without moving the car");
            UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(root);
            File.WriteAllText(Path.Combine(output,"native-lift.json"),JsonUtility.ToJson(new Evidence{pass=true,checks=checks.ToArray(),samples=samples.ToArray()},true));
        }
    }
}
#endif
