using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    [Serializable] public sealed class LiftState
    {
        public string id;
        public int from,to;
        public double startTime;
        public bool blocked;
        public LiftState Copy()=>new LiftState{id=id,from=from,to=to,startTime=startTime,blocked=blocked};
    }
    [Serializable] public sealed class LiftPose
    {public string id;public float height,carDoor,lowerDoor,upperDoor;public bool moving,blocked;}

    // Small translating box set, with private session schedules. Browser poses
    // come from this authority; ball contacts use exact relative-motion sweeps.
    public sealed class MovingLift : MonoBehaviour
    {
        public StationLayout.Lift spec;
        public LiftState state;
        public bool collision;
        Transform[] solids,walkingSolids;
        BoxCollider[] colliders;
        Surface[] surfaces;
        public float TravelSeconds=>spec.travel[spec.travel.Length-1].x;
        public float TotalSeconds=>spec.waitSeconds+2*spec.doorSeconds+TravelSeconds;
        public bool Busy(double time)=>state.from!=state.to&&time-state.startTime<TotalSeconds;
        void OnDisable(){StationMotion.Remove(this);}
        public static MovingLift Create(Transform parent,StationLayout.Lift spec,PhysicsMaterial material,bool collision,bool walking)
        {
            if(spec.travel==null||spec.travel.Length<2||spec.height<=0||spec.doorSeconds<=0||spec.waitSeconds<0)
                throw new ArgumentException("Invalid lift path: "+spec.id);
            for(int i=1;i<spec.travel.Length;i++)if(spec.travel[i].x<=spec.travel[i-1].x||spec.travel[i].y<spec.travel[i-1].y)
                throw new ArgumentException("Lift travel must increase in time and height: "+spec.id);
            if(Mathf.Abs(spec.travel[0].x)>1e-6f||Mathf.Abs(spec.travel[0].y)>1e-6f||Mathf.Abs(spec.travel[spec.travel.Length-1].y-spec.height)>1e-5f)
                throw new ArgumentException("Lift travel must join both floors: "+spec.id);
            var root=new GameObject(spec.id);SceneManager.MoveGameObjectToScene(root,parent.gameObject.scene);root.transform.SetParent(parent,false);root.transform.localPosition=spec.origin;
            var lift=root.AddComponent<MovingLift>();lift.spec=spec;lift.collision=collision;lift.state=new LiftState{id=spec.id};
            int count=spec.parts.Length;lift.solids=new Transform[count];lift.walkingSolids=new Transform[count];lift.colliders=new BoxCollider[count];lift.surfaces=new Surface[count];
            for(int i=0;i<count;i++)
            {
                var p=spec.parts[i];if(p.size.x<=0||p.size.y<=0||p.size.z<=0)throw new ArgumentException("Invalid lift solid: "+p.id);
                if(p.motion!="car"&&p.motion!="lower"&&p.motion!="upper")throw new ArgumentException("Invalid lift motion: "+p.id);
                var obj=new GameObject(p.id);SceneManager.MoveGameObjectToScene(obj,root.scene);obj.transform.SetParent(root.transform,false);obj.layer=CollisionLayers.MovingSteps;
                var c=obj.AddComponent<BoxCollider>();c.size=p.size;c.sharedMaterial=material;c.contactOffset=.001f;c.enabled=collision;
                var surface=obj.AddComponent<Surface>();surface.surfaceId=p.id;surface.displayName="LIFT "+p.motion.ToUpperInvariant();
                lift.solids[i]=obj.transform;lift.colliders[i]=c;lift.surfaces[i]=surface;
                if(walking&&collision)
                {
                    var w=new GameObject(p.id+" walking");SceneManager.MoveGameObjectToScene(w,root.scene);w.transform.SetParent(root.transform,false);w.layer=CollisionLayers.WalkingAssist;
                    var wc=w.AddComponent<BoxCollider>();wc.size=p.size;wc.contactOffset=.001f;lift.walkingSolids[i]=w.transform;
                }
            }
            StationMotion.Register(lift);return lift;
        }
        // Every pose interval is linear, including car acceleration samples and doors.
        public LiftPose Pose(double time,out double next)
        {
            var p=new LiftPose{id=spec.id,blocked=state.blocked};next=double.PositiveInfinity;
            if(state.from==state.to){p.height=state.to*spec.height;p.carDoor=1;if(state.to==0)p.lowerDoor=1;else p.upperDoor=1;return p;}
            double t=time-state.startTime;float fromDoor=0,toDoor=0;
            double close=spec.waitSeconds,travel=close+spec.doorSeconds,open=travel+TravelSeconds,end=open+spec.doorSeconds;
            if(t<close){p.height=state.from*spec.height;fromDoor=1;next=close-t;}
            else if(t<travel){p.height=state.from*spec.height;fromDoor=1-(float)((t-close)/spec.doorSeconds);next=travel-t;}
            else if(t<open)
            {
                double at=t-travel;int i=0;while(i+2<spec.travel.Length&&spec.travel[i+1].x<=at)i++;
                var a=spec.travel[i];var b=spec.travel[i+1];float h=Mathf.Lerp(a.y,b.y,(float)((at-a.x)/(b.x-a.x)));
                p.height=state.from==0?h:spec.height-h;p.moving=true;next=b.x-at;
            }
            else if(t<end){p.height=state.to*spec.height;toDoor=(float)((t-open)/spec.doorSeconds);next=end-t;}
            else{p.height=state.to*spec.height;toDoor=1;}
            p.carDoor=fromDoor+toDoor;p.lowerDoor=state.from==0?fromDoor:toDoor;p.upperDoor=state.from==1?fromDoor:toDoor;return p;
        }
        Vector3 Center(int i,LiftPose pose)
        {
            var p=spec.parts[i];float y=p.motion=="car"?pose.height:p.motion=="upper"?spec.height:0;
            float door=p.motion=="car"?pose.carDoor:p.motion=="upper"?pose.upperDoor:pose.lowerDoor;
            return p.center+new Vector3(p.doorSide*spec.doorTravel*door,y,0);
        }
        public void SetTime(double time)
        {
            var pose=Pose(time,out _);
            for(int i=0;i<solids.Length;i++){solids[i].localPosition=Center(i,pose);if(walkingSolids[i])walkingSolids[i].localPosition=solids[i].localPosition;}
        }
        public bool Near(Vector3 position,float margin)
        {var p=transform.InverseTransformPoint(position);return Mathf.Abs(p.x)<spec.width*.5f+margin+1&&Mathf.Abs(p.z)<spec.depth*.5f+margin+1&&p.y> -1-margin&&p.y<spec.height+3+margin;}
        public bool Sweep(Vector3 origin,Vector3 displacement,float radius,double time,float duration,out MovingContact hit,bool freeze=false)
        {
            hit=default;hit.time=duration;if(!Near(origin,displacement.magnitude+radius))return false;
            Vector3 p=transform.InverseTransformPoint(origin),d=transform.InverseTransformDirection(displacement),travel=duration>0?d/duration:Vector3.zero;bool found=false;
            double elapsed=0;
            while(elapsed<duration-1e-10&&elapsed<=hit.time)
            {
                var pose=Pose(time+elapsed,out var until);float span=freeze?duration:(float)Math.Min(duration-elapsed,Math.Max(1e-8,until));
                var after=freeze?pose:Pose(time+elapsed+span,out _);
                for(int i=0;i<solids.Length;i++)
                {
                    Vector3 center=Center(i,pose),velocity=freeze?Vector3.zero:(Center(i,after)-center)/span;
                    if(SweptSphereBox.Cast(p+travel*(float)elapsed-center,(travel-velocity)*span,spec.parts[i].size*.5f,radius,out float f,out var n,out var q))
                    {
                        float at=(float)elapsed+f*span;if(!found||at<hit.time){hit=new MovingContact{time=at,point=transform.TransformPoint(center+velocity*(f*span)+q),normal=transform.TransformDirection(n),velocity=transform.TransformDirection(velocity),collider=colliders[i],surface=surfaces[i]};found=true;}
                    }
                }
                if(freeze)break;elapsed+=span;
            }
            return found;
        }
        public Vector3 Carry(Vector3 feet,double time,float dt)
        {
            var p=transform.InverseTransformPoint(feet);var before=Pose(time-dt,out _);var after=Pose(time,out _);
            if(Mathf.Abs(p.x)>spec.width*.5f-.25f||Mathf.Abs(p.z)>spec.depth*.5f-.25f||Mathf.Abs(p.y-before.height)>.15f)return Vector3.zero;
            return Vector3.up*(after.height-before.height);
        }
        public bool InDoorway(Vector3 position,float radius,float height,double time)
        {
            var p=transform.InverseTransformPoint(position);float y=state.from*spec.height;
            return Mathf.Abs(p.x)<spec.doorWidth*.5f+radius&&Mathf.Abs(p.z-spec.doorZ)<radius+.20f&&p.y+height>y+.02f&&p.y<y+2.25f;
        }
        public void HoldDoor(double time,float dt,bool obstructed)
        {
            state.blocked=false;if(state.from==state.to)return;
            double t=time-state.startTime;
            if(obstructed&&t>=spec.waitSeconds&&t<spec.waitSeconds+spec.doorSeconds){state.startTime+=dt;state.blocked=true;}
        }
        public bool Request(Vector3 feet,double time,out string message)
        {
            var p=transform.InverseTransformPoint(feet);var pose=Pose(time,out _);
            bool inside=Mathf.Abs(p.x)<spec.width*.5f-.25f&&Mathf.Abs(p.z)<spec.depth*.5f-.25f&&Mathf.Abs(p.y-pose.height)<.15f;
            int floor=Mathf.Abs(p.y)<.15f?0:Mathf.Abs(p.y-spec.height)<.15f?1:-1;
            bool outside=floor>=0&&Mathf.Abs(p.x)<spec.doorWidth*.5f+1&&p.z<spec.doorZ&&p.z>spec.doorZ-2;
            if(!inside&&!outside){message="Stand beside a lift button.";return false;}
            if(Busy(time)){message=state.blocked?"Clear the lift doorway.":"The lift is moving. Please wait.";return false;}
            int current=state.to,target=inside?1-current:floor;
            if(target==current){message="Lift doors are open.";return true;}
            state.from=current;state.to=target;state.startTime=time;state.blocked=false;message=inside?"Lift departing.":"Lift called.";return true;
        }
    }
}
