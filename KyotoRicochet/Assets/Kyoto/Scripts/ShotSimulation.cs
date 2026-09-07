using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    public struct PoseSample
    {
        public Vector3 position;
        public Quaternion rotation;
        public float time;
        public PoseSample(Vector3 p,Quaternion r,float t){position=p;rotation=r;time=t;}
    }
    public class ShotSimulation : IDisposable
    {
        public readonly Scene Scene;
        public readonly PhysicsScene Physics;
        public readonly BallBody Ball;
        public readonly Transform Root;
        GameObject cup;
        public ShotSimulation(bool station=true,StationLayout layout=null,BallProfile profile=null)
        {
            Scene=SceneManager.CreateScene("Prediction "+Guid.NewGuid(),new CreateSceneParameters(LocalPhysicsMode.Physics3D));
            Physics=Scene.GetPhysicsScene();
            var root=new GameObject("Collision world");SceneManager.MoveGameObjectToScene(root,Scene);Root=root.transform;
            if(station){if(layout!=null)StationWorld.Create(Root,layout,true,false);else StationGeometry.Create(Root);}
            StationMotion.SetAnalyticOnly(Scene,true);
            var obj=new GameObject("Simulated rubber ball");SceneManager.MoveGameObjectToScene(obj,Scene);obj.transform.SetParent(Root,false);
            obj.AddComponent<SphereCollider>();obj.AddComponent<Rigidbody>();Ball=obj.AddComponent<BallBody>();
            Ball.Configure();Ball.Body.interpolation=RigidbodyInterpolation.None;
            if(profile!=null)Ball.SetProfile(profile);
            else if(layout!=null)Ball.SetProfile(BallProfile.Phase2Default);
        }
        public void SetCup(Vector3 position,float radius)
        {
            if(cup)UnityEngine.Object.DestroyImmediate(cup);
            cup=StationGeometry.CreateCup(Root,position,radius);
        }
        public void RemoveCup(){if(cup)UnityEngine.Object.DestroyImmediate(cup);cup=null;}
        public List<PoseSample> Run(Vector3 origin,Vector3 velocity,Vector3 spin,float duration=12,float step=BallBody.Step,Action<BallBody> sample=null,double startWorldTime=0)
        {
            StationMotion.SetTime(Scene,startWorldTime);
            Ball.Launch(origin,velocity,spin);
            UnityEngine.Physics.SyncTransforms();
            var poses=new List<PoseSample>();
            float sleepingTime=0;
            for(int i=0;i<Mathf.CeilToInt(duration/step);i++)
            {
                Ball.BeforeStep(step);
                if(i%3==0)poses.Add(new PoseSample(Ball.Body.position,Ball.Body.rotation,(i+1)*step));
                sample?.Invoke(Ball);
                sleepingTime=Ball.Sleeping?sleepingTime+step:0;
                if(Ball.Body.position.y < -2 || sleepingTime>.8f)break;
            }
            return poses;
        }
        public void Dispose()
        {
            if(Application.isPlaying)SceneManager.UnloadSceneAsync(Scene);
            else
            {
#if UNITY_EDITOR
                UnityEditor.SceneManagement.EditorSceneManager.CloseScene(Scene,true);
#endif
            }
        }
    }
}
