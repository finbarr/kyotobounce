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
    {public string id;public float height,carDoor,lowerDoor,upperDoor;public float[] landingDoors;public bool moving,blocked,busy;}

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
        Vector2[,][] paths;
        public int FloorCount=>spec.stops==null?2:spec.stops.Length;
        public float FloorHeight(int floor)=>spec.stops==null?floor*spec.height:spec.stops[floor].height;
        Vector2[] Travel=>paths[Math.Min(state.from,state.to),Math.Max(state.from,state.to)];
        public float TravelSeconds=>state.from==state.to?0:Travel[Travel.Length-1].x;
        public float TotalSeconds=>spec.waitSeconds+2*spec.doorSeconds+TravelSeconds;
        public bool Busy(double time)=>state.from!=state.to&&time-state.startTime<TotalSeconds;
        void OnDisable(){StationMotion.Remove(this);}
        static void ValidatePath(Vector2[] path,float height,string id)
        {
            if(path==null||path.Length<2)throw new ArgumentException("Missing lift travel: "+id);
            for(int i=0;i<path.Length;i++)
                if(float.IsNaN(path[i].x)||float.IsInfinity(path[i].x)||float.IsNaN(path[i].y)||float.IsInfinity(path[i].y)||
                    (i>0&&(path[i].x<=path[i-1].x||path[i].y<path[i-1].y)))throw new ArgumentException("Lift travel must increase in time and height: "+id);
            if(Mathf.Abs(path[0].x)>1e-6f||Mathf.Abs(path[0].y)>1e-6f||Mathf.Abs(path[path.Length-1].y-height)>1e-5f)
                throw new ArgumentException("Lift travel must join both floors: "+id);
        }
        public static MovingLift Create(Transform parent,StationLayout.Lift spec,PhysicsMaterial material,bool collision,bool walking)
        {
            if(spec.height<=0||spec.doorSeconds<=0||spec.waitSeconds<0||float.IsNaN(spec.yaw)||float.IsInfinity(spec.yaw))
                throw new ArgumentException("Invalid lift path: "+spec.id);
            int floors=spec.stops==null?2:spec.stops.Length;var paths=new Vector2[floors,floors][];
            if(spec.stops==null){ValidatePath(spec.travel,spec.height,spec.id);paths[0,1]=spec.travel;}
            else
            {
                if(floors<2||floors>16||Mathf.Abs(spec.stops[0].height)>1e-6f||Mathf.Abs(spec.stops[floors-1].height-spec.height)>1e-5f)
                    throw new ArgumentException("Invalid lift stops: "+spec.id);
                var ids=new System.Collections.Generic.HashSet<string>();
                for(int i=0;i<floors;i++)if(string.IsNullOrEmpty(spec.stops[i].id)||!ids.Add(spec.stops[i].id)||float.IsNaN(spec.stops[i].height)||float.IsInfinity(spec.stops[i].height)||(i>0&&spec.stops[i].height<=spec.stops[i-1].height))
                    throw new ArgumentException("Lift stops must have unique ids and increasing heights: "+spec.id);
                if(spec.trips==null)throw new ArgumentException("Missing lift trips: "+spec.id);
                foreach(var trip in spec.trips)
                {
                    if(trip.from<0||trip.to>=floors||trip.to<=trip.from||paths[trip.from,trip.to]!=null)throw new ArgumentException("Invalid lift trip: "+spec.id);
                    ValidatePath(trip.travel,spec.stops[trip.to].height-spec.stops[trip.from].height,spec.id);paths[trip.from,trip.to]=trip.travel;
                }
                for(int a=0;a<floors;a++)for(int b=a+1;b<floors;b++)if(paths[a,b]==null)throw new ArgumentException("Missing lift floor pair: "+spec.id);
            }
            var root=new GameObject(spec.id);SceneManager.MoveGameObjectToScene(root,parent.gameObject.scene);root.transform.SetParent(parent,false);root.transform.localPosition=spec.origin;root.transform.localRotation=Quaternion.Euler(0,spec.yaw,0);
            var lift=root.AddComponent<MovingLift>();lift.spec=spec;lift.paths=paths;lift.collision=collision;lift.state=new LiftState{id=spec.id};
            int count=spec.parts.Length;lift.solids=new Transform[count];lift.walkingSolids=new Transform[count];lift.colliders=new BoxCollider[count];lift.surfaces=new Surface[count];
            for(int i=0;i<count;i++)
            {
                var p=spec.parts[i];if(p.size.x<=0||p.size.y<=0||p.size.z<=0)throw new ArgumentException("Invalid lift solid: "+p.id);
                if(p.motion!="car"&&p.motion!="lower"&&p.motion!="upper"&&p.motion!="landing")throw new ArgumentException("Invalid lift motion: "+p.id);
                if(p.motion=="landing"&&(p.floor<0||p.floor>=floors))throw new ArgumentException("Invalid landing floor: "+p.id);
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
            var p=new LiftPose{id=spec.id,blocked=state.blocked,busy=Busy(time),landingDoors=spec.stops==null?null:new float[FloorCount]};next=double.PositiveInfinity;
            if(state.from==state.to){p.height=FloorHeight(state.to);p.carDoor=1;LandingDoor(p,state.to,1);return p;}
            double t=time-state.startTime;float fromDoor=0,toDoor=0;
            double close=spec.waitSeconds,travel=close+spec.doorSeconds,open=travel+TravelSeconds,end=open+spec.doorSeconds;
            if(t<close){p.height=FloorHeight(state.from);fromDoor=1;next=close-t;}
            else if(t<travel){p.height=FloorHeight(state.from);fromDoor=1-(float)((t-close)/spec.doorSeconds);next=travel-t;}
            else if(t<open)
            {
                var path=Travel;double at=t-travel;int i=0;while(i+2<path.Length&&path[i+1].x<=at)i++;
                var a=path[i];var b=path[i+1];float h=Mathf.Lerp(a.y,b.y,(float)((at-a.x)/(b.x-a.x)));
                p.height=FloorHeight(state.from)+(state.to>state.from?h:-h);p.moving=true;next=b.x-at;
            }
            else if(t<end){p.height=FloorHeight(state.to);toDoor=(float)((t-open)/spec.doorSeconds);next=end-t;}
            else{p.height=FloorHeight(state.to);toDoor=1;}
            p.carDoor=fromDoor+toDoor;LandingDoor(p,state.from,fromDoor);LandingDoor(p,state.to,toDoor);return p;
        }
        void LandingDoor(LiftPose pose,int floor,float open)
        {if(pose.landingDoors!=null)pose.landingDoors[floor]=open;if(floor==0)pose.lowerDoor=open;if(floor==FloorCount-1)pose.upperDoor=open;}
        Vector3 Center(int i,LiftPose pose)
        {
            var p=spec.parts[i];int floor=p.motion=="upper"?FloorCount-1:p.motion=="landing"?p.floor:0;
            float y=p.motion=="car"?pose.height:FloorHeight(floor);
            float door=p.motion=="car"?pose.carDoor:pose.landingDoors!=null?pose.landingDoors[floor]:floor==0?pose.lowerDoor:pose.upperDoor;
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
            var p=transform.InverseTransformPoint(position);float y=FloorHeight(state.from);
            return Mathf.Abs(p.x)<spec.doorWidth*.5f+radius&&Mathf.Abs(p.z-spec.doorZ)<radius+.20f&&p.y+height>y+.02f&&p.y<y+2.25f;
        }
        public void HoldDoor(double time,float dt,bool obstructed)
        {
            state.blocked=false;if(state.from==state.to)return;
            double t=time-state.startTime;
            if(obstructed&&t>=spec.waitSeconds&&t<spec.waitSeconds+spec.doorSeconds){state.startTime+=dt;state.blocked=true;}
        }
        public bool Request(Vector3 feet,double time,out string message)
        {return Request(feet,time,null,out message);}
        public bool Request(Vector3 feet,double time,string stop,out string message)
        {
            var p=transform.InverseTransformPoint(feet);var pose=Pose(time,out _);
            bool inside=Mathf.Abs(p.x)<spec.width*.5f-.25f&&Mathf.Abs(p.z)<spec.depth*.5f-.25f&&Mathf.Abs(p.y-pose.height)<.15f;
            int floor=-1;for(int i=0;i<FloorCount;i++)if(Mathf.Abs(p.y-FloorHeight(i))<.15f){floor=i;break;}
            bool outside=floor>=0&&Mathf.Abs(p.x)<spec.doorWidth*.5f+1&&p.z<spec.doorZ&&p.z>spec.doorZ-2;
            if(!inside&&!outside){message="Stand beside a lift button.";return false;}
            if(Busy(time)){message=state.blocked?"Clear the lift doorway.":"The lift is moving. Please wait.";return false;}
            int current=state.to,target=floor;
            if(inside)
            {
                if(stop==null&&FloorCount==2)target=1-current;
                else{target=spec.stops==null?-1:Array.FindIndex(spec.stops,s=>s.id==stop);if(target<0){message="Choose a lift floor.";return false;}}
            }
            else if(stop!=null){message="Choose a destination inside the lift.";return false;}
            if(target==current){message="Lift doors are open.";return true;}
            state.from=current;state.to=target;state.startTime=time;state.blocked=false;message=inside?"Lift departing.":"Lift called.";return true;
        }
    }
}
