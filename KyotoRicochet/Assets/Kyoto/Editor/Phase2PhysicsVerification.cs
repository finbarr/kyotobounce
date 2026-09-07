using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2PhysicsVerification
    {
        static readonly List<string> report=new List<string>();
        static int failed;
        static string outputPath;
        static void Check(bool condition,string name,string detail="")
        {
            string line=(condition?"PASS ":"FAIL ")+name+" "+detail;
            report.Add(line);Debug.Log(line);if(!condition)failed++;
        }
        static ShotSimulation Floor(Quaternion rotation)
        {
            var sim=new ShotSimulation(false);
            var floor=StationGeometry.Box(sim.Root,"Test stone",rotation*new Vector3(0,-.25f,0),new Vector3(100,.5f,100),Surface.Material("Test stone",.76f,.24f),"floor","FLOOR");
            floor.transform.rotation=rotation;
            return sim;
        }
        static ContactSample Impact(ShotSimulation sim,Vector3 velocity,Vector3 spin,Quaternion frame,float dt=BallBody.Step)
        {
            bool found=false;ContactSample result=default;
            Action<ContactSample> callback=s=>{if(!found){result=s;found=true;}};
            sim.Ball.Contact+=callback;
            sim.Ball.Launch(frame*new Vector3(0,BallBody.Radius+.01f,0),frame*velocity,frame*spin);
            Physics.SyncTransforms();
            for(int i=0;i<20&&!found;i++)sim.Ball.BeforeStep(dt);
            sim.Ball.Contact-=callback;
            if(!found)throw new Exception("No contact during diagnostic.");
            return result;
        }
        public static void Run(string output="../artifacts/phase2/physics")
        {
            report.Clear();failed=0;outputPath=output;
            Physics.gravity=Vector3.down*9.81f;
            Check(Application.isPlaying,"Runs with Unity geometry in Play mode");
            Controls();Behavior();Frames();Sweep();Convergence();ProxyExclusion();
            string path=outputPath;Directory.CreateDirectory(path);
            File.WriteAllLines(path+"/verification.txt",report);
            if(failed>0)throw new Exception(failed+" Phase 2 physics checks failed.");
        }
        static void Controls()
        {
            foreach(float yaw in new[]{0f,90,180,270})
            {
                var basis=Quaternion.Euler(0,yaw,0);
                Check(Vector3.Distance(SpinControls.Compose(yaw,0,100),basis*new Vector3(0,0,-100))<.0001f,"Right kick axis","yaw="+yaw);
                var spin=SpinControls.Compose(yaw,-60,80,20);var recovered=SpinControls.Decompose(yaw,spin);
                Check(Vector3.Distance(recovered,new Vector3(-60,80,20))<.0001f,"Spin controls round trip","yaw="+yaw);
            }
            Check(Mathf.Abs(SpinControls.Compose(30,200,200,200).magnitude-200)<.001f,"Combined spin is bounded");
        }
        static void Behavior()
        {
            using(var sim=Floor(Quaternion.identity))
            {
                Vector3[] outVelocity=new Vector3[5],atPoint=new Vector3[5];
                bool[] returned=new bool[5];
                string[] names={"neutral","backspin","topspin","left kick","right kick"};
                for(int i=0;i<5;i++)
                {
                    bool hit=false,sampled=false;float time=0;
                    Action<ContactSample> callback=s=>{if(!hit){hit=true;time=s.time;outVelocity[i]=s.outgoingVelocity;}};
                    sim.Ball.Contact+=callback;
                    float top=i==1?-200:i==2?200:0,kick=i==3?-200:i==4?200:0;
                    sim.Run(new Vector3(0,1.25f,0),Vector3.forward,SpinControls.Compose(0,top,kick),2,sample:b=>{
                        if(hit && b.Body.position.z<0)returned[i]=true;
                        if(hit&&!sampled&&b.Clock>=time+.3f){atPoint[i]=b.Body.position;sampled=true;}
                    });
                    sim.Ball.Contact-=callback;
                    Check(hit,"Teaching throw reaches floor",names[i]+" out="+outVelocity[i].ToString("F5"));
                }
                Check(returned[1]&&outVelocity[1].z<0&&!returned[0],"Backspin crosses release plane with neutral control");
                Check(outVelocity[2].z>outVelocity[0].z,"Topspin transfers spin energy forward");
                Check(atPoint[3].x<-.2f&&atPoint[4].x>.2f,"Lateral kick visible 0.3 seconds after impact",$"left={atPoint[3].x:F5} right={atPoint[4].x:F5}");
                Check(Mathf.Abs(atPoint[3].x+atPoint[4].x)<.001f&&Mathf.Abs(atPoint[0].x)<.0001f,"Left and right are mirrored; neutral has no drift");
                var zero=Impact(sim,new Vector3(0,-3,1),Vector3.zero,Quaternion.identity);
                foreach(float vertical in new[]{-200f,200f})
                {
                    var normal=Impact(sim,new Vector3(0,-3,1),Vector3.up*vertical,Quaternion.identity);
                    Check(Vector3.Distance(normal.outgoingVelocity,zero.outgoingVelocity)<.00001f,"Normal-axis spin cannot fake a lateral impulse","spin="+vertical);
                }
            }
        }
        static void Frames()
        {
            var localV=new Vector3(.7f,-3,2);var localW=new Vector3(-140,30,70);
            ContactSample reference;
            using(var sim=Floor(Quaternion.identity))reference=Impact(sim,localV,localW,Quaternion.identity);
            foreach(var frame in new[]{Quaternion.Euler(0,90,0),Quaternion.Euler(0,180,0),Quaternion.Euler(0,270,0),Quaternion.Euler(25,17,0),Quaternion.Euler(0,0,90)})
            using(var sim=Floor(frame))
            {
                Physics.gravity=frame*(Vector3.down*9.81f);
                var result=Impact(sim,localV,localW,frame);var inverse=Quaternion.Inverse(frame);
                Check(Vector3.Distance(inverse*result.outgoingVelocity,reference.outgoingVelocity)<.001f&&Vector3.Distance(inverse*result.outgoingSpin,reference.outgoingSpin)<.02f,"Contact response is frame invariant",frame.eulerAngles.ToString("F2"));
            }
            Physics.gravity=Vector3.down*9.81f;
        }
        static void Sweep()
        {
            Directory.CreateDirectory(outputPath);
            using(var csv=new StreamWriter(Path.Combine(outputPath,"contact-sweep.csv")))
            using(var sim=Floor(Quaternion.identity))
            {
                csv.WriteLine("forward,normal,spin,axis,out_x,out_y,out_z,energy_ratio,angular_residual");
                int cases=0;float maxEnergy=0,maxAngular=0;
                foreach(float forward in new[]{.5f,1,2,4,8})
                foreach(float normal in new[]{1f,3,5})
                foreach(float spin in new[]{-200f,-100,-50,0,50,100,200})
                foreach(var axis in new[]{Vector3.right,Vector3.up,Vector3.forward})
                {
                    var sample=Impact(sim,new Vector3(0,-normal,forward),axis*spin,Quaternion.identity);
                    float energy=sample.EnergyAfter/Mathf.Max(1e-9f,sample.EnergyBefore);
                    Vector3 residual=BallBody.Inertia*(sample.outgoingSpin-sample.incomingSpin)+Vector3.Cross(sample.normal*BallBody.Radius,BallBody.Mass*(sample.outgoingVelocity-sample.incomingVelocity));
                    maxEnergy=Mathf.Max(maxEnergy,energy);maxAngular=Mathf.Max(maxAngular,residual.magnitude);cases++;
                    var v=sample.outgoingVelocity;
                    csv.WriteLine(FormattableString.Invariant($"{forward},{normal},{spin},{(axis.x>0?"right":axis.y>0?"up":"forward")},{v.x:R},{v.y:R},{v.z:R},{energy:R},{residual.magnitude:R}"));
                }
                Check(cases==315&&maxEnergy<=1.005f,"Spin/incidence sweep stays passive",$"cases={cases} maximum energy ratio={maxEnergy:F7}");
                Check(maxAngular<1e-6f,"Contact angular momentum is consistent","maximum residual="+maxAngular.ToString("R"));
            }
        }
        static void Convergence()
        {
            var outputs=new List<ContactSample>();var positions=new List<Vector3>();
            foreach(float dt in new[]{1f/90,1f/180,1f/360})
            using(var sim=Floor(Quaternion.identity))
            {
                outputs.Add(Impact(sim,new Vector3(0,-3,1),new Vector3(-120,0,-100),Quaternion.identity,dt));
                sim.Run(new Vector3(0,1.25f,0),Vector3.forward,new Vector3(-120,0,-100),2,dt);
                positions.Add(sim.Ball.Body.position);
            }
            float velocityError=Vector3.Distance(outputs[0].outgoingVelocity,outputs[2].outgoingVelocity),positionError=Vector3.Distance(positions[0],positions[2]);
            Check(velocityError<.01f,"Strong-spin impact timestep convergence",velocityError.ToString("F7")+" m/s");
            Check(positionError<.005f,"Strong-spin trajectory timestep convergence",positionError.ToString("F7")+" m");
        }
        static void ProxyExclusion()
        {
            using(var sim=Floor(Quaternion.identity))
            {
                var proxy=StationGeometry.Box(sim.Root,"Walking-only proxy",new Vector3(0,.5f,0),new Vector3(10,.1f,10),Surface.Material("Proxy",0,1),"proxy","PROXY");
                proxy.layer=CollisionLayers.WalkingAssist;
                bool wrong=false,ground=false;
                sim.Ball.Contact+=s=>{wrong|=s.surfaceId=="proxy";ground|=s.surfaceId=="floor";};
                sim.Run(new Vector3(0,1.25f,0),Vector3.zero,Vector3.zero,1);
                Check(ground&&!wrong,"Ball ignores the walking-only collision layer");
            }
        }
    }
}
