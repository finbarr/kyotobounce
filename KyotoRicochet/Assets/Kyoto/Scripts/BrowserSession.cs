#if !UNITY_WEBGL || UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kyoto
{
    // Local native authority. Rendering and input widgets live in the browser; the
    // retained collision world, walker and sphere contact solver live here only.
    public sealed partial class BrowserSession
    {
        [Serializable] public class Command
        {
            public string type,id,request,powerRange;
            public float x,z,yaw,pitch,top,kick,power;
            public bool fast;
            public Vector3 origin,direction;public float radius;public string slot;
            public BrowserDisk start,goal;public BrowserChallenge challenge;
        }
        [Serializable] public class PlayerState
        {
            public string id,powerRange="full";
            public Vector3 feet,release,movement;
            public float walked;
            public float yaw,pitch=15,top,kick,power;
            public bool grounded;
        }
        sealed class Player
        {
            public PlayerState state;
            public FirstPersonWalker walker;
            public Vector2 move;
            public bool fast;
            public double lastInput;
        }
        [Serializable] public class Snapshot
        {
            public string type="state",phase="Aim",owner="",id,layout,profile,physics=SimulationVersion,attempt;
            public BrowserChallenge challenge;
            public double stationTime,releaseTime,chargeTime;
            public float flightTime,radius,power;
            public Vector3 ball,velocity,spin,launchPosition;
            public Quaternion rotation;
            public int impacts,surfaces;public float goalDwell;
            public PlayerState[] players;
            public ReplayPose[] scorePoses;
            public BallDiagnostics diagnostics=new BallDiagnostics();
        }
        [Serializable] public class BallDiagnostics
        {
            public bool simulating,sleeping,supported;
            public string lastSurface,endReason;
            public float contactAge,slopeDegrees,rollingResistance,torsionalResistance,endedAt;
            public Vector3 contactNormal,surfaceVelocity;
            public int contactBudgetExhaustions,overlapRecoveries;
        }
        [Serializable] class Notice {public string type="notice",id,message;}
        [Serializable] class ImpactEvent
        {
            public string type="impact",id,surface,label;
            public Vector3 point;
            public float speed,time;
            public double stationTime;
            public bool qualifying;
        }
        readonly Dictionary<string,Player> players=new Dictionary<string,Player>();
        readonly Action<object> output;
        readonly GameObject gameObject;
        readonly StationLayout layout;
        readonly BallBody ball;
        readonly Snapshot state=new Snapshot();
        double releaseAt,chargeAt,stationTime;
        float pendingPower;
        Player owner;

        public BrowserSession(StationLayout station,string hash,string id,Action<object> send)
        {
            layout=station;output=send;state.layout=hash;state.id=id;
            gameObject=new GameObject("Private attempt "+id);
            var obj=new GameObject("Authoritative ball");obj.transform.SetParent(gameObject.transform);
            obj.AddComponent<SphereCollider>();obj.AddComponent<Rigidbody>();ball=obj.AddComponent<BallBody>();
            ball.SetProfile(BallProfile.Phase2Default);state.profile=ball.Profile.id;state.radius=ball.Profile.radius_m;
            ball.Impact+=RecordImpact;ball.SetPose(layout.spawn+Vector3.up*1.5f,Quaternion.identity);
            Handle(new Command{type="join",id=id});
        }
        void ActivateClock()=>StationMotion.SetAnalyticTime(gameObject.scene,stationTime);
        void Send(object data)=>output(data);
        void Note(string id,string message)=>Send(new Notice{id=id,message=message});
        public void Handle(Command c)

        {
            if(c==null||string.IsNullOrEmpty(c.type))return;
            ActivateClock();
            if(CompetitionCommand(c))return;
            if(string.IsNullOrEmpty(c.id))return;
            if(c.type=="join")
            {
                if(players.ContainsKey(c.id)||players.Count>=4)return;
                var walker=new GameObject("Guest "+c.id).AddComponent<FirstPersonWalker>();
                walker.transform.SetParent(gameObject.transform);
                walker.Place((activeChallenge==null?layout.spawn:activeChallenge.start.center)+Vector3.up*.03f);
                players.Add(c.id,new Player{walker=walker,state=new PlayerState{id=c.id,feet=walker.transform.position}});
                return;
            }
            if(!players.TryGetValue(c.id,out var p))return;
            if(c.type=="leave")
            {if(owner==p){Reset();}UnityEngine.Object.Destroy(p.walker.gameObject);players.Remove(c.id);return;}
            switch(c.type)
            {
                case "input":
                    p.lastInput=Time.realtimeSinceStartupAsDouble;
                    p.move=Vector2.ClampMagnitude(new Vector2(c.x,c.z),1);p.fast=c.fast;
                    if(owner!=p||(state.phase!="Release"&&state.phase!="Flight"&&state.phase!="Result"))
                    {
                        p.state.yaw=Mathf.Repeat(c.yaw+180,360)-180;p.state.pitch=Mathf.Clamp(c.pitch,-65,80);
                        p.state.top=Mathf.Clamp(c.top,-200,200);p.state.kick=Mathf.Clamp(c.kick,-200,200);
                    }
                    break;
                case "charge":
                    if(state.phase=="Result")Reset();
                    if(owner!=null){Note(c.id,"Wait for the active throw.");break;}
                    if(!InStart(p)){Note(c.id,"Stand inside the start circle on its selected floor.");break;}
                    attempt=c.request;
                    if(!p.walker.TryRelease(p.state.yaw,p.state.pitch,out _,state.radius)){Note(c.id,"Move away from the wall before throwing.");break;}
                    p.state.powerRange=c.powerRange=="precision"?"precision":"full";
                    owner=p;state.owner=c.id;state.phase="Charging";chargeAt=StationMotion.Time(gameObject.scene);state.chargeTime=chargeAt;p.move=Vector2.zero;
                    break;
                case "release":
                    if(owner!=p||state.phase!="Charging")break;
                    pendingPower=Mathf.Clamp01(c.power);p.state.power=pendingPower;
                    state.phase="Release";state.releaseTime=StationMotion.Time(gameObject.scene)+.12;releaseAt=Time.realtimeSinceStartupAsDouble+.12;
                    break;
                case "cancel":
                    if(owner==p&&(state.phase=="Charging"||state.phase=="Release"))Reset();
                    p.move=Vector2.zero;
                    break;
                case "recall":if(owner==null||owner==p||state.phase=="Result"){if(state.phase=="Flight")Note(p.state.id,"Shot recalled. No score awarded.");Reset();}break;
                case "home":
                    if(owner==null||state.phase=="Result"){if(state.phase=="Result")Reset();p.walker.Place((activeChallenge==null?layout.spawn:activeChallenge.start.center)+Vector3.up*.03f);p.state.yaw=0;p.state.pitch=15;p.move=Vector2.zero;}
                    break;
            }
        }
        public void Step()
        {
            ActivateClock();
            if(state.phase=="Release"&&Time.realtimeSinceStartupAsDouble>=releaseAt)
            {
                if(InStart(owner)&&owner.walker.TryRelease(owner.state.yaw,owner.state.pitch,out var release,state.radius))
                {
                    var velocity=Quaternion.Euler(-owner.state.pitch,owner.state.yaw,0)*Vector3.forward*ThrowSpeed(pendingPower);
                    ball.Launch(release,velocity,SpinControls.Compose(owner.state.yaw,owner.state.top,owner.state.kick));
                    state.launchPosition=release;state.phase="Flight";state.releaseTime=StationMotion.Time(gameObject.scene);BeginRecording();
                    Physics.SyncTransforms();
                }
                else{Note(owner.state.id,"Throw cancelled: the hand is blocked.");Reset();}
            }
            if(state.phase=="Flight")
            {
                ball.BeforeStep(BallBody.Step);
                replayPoses.Add(new ReplayPose{t=ball.Clock,p=ball.Body.position,q=ball.Body.rotation});
                bool stopped=ball.Sleeping&&ball.Velocity.sqrMagnitude<1e-10f&&ball.AngularVelocity.sqrMagnitude<1e-10f;
                sleepDwell=stopped?sleepDwell+BallBody.Step:0;
                if(GoalStep())Finish(true,"Target settled");
                else if(sleepDwell>.6f)Finish(false,"Ball stopped outside the goal");
                else if(ball.Body.position.y < -5)
                {Note(owner.state.id,"Ball left the station. Attempt cancelled; no score awarded.");Reset();}
            }
            // A result is issued only after physical rest. Keep the station clock
            // running, while the finished ball and its complete replay stay still.
            else StationMotion.Advance(gameObject.scene,BallBody.Step);
            foreach(var p in players.Values)
            {
                bool frozen=p==owner&&(state.phase=="Charging"||state.phase=="Release"||state.phase=="Flight"||state.phase=="Result");
                var move=frozen||Time.realtimeSinceStartupAsDouble-p.lastInput>.3?Vector2.zero:p.move;
                Vector3 previousFeet=p.walker.transform.position;
                p.walker.Move(move,p.state.yaw,p.fast,BallBody.Step);ConstrainWalker(p,previousFeet);
                Vector3 travelled=Vector3.ProjectOnPlane(p.walker.transform.position-previousFeet,Vector3.up);
                p.state.movement=move.sqrMagnitude>.001f?travelled/BallBody.Step:Vector3.zero;
                if(p.walker.Grounded&&move.sqrMagnitude>.001f)p.state.walked+=travelled.magnitude;
            }
            stationTime=StationMotion.Time(gameObject.scene);
        }
        void Reset()
        {state.phase="Aim";state.owner="";owner=null;state.power=0;distinct.Clear();impactTimes.Clear();impactCount=0;goalDwell=0;state.diagnostics.endReason="";state.diagnostics.endedAt=0;}
        float ThrowSpeed(float power)
        {
            float precision=Mathf.Lerp(.5f,12f,power*power);
            // Old challenge revisions retain their original launch rule and board.
            string model=activeChallenge==null?"robot-v4":activeChallenge.throwModel;
            if(model=="robot-v4")return Mathf.Lerp(.5f,owner.state.powerRange=="precision"?12f:100f,power);
            if(model!="robot-v2"&&model!="robot-v3")return precision;
            // Keep the precision range through 40%. Full power is 100 m/s,
            // just over twice elite human release speed; v2 retains 32 m/s.
            float drive=Mathf.InverseLerp(.4f,1f,power);
            return precision+(model=="robot-v3"?88f:20f)*drive*drive;
        }
        public void Publish()
        {
            ActivateClock();
            state.stationTime=StationMotion.Time(gameObject.scene);state.challenge=activeChallenge;state.attempt=attempt;state.goalDwell=goalDwell;
            state.players=new PlayerState[players.Count];int i=0;
            foreach(var p in players.Values)
            {
                p.state.feet=p.walker.transform.position;p.state.grounded=p.walker.Grounded;
                p.walker.TryRelease(p.state.yaw,p.state.pitch,out p.state.release,state.radius);
                if(p==owner&&state.phase=="Charging")p.state.power=Mathf.Clamp01((float)(state.stationTime-chargeAt)/2.8f);
                state.players[i++]=p.state;
            }
            state.ball=ball.Body.position;state.rotation=ball.Body.rotation;
            state.velocity=ball.Velocity;state.spin=ball.AngularVelocity;state.flightTime=state.phase=="Flight"||state.phase=="Result"?ball.Clock:0;
            state.power=owner==null?0:owner.state.power;state.impacts=impactCount;state.surfaces=distinct.Count;
            var d=state.diagnostics;
            d.simulating=state.phase=="Flight";
            d.sleeping=ball.Sleeping;d.supported=ball.Supported;d.lastSurface=ball.LastContactSurface;
            d.contactAge=ball.LastContactTime<0?-1:ball.Clock-ball.LastContactTime;
            d.contactNormal=ball.ContactNormal;d.surfaceVelocity=ball.ContactSurfaceVelocity;
            d.slopeDegrees=ball.LastContactTime<0?0:Vector3.Angle(ball.ContactNormal,-Physics.gravity);
            d.torsionalResistance=ball.CurrentTorsionalResistance;d.rollingResistance=ball.CurrentRollingResistance;
            d.contactBudgetExhaustions=ball.ContactBudgetExhaustions;d.overlapRecoveries=ball.StaticOverlapRecoveries;
            bool recording=state.phase=="Flight"||state.phase=="Result";
            state.scorePoses=recording?replayPoses.GetRange(scorePoseCursor,replayPoses.Count-scorePoseCursor).ToArray():Array.Empty<ReplayPose>();
            if(recording)scorePoseCursor=replayPoses.Count;
            Send(state);
        }
        public void Dispose(){ball.Impact-=RecordImpact;UnityEngine.Object.Destroy(gameObject);}
    }
}
#endif
