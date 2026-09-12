using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class StationSpinVerification
    {
        static readonly List<string> report=new List<string>();
        static int failed;
        static void Check(bool ok,string name,string detail="")
        {string line=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
        static ShotSimulation Floor()
        {
            // Use the actual station material selection, not a duplicate test material.
            var layout=new StationLayout {
                boxes=new[]{new StationLayout.Box {id="concourse-test",role="floor",material="granite",collision=true,
                    center=new Vector3(0,-.1f,0),size=new Vector3(1000,.2f,1000)}},
                flights=Array.Empty<StationLayout.Flight>(),beams=Array.Empty<StationLayout.Beam>()};
            return new ShotSimulation(true,layout,BallProfile.Phase2Default);
        }
        static ContactSample First(ShotSimulation sim,Vector3 velocity,Vector3 spin,float hz=180)
        {
            ContactSample hit=default;bool found=false;
            Action<ContactSample> capture=s=>{if(!found){hit=s;found=true;}};
            sim.Ball.Contact+=capture;
            try {
                sim.Ball.Launch(new Vector3(0,1.2f,0),velocity,spin);Physics.SyncTransforms();
                for(int i=0;i<hz*30&&!found;i++)sim.Ball.BeforeStep(1/hz);
                if(!found)throw new Exception("No floor contact in 30 seconds");
                return hit;
            } finally {sim.Ball.Contact-=capture;}
        }
        static BallContactModel.Result Reference(ContactSample hit,BallProfile p)
        {var r=p.response;return BallContactModel.Resolve(hit.incomingVelocity,hit.incomingSpin,hit.normal,p,r.normal_restitution,r.sliding_friction,r.grip_restitution,r.normal_offset_fraction_of_radius);}
        public static void Run()
        {
            report.Clear();failed=0;Physics.gravity=Vector3.down*9.81f;
            Check(Application.isPlaying,"Native swept contacts run in Play mode");
            using(var sim=Floor()) {
                var surface=sim.Root.GetComponentInChildren<Surface>();var p=sim.Ball.Profile;
                var material=surface.GetComponent<Collider>().sharedMaterial;
                Check(!surface.useBallReferenceResponse,"Station granite uses its surface response");
                Check(Mathf.Abs(material.bounciness-p.response.normal_restitution)<1e-6f,"Granite keeps its vertical bounce height");
                float previous=0;
                foreach(int hz in new[]{90,180,360}) {
                    var shot=Quaternion.AngleAxis(-60,Vector3.right)*Vector3.forward*100;
                    var hit=First(sim,shot,Vector3.right*-200,hz);var old=Reference(hit,p);
                    Check(old.velocity.z<0&&hit.outgoingVelocity.z>1.3f,"100 m/s, 60 degree backspin lob continues forward at "+hz+" Hz",
                        $"range={hit.point.z:F3} m; incoming={hit.incomingVelocity.z:F3} m/s; lab={old.velocity.z:F3} m/s; station={hit.outgoingVelocity.z:F3} m/s");
                    if(previous!=0)Check(Mathf.Abs(hit.outgoingVelocity.z-previous)<.01f,"Long lob timestep convergence");previous=hit.outgoingVelocity.z;
                }
                int cases=0;float maxEnergy=0,maxFriction=0,maxAngularError=0;
                foreach(float speed in new[]{5f,10f,30f,60f,100f})foreach(float pitch in new[]{-60f,-15f,0f,30f,60f,70f})foreach(float spin in new[]{-200f,0f,200f}) {
                    var hit=First(sim,Quaternion.AngleAxis(-pitch,Vector3.right)*Vector3.forward*speed,Vector3.right*spin);cases++;
                    maxEnergy=Mathf.Max(maxEnergy,hit.EnergyAfter/hit.EnergyBefore);
                    maxFriction=Mathf.Max(maxFriction,hit.tangentImpulse.magnitude/(material.dynamicFriction*hit.normalImpulse));
                    maxAngularError=Mathf.Max(maxAngularError,(p.Inertia*(hit.outgoingSpin-hit.incomingSpin)-Vector3.Cross(-hit.normal*p.radius_m,hit.tangentImpulse)-hit.deformationAngularImpulse).magnitude);
                    Check(sim.Ball.ContactBudgetExhaustions==0&&hit.outgoingVelocity.y>0,"Swept floor rebound "+cases);
                    if(hit.incomingVelocity.z>=5)Check(hit.outgoingVelocity.z>0,"Fast forward motion survives maximum launch spin "+cases);
                }
                Check(maxEnergy<=1.00001f&&maxFriction<=1.00001f&&maxAngularError<1e-6f,"90 native impacts conserve the friction budget and angular impulse without adding energy",
                    $"max energy ratio={maxEnergy:R}; friction ratio={maxFriction:R}; angular residual={maxAngularError:R}");
                var neutral=First(sim,new Vector3(0,-3,1),Vector3.zero);
                var back=First(sim,new Vector3(0,-3,1),Vector3.right*-200);
                var top=First(sim,new Vector3(0,-3,1),Vector3.right*200);
                var left=First(sim,new Vector3(0,-3,1),SpinControls.Compose(0,0,-200));
                var right=First(sim,new Vector3(0,-3,1),SpinControls.Compose(0,0,200));
                var axial=First(sim,new Vector3(0,-3,1),Vector3.up*200);
                Check(back.outgoingVelocity.z<-.5f&&neutral.outgoingVelocity.z>0&&top.outgoingVelocity.z>neutral.outgoingVelocity.z+.5f,
                    "Slow draw shots and topspin remain useful",$"back={back.outgoingVelocity.z:F3}; neutral={neutral.outgoingVelocity.z:F3}; top={top.outgoingVelocity.z:F3} m/s");
                Check(left.outgoingVelocity.x<-.5f&&right.outgoingVelocity.x>.5f&&Mathf.Abs(left.outgoingVelocity.x+right.outgoingVelocity.x)<1e-5f,"Side spin still kicks symmetrically");
                Check(Vector3.Distance(neutral.outgoingVelocity,axial.outgoingVelocity)<1e-5f,"Spin around the contact normal creates no sideways force");
                sim.Run(new Vector3(0,1.2f,0),new Vector3(0,2,5),Vector3.right*-200,80);
                Check(sim.Ball.Sleeping&&sim.Ball.Velocity==Vector3.zero&&sim.Ball.AngularVelocity==Vector3.zero,"Repeated rebounds reach full translational and rotational rest");
            }
            Directory.CreateDirectory("../.local/spin-verification");
            File.WriteAllLines("../.local/spin-verification/report.txt",report);
            if(failed>0)throw new Exception(failed+" station spin checks failed");
        }
    }
}
