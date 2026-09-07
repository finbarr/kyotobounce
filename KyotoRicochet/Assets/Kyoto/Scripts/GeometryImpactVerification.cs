#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Kyoto
{
    // Bounded high-speed regressions using production-generated collision shapes.
    // Isolated fixtures preserve their station coordinates and material pairs.
    public static class GeometryImpactVerification
    {
        sealed class Target
        {
            public string id,surface;
            public Vector3 point,normal,tangent;
            public bool smooth;
            public float incidence=.35f;
        }
        sealed class Result
        {
            public ContactSample first;
            public Vector3 end;
            public float maxDepth,maxEnergy,maxContactEnergy;
            public int contacts,budgets,overlaps;
            public bool finite=true,proxy;
        }
        static readonly List<string> report=new List<string>();
        static int failed;
        static void Check(bool ok,string name,string detail="")
        {string row=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(row);Debug.Log(row);if(!ok)failed++;}
        static string Output()
        {
            foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))return arg.Substring("--kyoto-evidence=".Length);
            throw new ArgumentException("Geometry impact verification requires --kyoto-evidence=<new directory>.");
        }
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            bool court=Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-court-impacts");
            if(!court&&!Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-geometry-impacts"))return;
            try{if(court)RunCourt();else Run();Application.Quit(0);}catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        static StationLayout Empty()=>new StationLayout
        {boxes=Array.Empty<StationLayout.Box>(),flights=Array.Empty<StationLayout.Flight>(),beams=Array.Empty<StationLayout.Beam>(),panels=Array.Empty<StationLayout.Panel>()};
        public static void RunConcourse(string candidatePath)
        {
            if(string.IsNullOrEmpty(candidatePath))throw new ArgumentException("Explicit concourse candidate required.");
            string output=Output();Directory.CreateDirectory(output);report.Clear();failed=0;
            string text=File.ReadAllText(candidatePath);
            var layout=JsonUtility.FromJson<StationLayout>(text);
            const string targetPrefix="--kyoto-concourse-target-layout=";
            var targetArg=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(targetPrefix));
            string targetText=targetArg==null?text:File.ReadAllText(targetArg.Substring(targetPrefix.Length));
            var targetLayout=JsonUtility.FromJson<StationLayout>(targetText);
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; CPU={SystemInfo.processorType}");
            using(var hash=System.Security.Cryptography.SHA256.Create())
            {
                report.Add("layout_sha256="+BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant());
                report.Add("launch_target_layout_sha256="+BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(targetText))).Replace("-","").ToLowerInvariant());
            }
            report.Add("Candidate enclosure meshes at station coordinates. P5 profile, 16 m/s, five spins through 200 rad/s, 90/180/360 Hz. Fixed existing penetration, passivity and convergence tolerances. Not measured material or normal-input acceptance.");
            var before=Physics.gravity;Physics.gravity=Vector3.down*9.81f;
            try
            {
                foreach(bool half in new[]{false,true})
                {
                    string prefix=half?"concourse-south-enclosure":"concourse-central-enclosure";
                    var body=layout.panels.Single(p=>p.id==prefix+"-body");
                    var targetBody=targetLayout.panels.Single(p=>p.id==body.id);
                    // The construction uses 64 meridian intervals and a 256-way
                    // full circumference. Assert topology before selecting faces.
                    int sectors=half?128:256;
                    if(targetBody.triangles.Length/3!=(half?16896:33280))throw new InvalidOperationException("Launch reference topology changed; preserve original target selection.");
                    var fixture=Empty();fixture.panels=new[]{body};
                    using(var sim=new ShotSimulation(true,fixture))
                    {
                        // Retain the original broad-face targets and add the
                        // first/last curved bands. The photo-fitted power
                        // profile changes fastest near its neck and cap rim.
                        foreach(int band in new[]{0,6,28,54,63})foreach(int sector in half?new[]{16,64,112}:new[]{16,80,144,208})
                            CourtFace(sim,targetBody,(band*sectors+sector)*2,prefix+"-band"+band+"-sector"+sector,output);
                        CourtFace(sim,targetBody,(28*sectors+64)*2,prefix+"-grazing",output,3.73205f);
                    }
                }
                foreach(string id in new[]{"concourse-central-enclosure-cap","concourse-south-enclosure-cap","concourse-central-enclosure-support"})
                {
                    var panel=layout.panels.Single(p=>p.id==id);
                    var targetPanel=targetLayout.panels.Single(p=>p.id==id);int face=0;
                    if(id.EndsWith("-cap"))
                    {
                        face=-1;
                        for(int i=0;i<targetPanel.triangles.Length;i+=3)
                        {
                            var a=targetPanel.vertices[targetPanel.triangles[i]];var b=targetPanel.vertices[targetPanel.triangles[i+1]];var c=targetPanel.vertices[targetPanel.triangles[i+2]];
                            if(Vector3.Cross(b-a,c-a).normalized.y>.999f){face=i/3;break;}
                        }
                        if(face<0)throw new InvalidOperationException("No closed upper cap: "+id);
                    }
                    var fixture=Empty();fixture.panels=new[]{panel};
                    using(var sim=new ShotSimulation(true,fixture))CourtFace(sim,targetPanel,face,id,output);
                }
            }
            finally{Physics.gravity=before;File.WriteAllLines(Path.Combine(output,"verification.txt"),report);}
            if(failed>0)throw new Exception(failed+" concourse impact checks failed.");
        }
        public static void RunCourt()
        {
            string output=Output();Directory.CreateDirectory(output);report.Clear();failed=0;
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; CPU={SystemInfo.processorType}");
            report.Add("New courtyard production meshes in isolation at original coordinates; 16 m/s, five spin vectors through 200 rad/s, 90/180/360 Hz. No calibrated material or whole-station/input claim.");
            File.WriteAllText(Path.Combine(output,"layout-used.json"),Resources.Load<TextAsset>("StationLayout").text);
            var layout=StationLayout.Load();var before=Physics.gravity;Physics.gravity=Vector3.down*9.81f;
            try
            {
                var column=layout.panels.First(p=>p.id=="east-court-flared-column-1");
                var fixture=Empty();fixture.panels=new[]{column};
                using(var sim=new ShotSimulation(true,fixture))
                {
                    // Actual broad faces of the shaft and eccentric flare, on
                    // both sides. Contact normals come from the exported mesh.
                    foreach(int band in new[]{2,6})foreach(int sector in new[]{0,24})
                        CourtFace(sim,column,(band*48+sector)*2,
                            (band==2?"column-shaft-":"column-flare-")+sector,output);
                }
                foreach(string id in new[]{"east-court-south-curved-base","east-court-south-curved-fascia"})
                {
                    var panel=layout.panels.First(p=>p.id==id);int selected=-1;float north=float.NegativeInfinity;
                    for(int i=0;i<panel.triangles.Length;i+=3)
                    {
                        var a=panel.vertices[panel.triangles[i]];var b=panel.vertices[panel.triangles[i+1]];var c=panel.vertices[panel.triangles[i+2]];
                        var normal=Vector3.Cross(b-a,c-a).normalized;var point=(a+b+c)/3;
                        if(normal.z>.98f&&Mathf.Abs(normal.y)<.01f&&point.z>north){north=point.z;selected=i/3;}
                    }
                    if(selected<0)throw new InvalidOperationException("No outer north-facing curved facade face: "+id);
                    fixture=Empty();fixture.panels=new[]{panel};
                    using(var sim=new ShotSimulation(true,fixture))CourtFace(sim,panel,selected,id,output);
                }
            }
            finally{Physics.gravity=before;File.WriteAllLines(Path.Combine(output,"verification.txt"),report);}
            if(failed>0)throw new Exception(failed+" courtyard impact checks failed.");
        }
        static void CourtFace(ShotSimulation sim,StationLayout.Panel panel,int face,string id,string output,float incidence=.35f)
        {
            int i=face*3;
            var a=panel.vertices[panel.triangles[i]];var b=panel.vertices[panel.triangles[i+1]];var c=panel.vertices[panel.triangles[i+2]];
            var normal=Vector3.Cross(b-a,c-a).normalized;
            var tangent=Vector3.Cross(Vector3.up,normal).normalized;
            if(tangent.sqrMagnitude<.1f)tangent=Vector3.right;
            TargetRun(sim,new Target{id=id,surface=panel.id,point=(a+b+c)/3,normal=normal,
                tangent=tangent,smooth=true,incidence=incidence},output);
        }
        public static void Run()
        {
            string output=Output();Directory.CreateDirectory(output);report.Clear();failed=0;
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; CPU={SystemInfo.processorType}");
            report.Add("Isolated production geometry at original world coordinates; maximum launch speed 16 m/s and spin magnitude 200 rad/s. No native input or full-station traversal claim.");
            File.WriteAllText(Path.Combine(output,"layout-used.json"),Resources.Load<TextAsset>("StationLayout").text);
            var layout=StationLayout.Load();var before=Physics.gravity;Physics.gravity=Vector3.down*9.81f;
            try
            {
                var rail=layout.beams.First(b=>b.id=="daikaidan-flight-01-center-handrail");
                var railNext=layout.beams.First(b=>b.id==rail.id&&Vector3.Distance(b.a,rail.b)<.0001f);
                var railLayout=Empty();railLayout.beams=new[]{rail,railNext};
                var axis=(rail.b-rail.a).normalized;var n=Vector3.Cross(axis,Vector3.up).normalized;
                using(var sim=new ShotSimulation(true,railLayout))
                {
                    TargetRun(sim,new Target{id="rail-center",surface=rail.id,point=(rail.a+rail.b)*.5f+n*rail.radius,normal=n,tangent=axis,smooth=true},output);
                    TargetRun(sim,new Target{id="rail-joint",surface=rail.id,point=rail.b+n*rail.radius,normal=n,tangent=axis},output);
                    TargetRun(sim,new Target{id="rail-grazing",surface=rail.id,point=(rail.a+rail.b)*.5f+n*rail.radius,normal=n,tangent=axis,incidence=3.73205f},output);
                }
                var wall=layout.boxes.First(b=>b.id=="south-central-spandrel-0-0");
                var wallLayout=Empty();wallLayout.boxes=new[]{wall};var rotation=Quaternion.Euler(0,wall.yaw,0);
                using(var sim=new ShotSimulation(true,wallLayout))
                {
                    TargetRun(sim,new Target{id="wall-face",surface=wall.id,point=wall.center+rotation*new Vector3(0,0,wall.size.z*.5f),normal=rotation*Vector3.forward,tangent=Vector3.right,smooth=true},output);
                    TargetRun(sim,new Target{id="wall-corner",surface=wall.id,point=wall.center+rotation*new Vector3(wall.size.x*.5f,wall.size.y*.5f,wall.size.z*.5f),normal=rotation*Vector3.one.normalized,tangent=rotation*new Vector3(1,0,-1).normalized},output);
                }
                var flight=layout.flights.First(f=>f.id=="daikaidan-flight-06");
                var stairLayout=Empty();stairLayout.flights=new[]{flight};
                int row=flight.contours.Length/2,col=flight.contours[row].points.Length/2;
                var p=flight.contours[row].points[col];var next=flight.contours[row+1].points[col];
                Vector3 nose=new Vector3(p.x,flight.baseElevation+(row+1)*flight.rise,p.y),uphill=new Vector3(next.x-p.x,0,next.y-p.y).normalized;
                using(var sim=new ShotSimulation(true,stairLayout))
                {
                    // Include the real walking proxy as a negative-control shape.
                    var walking=StairGeometry.Create(sim.Root,"proxy fixture",flight.Rows(),flight.baseElevation,flight.rise,Surface.Material("Proxy",0,1),walking:true);
                    UnityEngine.Object.DestroyImmediate(walking.GetComponent<MeshCollider>());
                    TargetRun(sim,new Target{id="stair-nose",surface=flight.id,point=nose,normal=(Vector3.up-uphill).normalized,tangent=Vector3.Cross(Vector3.up,uphill)},output);
                    TargetRun(sim,new Target{id="stair-tread",surface=flight.id,point=nose+new Vector3(next.x-p.x,0,next.y-p.y)*.5f,normal=Vector3.up,tangent=Vector3.Cross(Vector3.up,uphill),smooth=true},output);
                    TargetRun(sim,new Target{id="stair-riser",surface=flight.id,point=nose-Vector3.up*flight.rise*.5f,normal=-uphill,tangent=Vector3.Cross(Vector3.up,uphill),smooth=true},output);
                }
                using(var sim=new ShotSimulation(false,profile:BallProfile.Phase2Default))
                {
                    Vector3 basePoint=new Vector3(91.800987f,33.5f,1.5795234f);const float radius=.125f;
                    sim.SetCup(basePoint,radius);
                    TargetRun(sim,new Target{id="cup-floor",surface="cup",point=basePoint+Vector3.up*CupCapture.Floor,normal=Vector3.up,tangent=Vector3.zero,smooth=true},output);
                    TargetRun(sim,new Target{id="cup-wall",surface="cup",point=basePoint+new Vector3(0,CupCapture.Height*.5f,radius+.012f),normal=Vector3.forward,tangent=Vector3.right,smooth=true},output);
                    TargetRun(sim,new Target{id="cup-rim",surface="cup",point=basePoint+new Vector3(0,CupCapture.Height,radius+.012f),normal=(Vector3.up+Vector3.forward).normalized,tangent=Vector3.right},output);
                    float angle=Mathf.PI/48;Vector3 radial=new Vector3(Mathf.Sin(angle),0,Mathf.Cos(angle));
                    TargetRun(sim,new Target{id="cup-shell-seam",surface="cup",point=basePoint+Vector3.up*CupCapture.Height*.5f+radial*(radius+.012f),normal=radial,tangent=Vector3.Cross(Vector3.up,radial)},output);
                }
            }
            finally{Physics.gravity=before;File.WriteAllLines(Path.Combine(output,"verification.txt"),report);}
            if(failed>0)throw new Exception(failed+" geometry impact checks failed.");
        }
        static void TargetRun(ShotSimulation sim,Target target,string output)
        {
            Physics.SyncTransforms();
            var p=sim.Ball.Profile;var cols=sim.Root.GetComponentsInChildren<Collider>().Where(c=>!c.isTrigger&&c.gameObject.layer!=CollisionLayers.WalkingAssist).ToArray();
            Vector3 direction=(-target.normal+target.tangent*target.incidence).normalized,velocity=direction*16;
            Vector3 side=Vector3.Cross(target.normal,direction).normalized;if(side.sqrMagnitude<.1f)side=Vector3.right;
            const float lead=.02f;
            Vector3 origin=target.point+target.normal*(p.radius_m-.002f)-velocity*lead-Physics.gravity*(.5f*lead*lead);
            var spins=new[]{Vector3.zero,side*200,-side*200,direction*200,-direction*200};
            var results=new Result[5,3];
            for(int s=0;s<spins.Length;s++)for(int f=0;f<3;f++)
            {
                int hz=f==0?90:f==1?180:360;float dt=1f/hz;string id=target.id+"-spin"+s+"-"+hz;
                var result=RunShot(sim,cols,origin,velocity,spins[s],dt,Path.Combine(output,id+".csv"));results[s,f]=result;
                Check(result.contacts>0&&result.first.surfaceId==target.surface,id+" hits expected production surface",$"contacts={result.contacts}; first={result.first.surfaceId}");
                Check(result.finite&&!result.proxy&&result.budgets==0&&result.maxDepth<=.00005f,id+" remains finite and outside solids",$"penetration_m={result.maxDepth:R}; budgets={result.budgets}; overlap_recoveries={result.overlaps}");
                Check(result.maxEnergy<=1.005f&&result.maxContactEnergy<=1.005f,id+" stays passive",$"mechanical_ratio={result.maxEnergy:R}; contact_ratio={result.maxContactEnergy:R}");
            }
            for(int s=0;s<spins.Length;s++)
            {
                float speedError=Vector3.Distance(results[s,0].first.outgoingVelocity,results[s,2].first.outgoingVelocity);
                float normalError=Vector3.Angle(results[s,0].first.normal,results[s,2].first.normal);
                float endError=Vector3.Distance(results[s,0].end,results[s,2].end);
                string detail=$"first_velocity_m_s={speedError:R}; first_normal_deg={normalError:R}; end_position_m={endError:R}; normal90={results[s,0].first.normal:F7}; normal360={results[s,2].first.normal:F7}; point90={results[s,0].first.point:F7}; point360={results[s,2].first.point:F7}";
                if(target.smooth)Check(speedError<.01f,target.id+" spin"+s+" isolated-contact timestep convergence",detail);
                else report.Add("EDGE_DIVERGENCE "+target.id+" spin"+s+" "+detail+"; edge branches are reported, not forced to match after 2 s.");
            }
        }
        static bool Finite(Vector3 v)=>float.IsFinite(v.x)&&float.IsFinite(v.y)&&float.IsFinite(v.z);
        static Result RunShot(ShotSimulation sim,Collider[] colliders,Vector3 origin,Vector3 velocity,Vector3 spin,float dt,string path)
        {
            var result=new Result();var ball=sim.Ball;var sphere=ball.GetComponent<SphereCollider>();var p=ball.Profile;
            float initialEnergy=.5f*p.mass_kg*velocity.sqrMagnitude+.5f*p.Inertia*spin.sqrMagnitude;
            Action<ContactSample> log=s=>
            {
                if(result.contacts++==0)result.first=s;
                result.proxy|=s.surfaceId=="proxy fixture"||s.surfaceId=="unclassified";
                if(s.EnergyBefore>1e-9f)result.maxContactEnergy=Mathf.Max(result.maxContactEnergy,s.EnergyAfter/s.EnergyBefore);
            };
            ball.Contact+=log;ball.Launch(origin,velocity,spin);Physics.SyncTransforms();
            using(var csv=new StreamWriter(path))
            {
                csv.WriteLine("time,x,y,z,vx,vy,vz,wx,wy,wz,penetration_m,mechanical_ratio,contacts,budgets");
                try
                {
                    for(int i=0;i<Mathf.RoundToInt(2/dt);i++)
                    {
                        ball.BeforeStep(dt);var position=ball.Body.position;var v=ball.Velocity;var w=ball.AngularVelocity;float depth=0;
                        foreach(var c in colliders)if(Physics.ComputePenetration(sphere,position,Quaternion.identity,c,c.transform.position,c.transform.rotation,out _,out float penetration))depth=Mathf.Max(depth,penetration);
                        float energy=(.5f*p.mass_kg*v.sqrMagnitude+.5f*p.Inertia*w.sqrMagnitude-p.mass_kg*Vector3.Dot(Physics.gravity,position-origin))/initialEnergy;
                        result.maxDepth=Mathf.Max(result.maxDepth,depth);result.maxEnergy=Mathf.Max(result.maxEnergy,energy);
                        result.finite&=Finite(position)&&Finite(v)&&Finite(w);
                        csv.WriteLine(FormattableString.Invariant($"{(i+1)*dt:R},{position.x:R},{position.y:R},{position.z:R},{v.x:R},{v.y:R},{v.z:R},{w.x:R},{w.y:R},{w.z:R},{depth:R},{energy:R},{result.contacts},{ball.ContactBudgetExhaustions}"));
                    }
                }
                finally{ball.Contact-=log;}
            }
            result.end=ball.Body.position;result.budgets=ball.ContactBudgetExhaustions;result.overlaps=ball.StaticOverlapRecoveries;return result;
        }
    }
}
#endif
