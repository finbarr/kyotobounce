using System.Collections.Generic;
using UnityEngine;

namespace Kyoto
{
    public class ShotScore
    {
        readonly Dictionary<string, int> counts = new Dictionary<string, int>();
        readonly Dictionary<string, float> times = new Dictionary<string, float>();
        public int Bounces { get; private set; }
        public int Unique => counts.Count;
        public int Points => 100 + 25 * Bounces + 50 * Unique + 100 * Mathf.Max(0, Unique - 2);
        public string LastSurface { get; private set; } = "Ready";
        public bool HasSurface(string id)=>string.IsNullOrEmpty(id)||counts.ContainsKey(id);
        public bool HasPrefix(string prefix)
        {if(string.IsNullOrEmpty(prefix))return true;foreach(var id in counts.Keys)if(id.StartsWith(prefix,System.StringComparison.Ordinal))return true;return false;}
        public void Clear() { counts.Clear(); times.Clear(); Bounces = 0; LastSurface = "Ready"; }
        public bool Register(Surface surface, float speed, float time)
        {
            if (!surface || !surface.scores || speed < .35f || Bounces >= 12) return false;
            string id = surface.surfaceId;
            if (times.TryGetValue(id, out float last) && time - last < .08f) return false;
            counts.TryGetValue(id, out int count);
            if (count >= 3) return false;
            times[id] = time; counts[id] = count + 1; Bounces++;
            LastSurface = surface.displayName;
            return true;
        }
    }

    public static class ChallengeRules
    {
        public static bool Qualifies(Challenge c,ShotScore score)=>score.Bounces>=c.requiredBounces&&score.Unique>=c.requiredSurfaces&&score.HasSurface(c.requiredSurfaceId)&&score.HasPrefix(c.requiredSurfacePrefix);
        public static bool InLaunchArea(Challenge c,Vector3 feet)=>
            Vector2.Distance(new Vector2(feet.x,feet.z),new Vector2(c.launchFeet.x,c.launchFeet.z))<=c.launchRadius&&Mathf.Abs(feet.y-c.launchFeet.y)<.08f;
        public static bool InAimCone(Challenge c,float yaw)=>Mathf.Abs(Mathf.DeltaAngle(c.aimYaw,yaw))<=c.aimHalfAngle;
        public static float TimingPhase(Challenge c,double time)=>c.timingPeriod>0?(float)(time%c.timingPeriod+c.timingPeriod)%c.timingPeriod:0;
        public static bool InTimingWindow(Challenge c,double time)
        {
            if(c.timingPeriod<=0)return false;
            float phase=TimingPhase(c,time),start=Mathf.Repeat(c.timingWindowStart,c.timingPeriod),end=Mathf.Repeat(c.timingWindowEnd,c.timingPeriod);
            return start<=end?phase>=start&&phase<=end:phase>=start||phase<=end;
        }
    }

    // Geometry checks supplement physical cup colliders; an overlap never awards a goal.
    public class CupCapture
    {
        public Vector3 Base;
        public float InnerRadius;
        public float BallRadius=BallBody.Radius;
        public const float Height = .17f;
        public const float Floor = .012f;
        public const int WallSegments = 48;
        bool entered, captured;
        float dwell;
        Vector3 previous;
        public bool Captured => captured;
        public void Reset(Vector3 start) { previous = start; entered = captured = false; dwell = 0; }
        static bool InsideWalls(Vector3 local,float clearance,float squaredTolerance=0)
        {
            // The physical shell is a circumscribed polygon. Its sphere-center
            // interior is the intersection of the wall planes inset by radius,
            // not the smaller inscribed circle, which excludes valid corners.
            float step=2*Mathf.PI/WallSegments;
            float angle=Mathf.Round(Mathf.Atan2(local.x,local.z)/step)*step;
            float nearestPlane=local.x*Mathf.Sin(angle)+local.z*Mathf.Cos(angle);
            return nearestPlane*nearestPlane<=clearance*clearance+squaredTolerance;
        }
        public bool Step(Vector3 position, Vector3 velocity, float dt)
        {
            float mouth = Base.y + Height;
            float clearance = InnerRadius - BallRadius;
            if(clearance<=0){previous=position;entered=false;dwell=0;return false;}
            if (previous.y >= mouth && position.y < mouth && velocity.y < 0)
            {
                float t = (previous.y - mouth) / (previous.y - position.y);
                Vector3 p = Vector3.Lerp(previous, position, t) - Base;
                entered = InsideWalls(p,clearance);
            }
            Vector3 local = position - Base;
            bool inside = InsideWalls(local,clearance,.000001f)
                && local.y >= Floor + BallRadius - .004f
                && local.y + BallRadius < Height;
            if (position.y > mouth + BallRadius || !inside && local.y < Height - BallRadius)
                entered = false;
            dwell = entered && inside && velocity.magnitude < .12f ? dwell + dt : 0;
            previous = position;
            if (!captured && dwell >= .5f) { captured = true; return true; }
            return false;
        }
    }

    [System.Serializable]
    public class Challenge
    {
        public string id;
        public string title, subtitle;
        public Vector3 origin, cup;
        public bool walkingLaunch;
        public Vector3 launchFeet;
        public float launchRadius=.25f;
        public float aimYaw, aimHalfAngle=180;
        public float cupRadius = .12f;
        public Vector3 witnessVelocity, witnessSpin;
        public double witnessWorldTime;
        public string timingLaneId;
        public float timingPeriod, timingWindowStart, timingWindowEnd;
        public string requiredSurfacePrefix;
        public string requiredSurfaceId;
        public int requiredBounces = 1;
        public int requiredSurfaces = 1;
        public Vector3[] preview;
    }

}
