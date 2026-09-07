#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto
{
    // Independent low-speed and sustained-contact checks. Impact calibration is
    // assessed elsewhere; rolling/torsional coefficients here are test fixtures.
    public static class SustainedContactVerification
    {
        static readonly List<string> report=new List<string>();
        static int failed;
        static void Check(bool ok,string label,string detail)
        {string line=(ok?"PASS ":"FAIL ")+label+": "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            var args=Environment.GetCommandLineArgs();
            if(!Array.Exists(args,a=>a=="--kyoto-sustained-contact"))return;
            string output=null;
            foreach(var a in args)if(a.StartsWith("--kyoto-evidence="))output=a.Substring("--kyoto-evidence=".Length);
            try{if(string.IsNullOrEmpty(output))throw new ArgumentException("Explicit evidence path required.");Run(output);Application.Quit(0);}
            catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        static ShotSimulation Floor(Quaternion frame,float rolling=.012f,float torsion=.002f)
        {
            var sim=new ShotSimulation(false,profile:BallProfile.Phase2Default);
            var obj=StationGeometry.Box(sim.Root,"Sustained-contact fixture",frame*new Vector3(0,-.25f,0),new Vector3(100,.5f,100),Surface.Material("Fixture",.9f,.4f),"fixture","FIXTURE");
            obj.transform.rotation=frame;var s=obj.GetComponent<Surface>();s.useBallReferenceResponse=true;s.rollingResistance=rolling;s.torsionalResistance=torsion;
            return sim;
        }
        public static void Run(string output="../artifacts/phase2/sustained-contact/current")
        {
            report.Clear();failed=0;Directory.CreateDirectory(output);
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; profile={BallProfile.Phase2Default.id}");
            var gravity=Physics.gravity;
            try{Continuity(output);Airborne();Rolling(output);Sliding(output);Torsion();Rest();}
            finally{Physics.gravity=gravity;File.WriteAllLines(Path.Combine(output,"verification.txt"),report);}
            if(failed>0)throw new Exception(failed+" sustained-contact checks failed.");
        }
        static void Continuity(string output)
        {
            Physics.gravity=Vector3.zero;
            using(var sim=Floor(Quaternion.identity))
            using(var csv=new StreamWriter(Path.Combine(output,"low-speed-impacts.csv")))
            {
                csv.WriteLine("incoming_normal_m_s,outgoing_normal_m_s,outgoing_forward_m_s,outgoing_spin_rad_s");
                ContactSample sample=default;bool hit=false;sim.Ball.Contact+=s=>{if(!hit){sample=s;hit=true;}};
                Vector3 previous=Vector3.zero,previousSpin=Vector3.zero;float maxJump=0,maxSpinJump=0,maxJumpSpeed=0,maxEnergy=0,maxAngularResidual=0;int misses=0;
                for(int i=10;i<=300;i++)
                {
                    float speed=i*.001f;hit=false;
                    sim.Ball.Launch(new Vector3(0,sim.Ball.Profile.radius_m+.0001f,0),new Vector3(0,-speed,.05f),new Vector3(-2,0,0));Physics.SyncTransforms();
                    for(int step=0;step<10&&!hit;step++)sim.Ball.BeforeStep(BallBody.Step);
                    if(!hit){misses++;continue;}
                    float jump=Vector3.Distance(sample.outgoingVelocity,previous);
                    if(i>10&&jump>maxJump){maxJump=jump;maxJumpSpeed=speed;}previous=sample.outgoingVelocity;
                    if(i>10)maxSpinJump=Mathf.Max(maxSpinJump,Vector3.Distance(sample.outgoingSpin,previousSpin));previousSpin=sample.outgoingSpin;
                    maxEnergy=Mathf.Max(maxEnergy,sample.EnergyAfter/sample.EnergyBefore);
                    var residual=sample.inertia*(sample.outgoingSpin-sample.incomingSpin)
                        -Vector3.Cross(-sample.normal*sim.Ball.Profile.radius_m,sample.tangentImpulse)-sample.deformationAngularImpulse;
                    maxAngularResidual=Mathf.Max(maxAngularResidual,residual.magnitude);
                    csv.WriteLine(FormattableString.Invariant($"{speed:R},{sample.outgoingVelocity.y:R},{sample.outgoingVelocity.z:R},{sample.outgoingSpin.x:R}"));
                }
                Check(misses==0&&maxJump<.006f&&maxSpinJump<1f,"Low-speed rebound continuity",$"291 velocities at 0.001 m/s spacing; missing={misses}; max adjacent jump={maxJump:R} m/s at {maxJumpSpeed:R}; max spin jump={maxSpinJump:R} rad/s");
                Check(maxEnergy<=1.00001f&&maxAngularResidual<1e-7f,"Low-speed energy and angular impulse accounting",$"max kinetic energy ratio={maxEnergy:R}; max angular residual={maxAngularResidual:R} kg m2/s");
            }
        }
        static void Airborne()
        {
            Physics.gravity=Vector3.down*9.81f;
            using(var sim=Floor(Quaternion.identity))
            {
                bool hit=false;ContactSample first=default;sim.Ball.Contact+=s=>{if(!hit){first=s;hit=true;}};
                sim.Ball.Launch(new Vector3(0,.2f,0),new Vector3(0,-3,.5f),new Vector3(30,40,0));Physics.SyncTransforms();
                for(int i=0;i<30&&!hit;i++)sim.Ball.BeforeStep(BallBody.Step);
                float loss=Vector3.Distance(sim.Ball.AngularVelocity,first.outgoingSpin);
                for(int i=0;i<10;i++){sim.Ball.BeforeStep(BallBody.Step);loss=Mathf.Max(loss,Vector3.Distance(sim.Ball.AngularVelocity,first.outgoingSpin));}
                Check(hit&&sim.Ball.Velocity.y>0&&loss<1e-5f,"Ground resistance stops on separation",$"maximum spin change after rebound={loss:R} rad/s; outgoing normal={first.outgoingVelocity.y:R}");
            }
        }
        // Rolling equations: (1+k) dv/dt = -c_r*g - drag*v^2,
        // omega=v/R. Integrate independently at 10 kHz, not via BallBody.
        static Vector2 RollingReference(BallProfile p,float duration,float rolling)
        {
            double v=.5,x=0,dt=.0001,drag=.00055*Math.Pow(p.radius_m/BallBody.Radius,2)/p.mass_kg;
            for(int i=0;i<(int)Math.Round(duration/dt);i++)
            {double a=-(rolling*9.81+drag*v*v)/(1+p.inertia_factor);double mid=Math.Max(0,v+a*dt*.5);x+=mid*dt;v=Math.Max(0,v-(rolling*9.81+drag*mid*mid)/(1+p.inertia_factor)*dt);}
            return new Vector2((float)x,(float)v);
        }
        static void Rolling(string output)
        {
            Physics.gravity=Vector3.down*9.81f;var positions=new List<float>();
            using(var csv=new StreamWriter(Path.Combine(output,"rolling.csv")))
            {
                csv.WriteLine("hz,time,z,forward_m_s,rolling_rad_s,slip_m_s,reference_z,reference_v");
                foreach(int hz in new[]{90,180,360})using(var sim=Floor(Quaternion.identity))
                {
                    var p=sim.Ball.Profile;sim.Ball.Launch(new Vector3(0,p.radius_m+.0002f,0),Vector3.forward*.5f,Vector3.right*(.5f/p.radius_m));Physics.SyncTransforms();
                    float slip=0;
                    for(int i=0;i<hz*2;i++)
                    {
                        sim.Ball.BeforeStep(1f/hz);slip=Mathf.Max(slip,Mathf.Abs(sim.Ball.Velocity.z-p.radius_m*sim.Ball.AngularVelocity.x));
                        if(i%(hz/30)==0){var exact=RollingReference(p,(i+1f)/hz,.012f);csv.WriteLine(FormattableString.Invariant($"{hz},{(i+1f)/hz:R},{sim.Ball.Body.position.z:R},{sim.Ball.Velocity.z:R},{sim.Ball.AngularVelocity.x:R},{slip:R},{exact.x:R},{exact.y:R}"));}
                    }
                    var target=RollingReference(p,2,.012f);positions.Add(sim.Ball.Body.position.z);
                    Check(Mathf.Abs(sim.Ball.Body.position.z-target.x)<.005f&&Mathf.Abs(sim.Ball.Velocity.z-target.y)<.01f&&slip<.005f&&sim.Ball.ContactBudgetExhaustions==0,
                        "Rolling torque and static friction at "+hz+" Hz",$"position={sim.Ball.Body.position.z:R} expected={target.x:R}; speed={sim.Ball.Velocity.z:R} expected={target.y:R}; max slip={slip:R}; budgets={sim.Ball.ContactBudgetExhaustions}");
                }
            }
            Check(Mathf.Abs(positions[0]-positions[2])<.005f,"Sustained rolling timestep convergence",$"90/360 Hz distance difference={Mathf.Abs(positions[0]-positions[2]):R} m over 2 s");
        }
        static Vector3 SlidingReference(BallProfile p,float duration)
        {
            double v=1,w=0,x=0,dt=.0001,r=p.radius_m,k=p.inertia_factor;
            double drag=.00055*Math.Pow(r/BallBody.Radius,2)/p.mass_kg,mu=p.response.sliding_friction;
            for(int i=0;i<(int)Math.Round(duration/dt);i++)
            {
                double old=v,slip=v-r*w;
                if(Math.Abs(slip)<1e-8){v-=drag*v*v/(1+k)*dt;w=v/r;}
                else
                {
                    double f=-mu*9.81*Math.Sign(slip);v+=(-drag*v*v+f)*dt;w-=f/(k*r)*dt;
                    // Resolve only the remainder of the time interval at the
                    // independently detected sliding-to-rolling crossing.
                    double after=v-r*w;
                    if(after*slip<=0){double j=-after/(1+1/k);v+=j;w-=j/(k*r);}
                }
                x+=(old+v)*.5*dt;
            }
            return new Vector3((float)x,(float)v,(float)w);
        }
        static void Sliding(string output)
        {
            Physics.gravity=Vector3.down*9.81f;
            using(var csv=new StreamWriter(Path.Combine(output,"sliding-to-rolling.csv")))
            {
                csv.WriteLine("hz,time,z,forward_m_s,spin_rad_s,slip_m_s");
                foreach(int hz in new[]{90,180,360})using(var sim=Floor(Quaternion.identity,0,0))
                {
                    var p=sim.Ball.Profile;var target=SlidingReference(p,2);
                    sim.Ball.Launch(new Vector3(0,p.radius_m+.0002f,0),Vector3.forward,Vector3.zero);Physics.SyncTransforms();
                    float minSlip=0;
                    for(int i=0;i<hz*2;i++)
                    {
                        sim.Ball.BeforeStep(1f/hz);float slip=sim.Ball.Velocity.z-p.radius_m*sim.Ball.AngularVelocity.x;minSlip=Mathf.Min(minSlip,slip);
                        if(i%(hz/30)==0)csv.WriteLine(FormattableString.Invariant($"{hz},{(i+1f)/hz:R},{sim.Ball.Body.position.z:R},{sim.Ball.Velocity.z:R},{sim.Ball.AngularVelocity.x:R},{slip:R}"));
                    }
                    Check(Mathf.Abs(sim.Ball.Body.position.z-target.x)<.005f&&Mathf.Abs(sim.Ball.Velocity.z-target.y)<.005f
                        &&Mathf.Abs(sim.Ball.AngularVelocity.x-target.z)<.15f&&minSlip>-.005f&&sim.Ball.ContactBudgetExhaustions==0,
                        "Sliding reaches rolling at "+hz+" Hz",$"position={sim.Ball.Body.position.z:R} expected={target.x:R}; speed={sim.Ball.Velocity.z:R} expected={target.y:R}; spin={sim.Ball.AngularVelocity.x:R} expected={target.z:R}; minimum slip={minSlip:R}");
                }
            }
        }
        static void Torsion()
        {
            foreach(var frame in new[]{Quaternion.identity,Quaternion.Euler(0,0,90)})
            foreach(int hz in new[]{90,180,360})using(var sim=Floor(frame))
            {
                Physics.gravity=frame*(Vector3.down*9.81f);var p=sim.Ball.Profile;
                sim.Ball.Launch(frame*new Vector3(0,p.radius_m+.0002f,0),Vector3.zero,frame*(Vector3.up*100));Physics.SyncTransforms();
                for(int i=0;i<hz*2;i++)sim.Ball.BeforeStep(1f/hz);
                float expected=100-.002f*p.mass_kg*9.81f*p.radius_m/p.Inertia*2;
                float actual=Vector3.Dot(sim.Ball.AngularVelocity,frame*Vector3.up);
                Check(Mathf.Abs(actual-expected)<.05f&&Vector3.ProjectOnPlane(sim.Ball.Velocity,frame*Vector3.up).magnitude<1e-5f,
                    "Pure torsion under sustained load",$"frame={frame.eulerAngles}; hz={hz}; normal spin={actual:R} expected={expected:R}");
            }
        }
        static void Rest()
        {
            Physics.gravity=Vector3.down*9.81f;
            using(var sim=Floor(Quaternion.identity))
            {
                var p=sim.Ball.Profile;sim.Ball.Launch(new Vector3(0,p.radius_m+.0002f,0),Vector3.zero,Vector3.zero);Physics.SyncTransforms();
                for(int i=0;i<360;i++)sim.Ball.BeforeStep(BallBody.Step);
                Check(sim.Ball.Sleeping&&Mathf.Abs(sim.Ball.Body.position.y-p.radius_m)<.0005f&&sim.Ball.ContactBudgetExhaustions==0,"Resting sphere settles at the floor",$"sleeping={sim.Ball.Sleeping}; clearance={sim.Ball.Body.position.y-p.radius_m:R}; budgets={sim.Ball.ContactBudgetExhaustions}");
            }
        }
    }
}
#endif
