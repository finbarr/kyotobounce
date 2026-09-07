using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class ReferenceBallVerification
    {
        static readonly List<string> report=new List<string>();
        static int failed;
        static float F(string s)=>float.Parse(s,CultureInfo.InvariantCulture);
        static void Check(bool ok,string name,string detail="")
        {var line=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
        static BallContactModel.Result Resolve(Vector3 v,Vector3 w,Vector3 n,BallProfile p)
        {var r=p.response;return BallContactModel.Resolve(v,w,n,p,r.normal_restitution,r.sliding_friction,r.grip_restitution,r.normal_offset_fraction_of_radius);}
        public static void Run()
        {
            report.Clear();failed=0;var p=BallProfile.Cross2014();
            Check(Application.isPlaying,"Reference model runs inside Unity Play mode");
            var lines=File.ReadAllLines("../artifacts/phase2/calibration/cross-2014/runtime-cases.csv");
            int holdouts=0,misses=0;float parity=0;
            for(int i=1;i<lines.Length;i++)
            {
                var c=lines[i].Split(',');float angle=F(c[2])*Mathf.Deg2Rad;
                bool normal=c[5]=="",passed=true;
                foreach(float speed in new[]{4f,5.25f,6.5f})
                {
                    var incoming=new Vector3(0,-Mathf.Sin(angle),Mathf.Cos(angle))*speed;
                    var spin=Vector3.right*(F(c[3])*speed/p.radius_m);
                    var result=Resolve(incoming,spin,Vector3.up,p);
                    float en=result.velocity.y/-incoming.y;
                    float ratio=normal?0:result.velocity.z/incoming.z;
                    float delta=(result.spin.x-spin.x)*p.radius_m/speed;
                    parity=Mathf.Max(parity,Mathf.Abs(en-F(c[7])));
                    if(!normal)parity=Mathf.Max(parity,Mathf.Abs(ratio-F(c[8])),Mathf.Abs(delta-F(c[9])));
                    passed&=Mathf.Abs(en/F(c[4])-1)<=.10f;
                    if(!normal)passed&=Mathf.Abs(ratio/F(c[5])-1)<=.10f&&Mathf.Abs(delta/F(c[6])-1)<=.15f;
                }
                if(c[1]=="holdout"){holdouts++;Check(passed,"Measured holdout "+c[0]);}
                else if(!passed){misses++;report.Add("MODEL_MISS "+c[0]+" exceeds nominal spin target; reference calibration remains incomplete.");}
            }
            Check(holdouts==4&&lines.Length==16,"Fifteen measured observations, four fixed holdouts");
            Check(parity<.00001f,"C# response agrees with fitted equations",parity.ToString("R"));
            Check(misses==2,"Known fitting misses remain visible",misses+" cases; not a passed calibration gate");
            Invariants(p);Continuity(p);PhysicalProfile(p);
            Directory.CreateDirectory("../artifacts/phase2/calibration/cross-2014");
            File.WriteAllLines("../artifacts/phase2/calibration/cross-2014/unity-verification.txt",report);
            if(failed>0)throw new Exception(failed+" reference implementation checks failed.");
        }
        static void Invariants(BallProfile p)
        {
            var rng=new System.Random(2014);float maxEnergy=0,maxResidual=0,maxFrame=0;
            float Rand(float a,float b)=>a+(b-a)*(float)rng.NextDouble();
            var frame=Quaternion.Euler(31,117,-42);
            for(int i=0;i<6000;i++)
            {
                var v=new Vector3(Rand(-15,15),-Rand(.01f,12),Rand(-15,15));
                var w=Vector3.ClampMagnitude(new Vector3(Rand(-200,200),Rand(-200,200),Rand(-200,200)),200);
                var r=Resolve(v,w,Vector3.up,p);
                float before=p.mass_kg*v.sqrMagnitude+p.Inertia*w.sqrMagnitude;
                float after=p.mass_kg*r.velocity.sqrMagnitude+p.Inertia*r.spin.sqrMagnitude;
                maxEnergy=Mathf.Max(maxEnergy,after/before);
                var residual=p.Inertia*(r.spin-w)-Vector3.Cross(-Vector3.up*p.radius_m,r.tangentImpulse)-r.deformationAngularImpulse;
                maxResidual=Mathf.Max(maxResidual,residual.magnitude);
                var rotated=Resolve(frame*v,frame*w,frame*Vector3.up,p);
                maxFrame=Mathf.Max(maxFrame,Vector3.Distance(rotated.velocity,frame*r.velocity),p.radius_m*Vector3.Distance(rotated.spin,frame*r.spin));
            }
            Check(maxEnergy<=1.000002f,"6000 mixed-spin impacts are passive",maxEnergy.ToString("R"));
            Check(maxResidual<1e-7f,"Angular impulse includes the explicit deformation torque",maxResidual.ToString("R"));
            Check(maxFrame<.0001f,"Reference response is invariant under floor/wall/slope rotation",maxFrame.ToString("R"));
            var none=Resolve(new Vector3(0,-3,1),Vector3.zero,Vector3.up,p);
            var axial=Resolve(new Vector3(0,-3,1),Vector3.up*200,Vector3.up,p);
            Check(Vector3.Distance(none.velocity,axial.velocity)<1e-6f&&Mathf.Abs(axial.spin.y-200)<1e-6f,"Normal-axis spin is separate from lateral impulse and deformation torque");
        }
        static void Continuity(BallProfile p)
        {
            // Traverse both sides of the actual cap equality, with two decreasing
            // perturbation sizes. A finite branch jump would not halve with h.
            float cap=p.response.sliding_friction*(1+p.response.normal_restitution)*3;
            float boundary=cap*(1+1/p.inertia_factor)/(1+p.response.grip_restitution);
            float previous=0;
            foreach(float h in new[]{.0002f,.0001f})
            {
                var a=Resolve(new Vector3(0,-3,boundary-h),Vector3.zero,Vector3.up,p);
                var b=Resolve(new Vector3(0,-3,boundary+h),Vector3.zero,Vector3.up,p);
                float difference=Vector3.Distance(a.velocity,b.velocity)+p.radius_m*Vector3.Distance(a.spin,b.spin);
                Check(difference<8*h,"Continuous slip/grip boundary","h="+h+" delta="+difference);
                if(previous>0)Check(difference<previous*.55f,"Boundary difference decreases with perturbation");
                previous=difference;
            }
        }
        static void PhysicalProfile(BallProfile p)
        {
            using(var sim=new ShotSimulation(false,profile:p))
            {
                var floor=StationGeometry.Box(sim.Root,"Reference granite",new Vector3(0,-.1f,0),new Vector3(20,.2f,20),Surface.Material("Reference",.1f,.01f),"reference-granite","REFERENCE");
                floor.GetComponent<Surface>().useBallReferenceResponse=true;
                Physics.SyncTransforms();
                Check(Mathf.Abs(sim.Ball.GetComponent<SphereCollider>().radius-.023f)<1e-7f&&Mathf.Abs(sim.Ball.Body.mass-.0462f)<1e-7f
                    &&Vector3.Distance(sim.Ball.Body.inertiaTensor,Vector3.one*p.Inertia)<1e-9f&&!sim.Ball.Body.automaticInertiaTensor,
                    "Profile drives radius, mass and inertia",sim.Ball.Body.inertiaTensor.ToString("R")+" automatic="+sim.Ball.Body.automaticInertiaTensor+" mass="+sim.Ball.Body.mass);
                ContactSample hit=default;bool found=false;
                sim.Ball.Contact+=s=>{if(!found){hit=s;found=true;}};
                sim.Run(new Vector3(0,.3f,0),new Vector3(0,-4,2),Vector3.right*-80,.3f);
                Check(found,"Reference profile reaches actual Unity swept geometry");
                var expected=Resolve(hit.incomingVelocity,hit.incomingSpin,hit.normal,p);
                Check(Vector3.Distance(expected.velocity,hit.outgoingVelocity)<1e-6f&&Vector3.Distance(expected.spin,hit.outgoingSpin)<1e-5f,"Live BallBody uses the shared reference response");
                Check(hit.profileId==p.id&&Mathf.Abs(hit.mass-p.mass_kg)<1e-8f&&hit.deformationAngularImpulse.magnitude>0,"Telemetry carries profile, energy and deformation moment");
                sim.Ball.Launch(Vector3.up,Vector3.zero,Vector3.one*600);
                Check(Mathf.Abs(sim.Ball.AngularVelocity.magnitude-200)<.001f,"Solver and controls share the 200 rad/s launch limit");
            }
        }
    }
}
