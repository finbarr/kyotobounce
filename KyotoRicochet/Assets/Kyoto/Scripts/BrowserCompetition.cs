#if !UNITY_WEBGL || UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kyoto
{
    [Serializable] public class BrowserDisk
    {public Vector3 center,normal;public float radius;public string surface;}
    [Serializable] public class BrowserWaypoint : BrowserDisk {public string id;}
    [Serializable] public class BrowserChallenge
    {public string id,name,layout,physics,requiredSurface,throwModel,scoring;public int revision;public BrowserDisk start,goal;public BrowserWaypoint[] waypoints;}
    public sealed partial class BrowserSession
    {
        public const string SimulationVersion="kyoto-p3-2";
        [Serializable] class RpcReply
        {public string type="reply",request,message;public bool ok;public BrowserDisk disk;public BrowserChallenge challenge;}
        [Serializable] public class ReplayPose
        {public float t;public Vector3 p;public Quaternion q;}
        [Serializable] class ThrowResult
        {
            public string type="result",attempt,id,reason,layout,physics=SimulationVersion,profile;
            public BrowserChallenge challenge;
            public bool success,destinationReached;public WaypointHit[] waypointHits;public int score,surfaces,impacts;public float duration;
            public double releaseTime,chargeTime;
            public PlayerState thrower;
            public Vector3 launchPosition,velocity,spin;
            public ReplayPose[] poses;
            public ImpactEvent[] contacts;
        }
        [Serializable] public class WaypointHit
        {
            public string type="waypoint-hit",id,attempt,waypointId,surface;
            public float time;public Vector3 point,normal;
        }
        readonly List<WaypointHit> waypointHits=new List<WaypointHit>();
        readonly HashSet<string> visitedWaypoints=new HashSet<string>();
        BrowserChallenge activeChallenge;
        string attempt;
        float goalDwell,sleepDwell;
        readonly HashSet<string> distinct=new HashSet<string>();
        readonly Dictionary<string,float> impactTimes=new Dictionary<string,float>();
        readonly List<ReplayPose> replayPoses=new List<ReplayPose>();
        readonly List<ImpactEvent> replayContacts=new List<ImpactEvent>();
        int impactCount,scorePoseCursor;
        PlayerState thrower;
        Vector3 launchVelocity,launchSpin;

        bool CompetitionCommand(Command c)
        {
            if(c.type=="place")
            {
                var reply=new RpcReply{request=c.request};
                bool waypoint=c.slot=="waypoint";
                if(Physics.Raycast(c.origin,c.direction.normalized,out var hit,250,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)
                   &&hit.collider.gameObject.layer!=CollisionLayers.MovingSteps&&(waypoint||hit.normal.y>.995f))
                {
                    var disk=new BrowserDisk{center=hit.point,normal=hit.normal,radius=c.radius,surface=SurfaceId(hit.collider)};
                    reply.ok=waypoint?ValidateWaypoint(disk,out reply.message):ValidateDisk(disk,c.slot=="start",out reply.message);reply.disk=disk;
                }
                else reply.message=waypoint?"Choose a fixed surface; moving targets are not supported.":"Choose a fixed horizontal floor or landing.";
                Send(reply);return true;
            }
            if(c.type=="validate")
            {
                bool ok=ValidateChallenge(new BrowserChallenge{start=c.start,goal=c.goal,waypoints=c.waypoints,scoring=c.scoring},out string message);
                Send(new RpcReply{request=c.request,ok=ok,message=message});return true;
            }
            if(c.type=="select")
            {
                // JsonUtility can instantiate an empty nested object for JSON null.
                if(c.challenge!=null&&string.IsNullOrEmpty(c.challenge.id))c.challenge=null;
                string message="";bool ok=owner==null||state.phase=="Result";
                if(!ok)message="Finish or cancel the active throw first.";
                if(ok&&c.challenge!=null)
                {
                    ok=c.challenge.layout==state.layout&&c.challenge.physics==SimulationVersion;
                    if(!ok)message="This challenge uses a different station or physics version.";
                    if(ok)ok=ValidateChallenge(c.challenge,out message);
                }
                if(ok)
                {
                    Reset();activeChallenge=c.challenge;
                    foreach(var p in players.Values)
                    {
                        if(activeChallenge!=null)p.walker.Place(activeChallenge.start.center+Vector3.up*.03f);
                        p.move=Vector2.zero;
                    }
                }
                Send(new RpcReply{request=c.request,ok=ok,message=message,challenge=activeChallenge});return true;
            }
            return false;
        }
        static string SurfaceId(Collider collider)
        {var surface=collider.GetComponentInParent<Surface>();return surface?surface.surfaceId:"";}
        bool FloorAt(Vector3 point,out RaycastHit hit)
        {return Physics.Raycast(point+Vector3.up*.10f,Vector3.down,out hit,.20f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore)&&hit.normal.y>.995f;}
        bool ValidateDisk(BrowserDisk disk,bool start,out string message)
        {
            message="";float min=start?.25f:.10f,max=start?3:2;
            if(disk==null||float.IsNaN(disk.radius)||disk.radius<min||disk.radius>max||!Finite(disk.center))
            {message="Circle radius or position is invalid.";return false;}
            if(string.IsNullOrEmpty(disk.surface)||!FloorAt(disk.center,out var center)||SurfaceId(center.collider)!=disk.surface||Mathf.Abs(center.point.y-disk.center.y)>.01f)
            {message="The circle must sit on its selected floor.";return false;}
            // Check a radial grid and clearance, so circles cannot straddle a
            // landing edge, a different level or a nearby wall.
            for(int ring=1;ring<=3;ring++)for(int i=0;i<32;i++)
            {
                float angle=i*Mathf.PI*2/32;Vector3 direction=new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle));
                Vector3 point=disk.center+direction*(disk.radius*ring/3);
                if(!FloorAt(point,out var support)||Mathf.Abs(support.point.y-disk.center.y)>.01f||SurfaceId(support.collider)!=disk.surface)
                {message="Keep the whole circle on one uninterrupted floor.";return false;}
                float height=start?.90f:ball.Profile.radius_m+.015f;
                if(Physics.Raycast(disk.center+Vector3.up*height,direction,disk.radius+.01f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore))
                {message="The circle intersects a wall or obstacle.";return false;}
            }
            if(start&&Physics.CheckCapsule(disk.center+Vector3.up*.27f,disk.center+Vector3.up*1.55f,.24f,CollisionLayers.WalkingMask,QueryTriggerInteraction.Ignore))
            {message="There is not enough room for the thrower.";return false;}
            return true;
        }
        bool ValidateChallenge(BrowserChallenge challenge,out string message)
        {
            if(!ValidateDisk(challenge.start,true,out message))return false;
            if(challenge.scoring!="waypoint-v1")return ValidateDisk(challenge.goal,false,out message);
            // JsonUtility sometimes creates an empty object for JSON null.
            if(challenge.goal!=null&&string.IsNullOrEmpty(challenge.goal.surface)&&challenge.goal.radius==0)challenge.goal=null;
            int count=(challenge.waypoints?.Length??0)+(challenge.goal==null?0:1);
            if(count<1||(challenge.waypoints?.Length??0)>32){message="Choose at least one target and at most 32 waypoints.";return false;}
            if(challenge.goal!=null&&!ValidateDisk(challenge.goal,false,out message))return false;
            var ids=new HashSet<string>();
            foreach(var target in challenge.waypoints??Array.Empty<BrowserWaypoint>())
                if(target==null||string.IsNullOrEmpty(target.id)||target.id.Length>64||!ids.Add(target.id)||!ValidateWaypoint(target,out message))
                {if(string.IsNullOrEmpty(message))message="Waypoint IDs must be unique.";return false;}
            return true;
        }
        bool ValidateWaypoint(BrowserDisk target,out string message)
        {
            message="";
            if(target==null||!Finite(target.center)||!Finite(target.normal)||float.IsNaN(target.radius)||target.radius<.10f||target.radius>2||Mathf.Abs(target.normal.magnitude-1)>.001f||string.IsNullOrEmpty(target.surface))
            {message="Waypoint position, normal or radius is invalid.";return false;}
            Vector3 n=target.normal.normalized,u=Vector3.Cross(n,Mathf.Abs(n.y)<.9f?Vector3.up:Vector3.right).normalized,v=Vector3.Cross(n,u);
            for(int ring=0;ring<=3;ring++)for(int i=0;i<(ring==0?1:32);i++)
            {
                float angle=i*Mathf.PI*2/32;Vector3 point=target.center+(u*Mathf.Cos(angle)+v*Mathf.Sin(angle))*(target.radius*ring/3);
                if(!Physics.Raycast(point+n*.05f,-n,out var hit,.10f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)
                   ||hit.collider.gameObject.layer==CollisionLayers.MovingSteps||SurfaceId(hit.collider)!=target.surface||Vector3.Dot(hit.normal,n)<.995f||Vector3.Distance(hit.point,point)>.01f)
                {message="Keep the whole waypoint on one fixed surface face.";return false;}
                if(Physics.CheckSphere(point+n*(ball.Profile.radius_m+.003f),ball.Profile.radius_m,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore))
                {message="The waypoint face is blocked by an obstacle.";return false;}
            }
            return true;
        }
        void RecordWaypointContact(ContactSample contact)
        {
            if(state.phase!="Flight"||activeChallenge?.scoring!="waypoint-v1")return;
            foreach(var target in activeChallenge.waypoints??Array.Empty<BrowserWaypoint>())
            {
                if(visitedWaypoints.Contains(target.id)||contact.surfaceId!=target.surface||Vector3.Dot(contact.normal,target.normal)<.995f)continue;
                Vector3 offset=contact.point-target.center;
                if(Mathf.Abs(Vector3.Dot(offset,target.normal))>.01f||Vector3.ProjectOnPlane(offset,target.normal).sqrMagnitude>target.radius*target.radius)continue;
                visitedWaypoints.Add(target.id);
                var hit=new WaypointHit{id=state.id,attempt=attempt,waypointId=target.id,surface=contact.surfaceId,time=contact.time,point=contact.point,normal=contact.normal};
                waypointHits.Add(hit);Send(hit);
            }
        }
        static bool Finite(Vector3 p)=>!(float.IsNaN(p.x)||float.IsNaN(p.y)||float.IsNaN(p.z)||float.IsInfinity(p.x)||float.IsInfinity(p.y)||float.IsInfinity(p.z));
        bool InStart(Player p)
        {
            if(activeChallenge==null)return true;
            var disk=activeChallenge.start;Vector3 feet=p.walker.transform.position;
            return Vector2.Distance(new Vector2(feet.x,feet.z),new Vector2(disk.center.x,disk.center.z))<=disk.radius+.0001f
                &&Mathf.Abs(feet.y-disk.center.y)<.06f&&FloorAt(feet,out var floor)&&SurfaceId(floor.collider)==disk.surface;
        }
        void RecordImpact(Surface surface,Vector3 point,float speed)
        {
            if(state.phase!="Flight")return;
            bool qualifying=surface&&surface.scores&&speed>=.35f;
            string id=surface?surface.surfaceId:"unknown";
            if(qualifying&&impactTimes.TryGetValue(id,out float last)&&ball.Clock-last<.08f)qualifying=false;
            if(qualifying){impactTimes[id]=ball.Clock;impactCount++;distinct.Add(id);}
            var impact=new ImpactEvent{id=state.id,surface=id,label=surface?surface.displayName:"Surface",point=point,speed=speed,time=ball.Clock,
                stationTime=StationMotion.Time(gameObject.scene),qualifying=qualifying};
            replayContacts.Add(impact);Send(impact);
        }
        void BeginRecording()
        {
            distinct.Clear();impactTimes.Clear();waypointHits.Clear();visitedWaypoints.Clear();impactCount=0;goalDwell=sleepDwell=0;replayPoses.Clear();replayContacts.Clear();
            scorePoseCursor=0;
            thrower=JsonUtility.FromJson<PlayerState>(JsonUtility.ToJson(owner.state));thrower.feet=owner.walker.transform.position;
            launchVelocity=ball.Velocity;launchSpin=ball.AngularVelocity;
            replayPoses.Add(new ReplayPose{t=0,p=ball.Body.position,q=ball.Body.rotation});
        }
        bool GoalStep()
        {
            if(activeChallenge==null||activeChallenge.goal==null)return false;
            if(!string.IsNullOrEmpty(activeChallenge.requiredSurface)&&!distinct.Contains(activeChallenge.requiredSurface)){goalDwell=0;return false;}
            var goal=activeChallenge.goal;Vector3 p=ball.Body.position;float clearance=goal.radius-ball.Profile.radius_m;
            bool fits=clearance>0&&new Vector2(p.x-goal.center.x,p.z-goal.center.z).sqrMagnitude<=clearance*clearance;
            bool supported=false;
            if(fits&&Mathf.Abs(p.y-ball.Profile.radius_m-goal.center.y)<=.05f)
                supported=Physics.Raycast(p,Vector3.down,out var hit,ball.Profile.radius_m+.004f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore)
                    &&hit.normal.y>.995f&&SurfaceId(hit.collider)==goal.surface&&Mathf.Abs(hit.point.y-goal.center.y)<=.05f;
            goalDwell=fits&&supported&&ball.Sleeping&&ball.Velocity.sqrMagnitude<1e-10f&&ball.AngularVelocity.sqrMagnitude<1e-10f?goalDwell+BallBody.Step:0;
            return goalDwell>=.5f;
        }
        void Finish(bool success,string reason)
        {
            if(state.phase!="Flight"||!ball.Sleeping||ball.Velocity.sqrMagnitude>=1e-10f||ball.AngularVelocity.sqrMagnitude>=1e-10f)return;
            state.phase="Result";
            state.diagnostics.endReason=reason;state.diagnostics.endedAt=ball.Clock;
            Send(new ThrowResult{attempt=attempt,id=owner.state.id,reason=reason,layout=state.layout,profile=state.profile,challenge=activeChallenge,
                success=success,destinationReached=success,waypointHits=waypointHits.ToArray(),score=success?1000+100*distinct.Count:0,surfaces=distinct.Count,impacts=impactCount,duration=ball.Clock,
                releaseTime=state.releaseTime,chargeTime=state.chargeTime,thrower=thrower,launchPosition=state.launchPosition,velocity=launchVelocity,spin=launchSpin,
                poses=replayPoses.ToArray(),contacts=replayContacts.ToArray()});
        }
        void ConstrainWalker(Player p,Vector3 previousFeet)
        {
            if(activeChallenge==null)return;
            if(!InStart(p))p.walker.Place(previousFeet);
        }
    }
}
#endif
