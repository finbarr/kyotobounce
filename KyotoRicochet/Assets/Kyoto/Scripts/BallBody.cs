using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    // Unity supplies swept geometry. This sphere owns the entire contact response;
    // its kinematic rigidbody cannot add a second PhysX impulse.
    [RequireComponent(typeof(Rigidbody),typeof(SphereCollider))]
    public class BallBody : MonoBehaviour
    {
        // Legacy specimen dimensions retained for the Phase 1 diagnostics and
        // initial visual construction. Runtime queries use the instance Profile.
        public const float Radius=.025f, Mass=.06f, Step=1f/180f;
        public const float Inertia=.4f*Mass*Radius*Radius;
        public BallProfile Profile {get;private set;}=BallProfile.Prototype;
        const float Skin=.0002f;
        public Rigidbody Body {get;private set;}
        public Vector3 Velocity {get;private set;}
        public Vector3 AngularVelocity {get;private set;}
        public bool Sleeping {get;private set;}
        public bool Supported {get;private set;}
        public string LastContactSurface {get;private set;}="";
        public Vector3 ContactSurfaceVelocity=>contactSurfaceVelocity;
        public int ContactBudgetExhaustions {get;private set;}
        public float Clock {get;private set;}
        public float LastContactTime {get;private set;}=-10;
        public float CurrentRollingResistance {get;private set;}
        public float CurrentTorsionalResistance {get;private set;}
        public Vector3 ContactNormal {get;private set;}
        public event Action<Surface,Vector3,float> Impact;
        public event Action<ContactSample> Contact;
        public int StaticOverlapRecoveries {get;private set;}
        public float MaximumStaticOverlapDepth {get;private set;}
        SphereCollider sphere;
        Collider[] nearbyStatic=new Collider[32];
        Vector3 previousPosition;
        Quaternion previousRotation;
        float restingTime;
        Vector3 contactSurfaceVelocity;
        Transform[] visualChildren;
        Quaternion[] visualRotations;
        public Vector3 RenderPosition => Vector3.Lerp(previousPosition,Body.position,Mathf.Clamp01((Time.time-Time.fixedTime)/Time.fixedDeltaTime));
        public Quaternion RenderRotation => Quaternion.Slerp(previousRotation,Body.rotation,Mathf.Clamp01((Time.time-Time.fixedTime)/Time.fixedDeltaTime));
        void Awake(){Configure();}
        public void Configure()
        {
            Body=GetComponent<Rigidbody>();Body.mass=Profile.mass_kg;Body.isKinematic=true;Body.useGravity=false;
            Body.interpolation=RigidbodyInterpolation.None;
            sphere=GetComponent<SphereCollider>();sphere.radius=Profile.radius_m;sphere.isTrigger=true;sphere.contactOffset=Skin;
            // Unity ignores the inertia assignment while this actor is kinematic.
            // Configure it before restoring kinematic ownership, with no physics
            // simulation between the two state changes.
            Body.isKinematic=false;Body.automaticInertiaTensor=false;
            Body.inertiaTensor=Vector3.one*Profile.Inertia;Body.isKinematic=true;
            previousPosition=Body.position;previousRotation=Body.rotation;
        }
        public void SetProfile(BallProfile profile)
        {
            if(profile==null||profile.mass_kg<=0||profile.radius_m<=0||profile.inertia_factor<=0)
                throw new ArgumentException("Ball profile requires positive mass, radius and inertia.");
            float scale=profile.radius_m/Profile.radius_m;
            for(int i=0;i<transform.childCount;i++)transform.GetChild(i).localScale*=scale;
            Profile=profile;Configure();
        }
        public void Launch(Vector3 position,Vector3 velocity,Vector3 spin)
        {
            Body.position=previousPosition=position;Body.rotation=previousRotation=Quaternion.identity;
            Velocity=velocity;AngularVelocity=Vector3.ClampMagnitude(spin,Mathf.Min(SpinControls.MaximumSpin,Profile.maximum_launch_spin_rad_s));
            Sleeping=false;restingTime=Clock=0;LastContactTime=-10;ContactBudgetExhaustions=0;contactSurfaceVelocity=Vector3.zero;
            StaticOverlapRecoveries=0;MaximumStaticOverlapDepth=0;
            Supported=false;LastContactSurface="";ContactNormal=Vector3.zero;CurrentRollingResistance=CurrentTorsionalResistance=0;
        }
        public void SetPose(Vector3 position,Quaternion rotation)
        {Body.position=previousPosition=position;Body.rotation=previousRotation=rotation;}
        Vector3 EndVelocity(Vector3 velocity,float dt)
        {
            float drag=.00055f*(Profile.radius_m/Radius)*(Profile.radius_m/Radius)/Profile.mass_kg;
            Vector3 acceleration=Physics.gravity-drag*velocity.magnitude*velocity;
            Vector3 midpoint=velocity+acceleration*(dt*.5f);
            return velocity+(Physics.gravity-drag*midpoint.magnitude*midpoint)*dt;
        }
        static Quaternion Rotate(Quaternion q,Vector3 w,float dt)
        {float speed=w.magnitude;return speed>.00001f?Quaternion.AngleAxis(speed*dt*Mathf.Rad2Deg,w/speed)*q:q;}
        static float SweepEndpointGuard(Vector3 position,Vector3 delta)
        {
            // A Float32 center update and PhysX's cast-distance calculation can
            // round on opposite sides of a face. Cover that endpoint uncertainty
            // so the next sweep does not begin microscopically inside the mesh.
            // Two relative Float32 epsilons, with a one-micrometre local floor;
            // the physical radius and response coefficients are unchanged.
            float scale=Mathf.Max(Mathf.Abs(position.x)+Mathf.Abs(delta.x),
                Mathf.Max(Mathf.Abs(position.y)+Mathf.Abs(delta.y),Mathf.Abs(position.z)+Mathf.Abs(delta.z)));
            return Mathf.Max(.000001f,scale*2.3841858e-7f);
        }
        bool StaticSweep(PhysicsScene scene,Vector3 position,Vector3 displacement,float dt,out RaycastHit hit,out float time)
        {
            float distance=displacement.magnitude;time=dt;hit=default;
            if(distance<=1e-9f||!scene.SphereCast(position,Profile.radius_m,displacement/distance,out hit,distance+SweepEndpointGuard(position,displacement),CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore))return false;
            time=dt*Mathf.Clamp01(hit.distance/distance);
            if(!(hit.collider is CapsuleCollider)&&!(hit.collider is MeshCollider))return true;
            // On a round rail or triangulated surface, a long accelerated chord can
            // shift the surface normal enough to change a fast rebound. Refine
            // that candidate along the accelerated path. Every shorter sweep
            // still queries the whole scene, so a nearer shape keeps priority.
            float drag=.00055f*(Profile.radius_m/Radius)*(Profile.radius_m/Radius)/Profile.mass_kg;
            float maxSpeed=Velocity.magnitude+Physics.gravity.magnitude*dt;
            float sagitta=(Physics.gravity.magnitude+drag*maxSpeed*maxSpeed)*dt*dt*.125f;
            int segments=Mathf.CeilToInt(Mathf.Sqrt(sagitta/.000001f));
            if(segments<=1)return true;
            Vector3 start=position;float from=0;
            for(int i=1;i<=segments;i++)
            {
                float until=dt*i/segments;
                Vector3 end=position+(Velocity+EndVelocity(Velocity,until))*(.5f*until),delta=end-start;
                float length=delta.magnitude;
                if(length>1e-9f&&scene.SphereCast(start,Profile.radius_m,delta/length,out hit,length+SweepEndpointGuard(start,delta),CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore))
                {time=Mathf.Lerp(from,until,Mathf.Clamp01(hit.distance/length));return true;}
                start=end;from=until;
            }
            hit=default;time=dt;return false;
        }
        bool InitialStaticContact(PhysicsScene scene,Vector3 position,out Collider collider,out Vector3 normal,out Vector3 point)
        {
            // A valid sweep endpoint can round a fraction of a micrometre
            // inside a surface. SphereCast ignores shapes already overlapping
            // its starting sphere, so recover that overlap before sweeping.
            // The same contact response below handles approaching velocity;
            // separating motion receives only the geometric correction.
            int count;
            while((count=scene.OverlapSphere(position,Profile.radius_m+Skin,nearbyStatic,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore))==nearbyStatic.Length)
                Array.Resize(ref nearbyStatic,nearbyStatic.Length*2);
            collider=null;normal=point=Vector3.zero;float deepest=0;
            for(int i=0;i<count;i++)
            {
                var other=nearbyStatic[i];
                if(other==sphere)continue;
                if(Physics.ComputePenetration(sphere,position,Quaternion.identity,other,other.transform.position,other.transform.rotation,out var direction,out float depth)&&depth>deepest)
                {deepest=depth;normal=direction.normalized;collider=other;}
            }
            if(!collider)return false;
            point=position+normal*(deepest-Profile.radius_m);
            StaticOverlapRecoveries++;MaximumStaticOverlapDepth=Mathf.Max(MaximumStaticOverlapDepth,deepest);return true;
        }
        public void BeforeStep(float dt)
        {
            previousPosition=Body.position;previousRotation=Body.rotation;Clock+=dt;
            bool movingWorld=StationMotion.Active(gameObject.scene);
            double worldTime=StationMotion.Time(gameObject.scene);
            if(Sleeping&&!(movingWorld&&StationMotion.Sweep(gameObject.scene,Body.position,Vector3.zero,Profile.radius_m+Skin,worldTime,dt,out _)))
            {if(movingWorld){StationMotion.Advance(gameObject.scene,dt);if(StationMotion.UpdatesGeometry(gameObject.scene))Physics.SyncTransforms();}return;}
            Sleeping=false;
            var scene=gameObject.scene.GetPhysicsScene();
            Vector3 position=Body.position;Quaternion rotation=Body.rotation;
            float remaining=dt;
            for(int contact=0;contact<12&&remaining>1e-7f;contact++)
            {
                Vector3 end=EndVelocity(Velocity,remaining);
                Vector3 displacement=(Velocity+end)*(.5f*remaining);
                float distance=displacement.magnitude;
                bool found=false;float time=remaining;Vector3 point=Vector3.zero,normal=Vector3.zero,surfaceVelocity=Vector3.zero;
                Collider collider=null;Surface surface=null;
                if(InitialStaticContact(scene,position,out collider,out normal,out point))
                {found=true;time=0;surface=collider.GetComponentInParent<Surface>();surfaceVelocity=surface?surface.contactVelocity:Vector3.zero;}
                else if(StaticSweep(scene,position,displacement,remaining,out RaycastHit hit,out float staticTime))
                {
                    found=true;time=staticTime;point=hit.point;normal=hit.normal;
                    collider=hit.collider;surface=collider.GetComponentInParent<Surface>();
                    surfaceVelocity=surface?surface.contactVelocity:Vector3.zero;
                }
                if(movingWorld&&StationMotion.Sweep(gameObject.scene,position,displacement,Profile.radius_m,worldTime+dt-remaining,remaining,out var moving)
                    &&(!found||moving.time<time))
                {found=true;time=moving.time;point=moving.point;normal=moving.normal;collider=moving.collider;surface=moving.surface;surfaceVelocity=moving.velocity;}
                if(!found)
                {position+=displacement;rotation=Rotate(rotation,AngularVelocity,remaining);Velocity=end;remaining=0;break;}
                Velocity=EndVelocity(Velocity,time);rotation=Rotate(rotation,AngularVelocity,time);
                position=point+normal*(Profile.radius_m+Skin);
                float vn=Vector3.Dot(Velocity-surfaceVelocity,normal);
                var material=collider.sharedMaterial;
                if(vn<0)
                {
                    Vector3 incomingVelocity=Velocity,incomingSpin=AngularVelocity;
                    bool reference=surface&&surface.useBallReferenceResponse;
                    // Numerical settling regularization, not a measured rubber
                    // restitution curve. Keep the fitted event unchanged above
                    // 0.30 m/s and avoid a discontinuity at the old 0.15 cutoff.
                    float impactWeight=Mathf.SmoothStep(0,1,Mathf.InverseLerp(.12f,.30f,-vn));
                    var pair=Profile.response;
                    float restitution=impactWeight*(reference?pair.normal_restitution:(material?material.bounciness:.7f));
                    float friction=reference?pair.sliding_friction:(material?material.dynamicFriction:.3f);
                    float tangent=impactWeight*(reference?pair.grip_restitution:(surface?surface.tangentialRestitution:0));
                    var response=BallContactModel.Resolve(Velocity-surfaceVelocity,AngularVelocity,normal,Profile,restitution,friction,tangent,
                        reference?impactWeight*pair.normal_offset_fraction_of_radius:0);
                    Velocity=response.velocity+surfaceVelocity;AngularVelocity=response.spin;
                    Contact?.Invoke(new ContactSample { time=Clock-remaining+time, point=point,normal=normal,worldTime=worldTime+dt-remaining+time,surfaceVelocity=surfaceVelocity,
                        incomingVelocity=incomingVelocity,outgoingVelocity=Velocity,incomingSpin=incomingSpin,outgoingSpin=AngularVelocity,
                        slip=response.slip,normalImpulse=response.normalImpulse,tangentImpulse=response.tangentImpulse,
                        deformationAngularImpulse=response.deformationAngularImpulse,mass=Profile.mass_kg,inertia=Profile.Inertia,
                        profileId=Profile.id,surfaceId=surface?surface.surfaceId:"unclassified" });
                    LastContactTime=Clock;ContactNormal=normal;contactSurfaceVelocity=surfaceVelocity;CurrentRollingResistance=surface?surface.rollingResistance:.012f;
                    LastContactSurface=surface?surface.surfaceId:"unclassified";
                    CurrentTorsionalResistance=surface?surface.torsionalResistance:Surface.DefaultTorsionalResistance;
                    if(-vn>.28f)Impact?.Invoke(surface,point,-vn);
                }
                remaining-=Mathf.Max(time,Mathf.Min(remaining,dt*.002f));
            }
            if(remaining>1e-7f)ContactBudgetExhaustions++;
            if(movingWorld){StationMotion.Advance(gameObject.scene,dt);if(StationMotion.UpdatesGeometry(gameObject.scene))Physics.SyncTransforms();}
            float load=Mathf.Max(0,-Vector3.Dot(Physics.gravity,ContactNormal));
            // A recent impact is not sustained support. Require a nearby surface
            // with the same normal and no separating rebound before applying
            // load torques. Gravity supplies the frame, including tilted worlds.
            bool supported=load>0&&Clock-LastContactTime<dt*2.1f
                &&Vector3.Dot(Velocity-contactSurfaceVelocity,ContactNormal)<=.01f
                &&((scene.SphereCast(position,Profile.radius_m,-ContactNormal,out RaycastHit support,2*Skin,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore)
                    &&Vector3.Dot(support.normal,ContactNormal)>.99f)
                   ||(movingWorld&&StationMotion.Probe(gameObject.scene,position,-ContactNormal*(2*Skin),Profile.radius_m,out var movingSupport)
                    &&Vector3.Dot(movingSupport.normal,ContactNormal)>.99f));
            Supported=supported;
            if(supported)
            {
                var normalSpin=Vector3.Project(AngularVelocity,ContactNormal);
                var rollingSpin=AngularVelocity-normalSpin;
                float torqueScale=Profile.mass_kg*load*Profile.radius_m/Profile.Inertia*dt;
                AngularVelocity=Vector3.MoveTowards(rollingSpin,Vector3.zero,CurrentRollingResistance*torqueScale)
                    +Vector3.MoveTowards(normalSpin,Vector3.zero,CurrentTorsionalResistance*torqueScale);
                // Ignore sub-millimeter normal motion across the query skin when sleeping.
                // A nearby escalator envelope is not contact. Fixed trim and landings
                // may rest normally; an actual incoming tread wakes the sphere above.
                bool quiet=contactSurfaceVelocity.sqrMagnitude<1e-8f
                    &&Vector3.ProjectOnPlane(Velocity-contactSurfaceVelocity,ContactNormal).magnitude<.025f
                    &&Mathf.Abs(Vector3.Dot(Velocity-contactSurfaceVelocity,ContactNormal))<.10f&&AngularVelocity.magnitude<.75f;
                restingTime=quiet?restingTime+dt:0;
                if(restingTime>.4f){Sleeping=true;Velocity=AngularVelocity=Vector3.zero;}
            }
            else restingTime=0;
            Body.position=position;Body.rotation=rotation;
        }
        void LateUpdate()
        {
            // Interpolation touches only visual children, never the simulated center.
            if(visualChildren==null||visualChildren.Length!=transform.childCount)
            {
                visualChildren=new Transform[transform.childCount];visualRotations=new Quaternion[transform.childCount];
                for(int i=0;i<visualChildren.Length;i++){visualChildren[i]=transform.GetChild(i);visualRotations[i]=visualChildren[i].localRotation;}
            }
            Vector3 offset=transform.InverseTransformPoint(RenderPosition);
            Quaternion delta=Quaternion.Inverse(Body.rotation)*RenderRotation;
            for(int i=0;i<visualChildren.Length;i++){visualChildren[i].localPosition=offset;visualChildren[i].localRotation=delta*visualRotations[i];}
        }
    }
}
