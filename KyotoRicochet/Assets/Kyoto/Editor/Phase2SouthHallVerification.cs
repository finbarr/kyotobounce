using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto.Editor
{
    // Candidate-only diagnostics. Installed in Editor after any running Unity job exits.
    public static class Phase2SouthHallVerification
    {
        [Serializable] sealed class FixtureTargets { public FixtureTarget[] lamps; }
        [Serializable] sealed class FixtureTarget { public string id; public AimTarget target; }
        [Serializable] sealed class AimTarget { public string @object; public float[] point; }
        [Serializable] sealed class ReplayState
        {
            public int step,liveRecoveries,predictionRecoveries;
            public Vector3 livePosition,predictionPosition,liveVelocity,predictionVelocity,liveSpin,predictionSpin;
            public float positionError,rotationError;
        }
        [Serializable] sealed class ReplayContact
        {
            public int step; public string world,surfaceId;
            public float time; public Vector3 point,normal,incomingVelocity,outgoingVelocity,incomingSpin,outgoingSpin;
            public ReplayContact(int step,string world,ContactSample c)
            {
                this.step=step;this.world=world;surfaceId=c.surfaceId;time=c.time;point=c.point;normal=c.normal;
                incomingVelocity=c.incomingVelocity;outgoingVelocity=c.outgoingVelocity;incomingSpin=c.incomingSpin;outgoingSpin=c.outgoingSpin;
            }
        }
        public static void Run()
        {
            string Arg(string name)=>Environment.GetCommandLineArgs().First(a=>a.StartsWith(name+"=")).Substring(name.Length+1);
            string text=File.ReadAllText(Arg("--kyoto-layout-candidate")),output=Arg("--kyoto-evidence");
            var layout=JsonUtility.FromJson<StationLayout>(text);
            bool centralGate=layout.panels.Any(p=>p.id=="central-gate-00-body");
            var root=new GameObject("South hall collision verification");StationWorld.Create(root.transform,layout);
            Physics.SyncTransforms();
            var report=new List<string>();int failed=0;
            using(var sha=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant());
            void Check(string name,bool pass,string detail)
            {report.Add((pass?"PASS ":"FAIL ")+name+": "+detail);if(!pass)failed++;}
            var boxes=root.GetComponentsInChildren<BoxCollider>().Where(c=>c.name.StartsWith("south-concourse-")).ToDictionary(c=>c.name,c=>c);
            int faces=0,faceFailures=0;float maxError=0;
            foreach(var b in layout.boxes.Where(b=>b.id.StartsWith("south-concourse-")))
            foreach(Vector3 normal in new[]{Vector3.right,Vector3.left,Vector3.up,Vector3.down,Vector3.forward,Vector3.back})
            {
                Vector3 point=b.center+Vector3.Scale(b.size*.5f,normal);
                bool hit=boxes[b.id].Raycast(new Ray(point+normal*.05f,-normal),out var h,.1f);
                float error=hit?Vector3.Distance(h.point,point):100;
                maxError=Mathf.Max(maxError,error);faces++;
                if(!hit||error>.002f||Vector3.Dot(normal,h.normal)<.99f)faceFailures++;
            }
            Check("All six faces of every new solid",faceFailures==0,$"faces={faces}, failed={faceFailures}, max position error={maxError:R}m");
            var authoredReturn=layout.panels.FirstOrDefault(p=>p.id=="south-concourse-hall-return-east");
            if(authoredReturn!=null)
            {
                var collider=root.GetComponentsInChildren<MeshCollider>().Single(c=>c.name==authoredReturn.id);
                int checkedFaces=0,misses=0,bevelFaces=0;float maximumError=0;
                for(int i=0;i<authoredReturn.triangles.Length;i+=3)
                {
                    Vector3 a=authoredReturn.vertices[authoredReturn.triangles[i]],b=authoredReturn.vertices[authoredReturn.triangles[i+1]],c=authoredReturn.vertices[authoredReturn.triangles[i+2]];
                    Vector3 n=Vector3.Cross(b-a,c-a).normalized,p=(a+b+c)/3;
                    bool hit=collider.Raycast(new Ray(p+n*.025f,-n),out var h,.05f);
                    float error=hit?Vector3.Distance(h.point,p):100;maximumError=Mathf.Max(maximumError,error);
                    if(!hit||error>.002f||Vector3.Dot(h.normal,n)<.99f)misses++;
                    if(Mathf.Max(Mathf.Abs(n.x),Mathf.Abs(n.y),Mathf.Abs(n.z))<.999f)bevelFaces++;
                    checkedFaces++;
                }
                Check("Blender stone return uses its evaluated collision mesh",checkedFaces>12&&bevelFaces>0&&misses==0,
                    $"faces={checkedFaces}, eased faces={bevelFaces}, failed={misses}, max error={maximumError:R}m");
            }
            void Ray(string label,Vector3 start,Vector3 direction,float distance,string expected,Vector3 expectedPoint)
            {
                bool hit=Physics.Raycast(start,direction,out var h,distance,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                float error=hit?Vector3.Distance(h.point,expectedPoint):100;
                Check(label,hit&&h.collider.name==expected&&error<.002f,$"hit={(hit?h.collider.name:"none")}, point={h.point}, error={error:R}m");
            }
            if(layout.authoredLights!=null&&layout.authoredLights.Length>0)
            {
                var fixtures=layout.panels.Where(p=>p.id.StartsWith("south-hall-")).ToArray();
                var meshColliders=root.GetComponentsInChildren<MeshCollider>().Where(c=>c.name.StartsWith("south-hall-")).ToDictionary(c=>c.name);
                int checkedFaces=0,misses=0;float maximumError=0;
                foreach(var panel in fixtures)
                for(int i=0;i<panel.triangles.Length;i+=3)
                {
                    Vector3 a=panel.vertices[panel.triangles[i]],b=panel.vertices[panel.triangles[i+1]],c=panel.vertices[panel.triangles[i+2]];
                    Vector3 n=Vector3.Cross(b-a,c-a).normalized,p=(a+b+c)/3;
                    bool hit=meshColliders[panel.id].Raycast(new Ray(p+n*.005f,-n),out var h,.01f);
                    float error=hit?Vector3.Distance(h.point,p):100;maximumError=Mathf.Max(maximumError,error);
                    if(!hit||error>.0005f||Vector3.Dot(h.normal,n)<.99f)misses++;
                    checkedFaces++;
                }
                Check("All authored ceiling fixture faces collide",fixtures.Length==(centralGate?113:128)&&checkedFaces>8000&&misses==0,
                    $"meshes={fixtures.Length}, faces={checkedFaces}, failed={misses}, max error={maximumError:R}m");
                Check("Fixture geometry remains above circulation",fixtures.All(p=>p.vertices.All(v=>v.y>6.8f)),
                    "Minimum fixture height exceeds 6.8 m; floor and mezzanine solids are retained.");
                int lampHits=0;
                var hallLights=layout.authoredLights.Where(l=>l.id.StartsWith("south-hall-")).ToArray();
                foreach(var fixture in hallLights)
                {
                    // Start beneath the emitter and hit its visible opal face,
                    // rather than the older flat ceiling behind the new fitting.
                    Vector3 start=fixture.position+Vector3.down*.5f;
                    bool hit=Physics.Raycast(start,Vector3.up,out var h,.6f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    if(hit&&h.collider.name==fixture.id+"-diffuser"&&Vector3.Dot(h.normal,Vector3.down)>.99f)lampHits++;
                }
                Check("Actual world rays hit all visible hall diffusers first",hallLights.Length==48&&lampHits==48,
                    $"hits={lampHits}/{hallLights.Length}");
            }
            var skyLights=(layout.authoredLights??Array.Empty<StationLayout.AuthoredLight>()).Where(l=>l.id.StartsWith("skyway-light-")).ToArray();
            if(skyLights.Length>0)
            {
                var fixtures=layout.panels.Where(p=>p.id.StartsWith("skyway-light-")).ToArray();
                var colliders=root.GetComponentsInChildren<MeshCollider>().Where(c=>c.name.StartsWith("skyway-light-")).ToDictionary(c=>c.name);
                int facesChecked=0,misses=0;float maximumError=0;
                foreach(var panel in fixtures)
                for(int i=0;i<panel.triangles.Length;i+=3)
                {
                    Vector3 a=panel.vertices[panel.triangles[i]],b=panel.vertices[panel.triangles[i+1]],c=panel.vertices[panel.triangles[i+2]];
                    Vector3 n=Vector3.Cross(b-a,c-a).normalized,p=(a+b+c)/3;
                    bool hit=colliders[panel.id].Raycast(new Ray(p+n*.004f,-n),out var h,.008f);
                    float error=hit?Vector3.Distance(h.point,p):100;maximumError=Mathf.Max(maximumError,error);
                    if(!hit||error>.0005f||Vector3.Dot(h.normal,n)<.99f)misses++;
                    facesChecked++;
                }
                Check("All elevated fixture faces collide",fixtures.Length==70&&facesChecked==5880&&misses==0,
                    $"meshes={fixtures.Length}, faces={facesChecked}, failed={misses}, max error={maximumError:R}m");
                int lensHits=0;
                foreach(var light in skyLights)
                {
                    bool hit=Physics.Raycast(light.position+light.direction*.25f,-light.direction,out var h,.3f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    if(hit&&h.collider.name==light.id+"-diffuser"&&Vector3.Dot(h.normal,light.direction)>.99f)lensHits++;
                }
                Check("Actual world rays hit all elevated lenses first",skyLights.Length==21&&lensHits==21,$"hits={lensHits}/{skyLights.Length}");
                var targets=JsonUtility.FromJson<FixtureTargets>(File.ReadAllText(Arg("--kyoto-fixture-targets")));
                Check("Every elevated light has an audited aim",targets.lamps.Length==21&&skyLights.All(l=>targets.lamps.Count(t=>t.id==l.id)==1),$"targets={targets.lamps.Length}");
                foreach(var light in skyLights)
                {
                    var aim=targets.lamps.Single(t=>t.id==light.id).target;
                    var point=new Vector3(aim.point[0],aim.point[1],aim.point[2]);
                    bool hit=Physics.Raycast(light.position,light.direction,out var h,light.range,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    bool moving=aim.@object.Contains(" step ");
                    string expected=moving?aim.@object.Substring(0,aim.@object.IndexOf(" step ")):aim.@object;
                    float error=hit?Vector3.Distance(h.point,point):100;
                    bool matches=hit&&(moving?h.collider.name.StartsWith(expected):h.collider.name==expected);
                    // Moving tread phases are separate from the saved Blender inspection frame.
                    Check("Elevated light reaches "+light.id,matches&&error<(moving?.45f:.03f),
                        $"target={expected}, first={(hit?h.collider.name:"none")}, error={error:R}m, moving={moving}");
                }
            }
            if(centralGate)
            {
                Check("Obsolete gate screen and overlapping hall floor are absent",
                    !layout.boxes.Any(b=>b.id=="central-gate-screen"||b.id=="south-concourse-hall-floor")
                    &&!layout.panels.Any(p=>p.id=="central-gate-screen"||p.id=="south-concourse-hall-floor"),
                    "The visible gate assembly bounds the hall; the continuous concourse supplies its floor.");
                var panels=layout.panels.Where(p=>p.collision&&(p.id.StartsWith("central-hall-")||p.id.StartsWith("central-gate-"))).ToArray();
                var colliders=root.GetComponentsInChildren<MeshCollider>().Where(c=>c.name.StartsWith("central-hall-")||c.name.StartsWith("central-gate-")).ToDictionary(c=>c.name);
                int checkedFaces=0,misses=0;float maximumError=0;
                foreach(var panel in panels)
                for(int i=0;i<panel.triangles.Length;i+=3)
                {
                    Vector3 a=panel.vertices[panel.triangles[i]],b=panel.vertices[panel.triangles[i+1]],c=panel.vertices[panel.triangles[i+2]];
                    Vector3 n=Vector3.Cross(b-a,c-a).normalized,p=(a+b+c)/3;
                    bool hit=colliders[panel.id].Raycast(new Ray(p+n*.004f,-n),out var h,.008f);
                    float error=hit?Vector3.Distance(h.point,p):100;maximumError=Mathf.Max(maximumError,error);
                    if(!hit||error>.0005f||Vector3.Dot(h.normal,n)<.99f)misses++;
                    checkedFaces++;
                }
                Check("Central Gate evaluated geometry collides on every face",panels.Length>100&&checkedFaces>10000&&misses==0,
                    $"meshes={panels.Length}, faces={checkedFaces}, failed={misses}, max error={maximumError:R}m");
                var gateWalker=new GameObject("Closed gate boundary walker").AddComponent<FirstPersonWalker>();
                const float step=1f/90;
                for(int lane=0;lane<10;lane++)
                {
                    gateWalker.Place(new Vector3(2.425f+lane*1.35f,.03f,-25));
                    for(int i=0;i<360;i++)gateWalker.Move(Vector2.up,180,false,step);
                    var p=gateWalker.transform.position;
                    Check("Closed gate lane "+lane+" blocks actual walking",p.z> -27.3f&&p.z< -26.8f&&Mathf.Abs(p.y)<.1f&&gateWalker.Grounded,$"feet={p:F4}");
                }
                foreach(bool west in new[]{true,false})
                {
                    gateWalker.Place(new Vector3(west?-2.3f:19.3f,.03f,-26));
                    for(int i=0;i<270;i++)gateWalker.Move(Vector2.up,180,false,step);
                    var turn=gateWalker.transform.position;
                    for(int i=0;i<270;i++)gateWalker.Move(Vector2.up,west?90:270,false,step);
                    var end=gateWalker.transform.position;
                    Check((west?"West":"East")+" gate return prevents a side bypass",turn.z< -27.4f&&end.z< -27.4f&&(west?end.x< -1.65f:end.x>18.65f)&&Mathf.Abs(end.y)<.1f,
                        $"turn={turn:F4}, final={end:F4}");
                }
                UnityEngine.Object.DestroyImmediate(gateWalker.gameObject);
            }
            const float z=-21.200422603832735f;
            foreach(float x in new[]{8f,16f})
                Ray("Open hall to rear boundary x="+x,new Vector3(x,1.4f,-12),Vector3.back,20,
                    centralGate?"south-concourse-hall-rear-boundary-rear":"south-concourse-hall-rear-boundary-glass",
                    new Vector3(x,1.4f,z-(centralGate?8.25f:7.2f)));
            Ray("Hall soffit",new Vector3(8,11,-23),Vector3.up,5,"south-concourse-hall-soffit",new Vector3(8,13,-23));
            Ray("Front stone band",new Vector3(8,15,-18),Vector3.back,8,"south-concourse-continuous-stone-band",new Vector3(8,15,z));
            Ray("Deep rose opening",new Vector3(15,25,-18),Vector3.back,10,"south-concourse-bay-5-rose-opening-back-glass",new Vector3(15,25,z-2.4f));
            Ray("Upper recessed opening",new Vector3(22.5f,29,-18),Vector3.back,10,"south-concourse-bay-5-upper-opening-back-glass",new Vector3(22.5f,29,z-4.2f));
            var walker=new GameObject("Hall release walker").AddComponent<FirstPersonWalker>();
            var live=new GameObject("Hall live ball").AddComponent<BallBody>();live.SetProfile(BallProfile.Phase2Default);
            using(var prediction=new ShotSimulation(true,layout))
            foreach(float x in new[]{8f,16f})
            foreach(var setting in new[]{Vector2.zero,new Vector2(-160,0),new Vector2(160,0),new Vector2(0,-160),new Vector2(0,160)})
            {
                walker.Place(new Vector3(x,.03f,-24));
                bool clear=walker.TryRelease(0,10,out var release,live.Profile.radius_m);
                float maxPosition=0,maxRotation=0;
                int currentStep=-1,firstDivergence=-1;
                var trace=new List<string>();
                Action<ContactSample> liveContact=c=>trace.Add(JsonUtility.ToJson(new ReplayContact(currentStep,"live",c)));
                Action<ContactSample> predictionContact=c=>trace.Add(JsonUtility.ToJson(new ReplayContact(currentStep,"prediction",c)));
                live.Contact+=liveContact;prediction.Ball.Contact+=predictionContact;
                if(clear)
                {
                    StationMotion.SetTime(prediction.Scene,StationMotion.Time(root.scene));
                    Vector3 velocity=Quaternion.Euler(-10,0,0)*Vector3.forward*2,spin=SpinControls.Compose(0,setting.x,setting.y);
                    live.Launch(release,velocity,spin);prediction.Ball.Launch(release,velocity,spin);Physics.SyncTransforms();
                    for(int step=0;step<720;step++)
                    {
                        currentStep=step;
                        live.BeforeStep(BallBody.Step);prediction.Ball.BeforeStep(BallBody.Step);
                        float positionError=Vector3.Distance(live.Body.position,prediction.Ball.Body.position),rotationError=Quaternion.Angle(live.Body.rotation,prediction.Ball.Body.rotation);
                        maxPosition=Mathf.Max(maxPosition,positionError);maxRotation=Mathf.Max(maxRotation,rotationError);
                        if(firstDivergence<0&&(positionError>=.001f||rotationError>=.1f))firstDivergence=step;
                        trace.Add(JsonUtility.ToJson(new ReplayState {step=step,livePosition=live.Body.position,predictionPosition=prediction.Ball.Body.position,
                            liveVelocity=live.Velocity,predictionVelocity=prediction.Ball.Velocity,liveSpin=live.AngularVelocity,predictionSpin=prediction.Ball.AngularVelocity,
                            positionError=positionError,rotationError=rotationError,liveRecoveries=live.StaticOverlapRecoveries,predictionRecoveries=prediction.Ball.StaticOverlapRecoveries}));
                    }
                }
                live.Contact-=liveContact;prediction.Ball.Contact-=predictionContact;
                Directory.CreateDirectory(output);
                File.WriteAllLines(Path.Combine(output,$"replay-{x}-{setting.x}-{setting.y}.jsonl"),trace);
                Check($"Hall live/prediction x={x}, top/kick={setting}",clear&&maxPosition<.001f&&maxRotation<.1f&&live.ContactBudgetExhaustions==0&&prediction.Ball.ContactBudgetExhaustions==0,
                    $"clear={clear}, samples=720, position={maxPosition:R}m, rotation={maxRotation:R}deg, first divergence={firstDivergence}, budgets={live.ContactBudgetExhaustions}/{prediction.Ball.ContactBudgetExhaustions}");
            }
            report.Add("Scope: editor geometry, actual colliders and deterministic ball queries; not normal-input or photographic acceptance.");
            Directory.CreateDirectory(output);File.WriteAllLines(output+"/verification.txt",report);
            UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(live.gameObject);UnityEngine.Object.DestroyImmediate(root);
            foreach(string line in report)Debug.Log(line);
            if(failed>0)throw new Exception(failed+" south hall checks failed");
        }
    }
}
