using UnityEngine;

namespace Kyoto
{
    // Feet are the transform origin. Camera and throw orientation are owned by the game,
    // while this component owns collision-resolved translation only.
    [RequireComponent(typeof(CharacterController))]
    public sealed class FirstPersonWalker : MonoBehaviour
    {
        public float EyeHeight=1.65f,WalkSpeed=1.4f,TravelSpeed=4.2f;
        public CharacterController Capsule {get;private set;}
        public Vector3 Eye => transform.position+Vector3.up*EyeHeight;
        public bool Grounded {get;private set;}
        public CollisionFlags LastCollision {get;private set;}
        public Vector3 LastSafeFeet {get;private set;}
        float fallingSpeed;
        readonly RaycastHit[] groundHits=new RaycastHit[12];
        void Awake(){Configure();}
        public void Configure()
        {
            CollisionLayers.Configure();gameObject.layer=CollisionLayers.Player;
            Capsule=GetComponent<CharacterController>();Capsule.height=1.8f;Capsule.radius=.24f;
            Capsule.center=Vector3.up*.9f;Capsule.skinWidth=.025f;
            Capsule.slopeLimit=48;Capsule.stepOffset=.22f;Capsule.minMoveDistance=0;
            // The fixed walking meshes need swept movement, not PhysX's automatic
            // overlap recovery. At a ramp/handrail corner that recovery can undo
            // every move, even one directed away from the rail. Normal collision
            // detection, sliding, step-up and ground snapping remain enabled.
            Capsule.enableOverlapRecovery=false;
            LastSafeFeet=transform.position;
        }
        public void Place(Vector3 feet)
        {
            if(!Capsule)Configure();bool wasEnabled=Capsule.enabled;Capsule.enabled=false;
            transform.position=feet;Capsule.enabled=wasEnabled;fallingSpeed=0;LastSafeFeet=feet;
            Grounded=false;Physics.SyncTransforms();
        }
        public void Move(Vector2 input,float yaw,bool fast,float dt)
        {
            if(!Capsule||!Capsule.enabled||dt<=0)return;
            input=Vector2.ClampMagnitude(input,1);
            var direction=Quaternion.Euler(0,yaw,0)*new Vector3(input.x,0,input.y);
            float speed=fast?TravelSpeed:WalkSpeed;
            fallingSpeed=Grounded?-2:Mathf.Max(-30,fallingSpeed-9.81f*dt);
            var carry=Grounded?StationMotion.WalkingVelocity(gameObject.scene,transform.position):Vector3.zero;
            LastCollision=Capsule.Move((direction*speed+carry+Vector3.up*fallingSpeed)*dt);
            Grounded=(LastCollision&CollisionFlags.Below)!=0;
            // Follow descending slopes immediately. The cast starts at the lower capsule
            // hemisphere, queries only walking geometry, and never snaps across a large drop.
            if(fallingSpeed<=0&&!Grounded)
            {
                float snap=.24f+speed*dt;
                int count=Physics.SphereCastNonAlloc(transform.position+Vector3.up*.28f,.20f,Vector3.down,
                    groundHits,snap+.08f,CollisionLayers.WalkingMask,QueryTriggerInteraction.Ignore);
                float distance=float.PositiveInfinity;
                for(int i=0;i<count;i++)if(groundHits[i].normal.y>=Mathf.Cos(Capsule.slopeLimit*Mathf.Deg2Rad))
                    distance=Mathf.Min(distance,groundHits[i].distance);
                float drop=distance-.08f;
                if(drop>=-.015f&&drop<=snap)
                {
                    LastCollision|=Capsule.Move(Vector3.down*Mathf.Max(.01f,drop+.01f));
                    Grounded=(LastCollision&CollisionFlags.Below)!=0;
                }
            }
            if((LastCollision&CollisionFlags.Above)!=0&&fallingSpeed>0)fallingSpeed=0;
            if(Grounded){fallingSpeed=-2;LastSafeFeet=transform.position;}
            if(transform.position.y < -5)Place(LastSafeFeet);
        }
        public bool TryRelease(float yaw,float pitch,out Vector3 release,float ballRadius=BallBody.Radius)
        {
            Quaternion heading=Quaternion.Euler(0,yaw,0);
            Vector3 start=Eye;
            Vector3 desired=start+heading*new Vector3(.22f,-.15f,.42f);
            Vector3 delta=desired-start;
            release=desired;
            if(Physics.SphereCast(start,ballRadius+.006f,delta.normalized,out var hit,delta.magnitude,
                CollisionLayers.BallMask,QueryTriggerInteraction.Ignore))
                release=start+delta.normalized*Mathf.Max(0,hit.distance-.012f);
            if(Physics.CheckSphere(release,ballRadius+.004f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore))return false;
            // Also test a short segment in the outgoing direction, so a near-ceiling
            // release cannot start with the swept sphere already touching geometry.
            return !Physics.SphereCast(release,ballRadius,Quaternion.Euler(-pitch,yaw,0)*Vector3.forward,
                out _, .012f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
        }
    }
}
