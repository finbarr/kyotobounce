using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    public struct MovingContact
    {
        public float time;
        public Vector3 point,normal,velocity;
        public Collider collider;
        public Surface surface;
    }
    // Explicit scene clock. Prediction scenes have their own clock; visual and
    // collision copies in one scene always share it. No wall-clock dependence.
    public static class StationMotion
    {
        sealed class World {public double time;public bool animate=true;public readonly List<MovingEscalator> lanes=new List<MovingEscalator>();}
        static readonly Dictionary<int,World> worlds=new Dictionary<int,World>();
        public static void Register(MovingEscalator lane)
        {
            int id=lane.gameObject.scene.handle;
            if(!worlds.TryGetValue(id,out var world)){world=new World();worlds.Add(id,world);}
            if(!world.lanes.Contains(lane))world.lanes.Add(lane);lane.SetTime(world.time);
        }
        public static void Remove(MovingEscalator lane)
        {
            int id=lane.gameObject.scene.handle;
            if(worlds.TryGetValue(id,out var world)){world.lanes.Remove(lane);if(world.lanes.Count==0)worlds.Remove(id);}
        }
        public static double Time(Scene scene)=>worlds.TryGetValue(scene.handle,out var world)?world.time:0;
        public static bool Active(Scene scene)=>worlds.TryGetValue(scene.handle,out var world)&&world.lanes.Count>0;
        public static void SetTime(Scene scene,double time)
        {
            if(!worlds.TryGetValue(scene.handle,out var world))return;
            world.time=time;foreach(var lane in world.lanes)if(lane)lane.SetTime(time);
        }
        // Switch between private browser timelines without moving shared geometry.
        // BallBody still advances its clock exactly once for its own solver step.
        public static void SetAnalyticTime(Scene scene,double time)
        {
            if(!worlds.TryGetValue(scene.handle,out var world))return;
            if(world.animate)throw new System.InvalidOperationException("Private clocks require analytic station motion");
            world.time=time;
        }
        public static void SetAnalyticOnly(Scene scene,bool analyticOnly)
        {if(worlds.TryGetValue(scene.handle,out var world))world.animate=!analyticOnly;}
        public static bool UpdatesGeometry(Scene scene)=>worlds.TryGetValue(scene.handle,out var world)&&world.animate;
        public static void Advance(Scene scene,float dt)
        {
            if(!worlds.TryGetValue(scene.handle,out var world))return;
            world.time+=dt;if(world.animate)foreach(var lane in world.lanes)if(lane)lane.SetTime(world.time);
        }
        public static bool Probe(Scene scene,Vector3 p,Vector3 displacement,float radius,out MovingContact hit)
        {
            hit=default;hit.time=1;bool found=false;
            if(!worlds.TryGetValue(scene.handle,out var world))return false;
            foreach(var lane in world.lanes)if(lane&&lane.collision&&lane.Sweep(p,displacement,radius,world.time,1,out var candidate,true)
                &&(!found||candidate.time<hit.time)){hit=candidate;found=true;}
            return found;
        }
        public static bool Near(Scene scene,Vector3 p,float radius)
        {
            if(!worlds.TryGetValue(scene.handle,out var world))return false;
            foreach(var lane in world.lanes)if(lane&&lane.collision&&lane.Near(p,radius))return true;return false;
        }
        public static Vector3 WalkingVelocity(Scene scene,Vector3 feet)
        {
            if(!worlds.TryGetValue(scene.handle,out var world))return Vector3.zero;
            foreach(var lane in world.lanes)if(lane&&lane.collision&&lane.WalkingVelocity(feet,out var velocity))return velocity;
            return Vector3.zero;
        }
        public static bool Sweep(Scene scene,Vector3 p,Vector3 displacement,float radius,double time,float duration,out MovingContact hit)
        {
            hit=default;hit.time=duration;bool found=false;
            if(!worlds.TryGetValue(scene.handle,out var world))return false;
            foreach(var lane in world.lanes)if(lane&&lane.collision&&lane.Sweep(p,displacement,radius,time,duration,out var candidate)
                &&(!found||candidate.time<hit.time)){hit=candidate;found=true;}
            return found;
        }
    }
}
