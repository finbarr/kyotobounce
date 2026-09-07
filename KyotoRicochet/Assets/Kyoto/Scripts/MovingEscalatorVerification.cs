#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto
{
    public static class MovingEscalatorVerification
    {
        static readonly List<string> report=new List<string>();
        static int failures;
        static void Check(bool ok,string name,string detail)
        {string line=(ok?"PASS ":"FAIL ")+name+": "+detail;report.Add(line);Debug.Log(line);if(!ok)failures++;}
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            var args=Environment.GetCommandLineArgs();if(!Array.Exists(args,a=>a=="--kyoto-moving-escalators"))return;
            string output=null;foreach(var a in args)if(a.StartsWith("--kyoto-evidence="))output=a.Substring("--kyoto-evidence=".Length);
            try{if(string.IsNullOrEmpty(output))throw new ArgumentException("Explicit evidence directory required.");Run(output);Application.Quit(0);}
            catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        public static void Run(string output="../artifacts/phase2/moving-escalators/current",string candidatePath=null)
        {
            report.Clear();failures=0;Directory.CreateDirectory(output);
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; selected ball={BallProfile.Phase2Default.id}");
            string layoutText=candidatePath==null?Resources.Load<TextAsset>("StationLayout").text:File.ReadAllText(candidatePath);
            var layout=JsonUtility.FromJson<StationLayout>(layoutText);
            using(var hash=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(layoutText))).Replace("-","").ToLowerInvariant());
            var gravity=Physics.gravity;
            try{SweepOracle();BroadPhase();MovingImpacts();Timing();Parity();Riding();Openings(layout);StationImpacts(layout,output);}
            finally{Physics.gravity=gravity;File.WriteAllLines(Path.Combine(output,"verification.txt"),report);}
            if(failures>0)throw new Exception(failures+" moving escalator checks failed.");
        }
        static MovingEscalator Fixture(ShotSimulation sim,float speed=1)
        {
            var spec=JsonUtility.FromJson<StationLayout.Escalator>(JsonUtility.ToJson(StationLayout.Load().escalators[0]));
            spec.lowerCenter=Vector3.zero;spec.uphill=Vector3.forward;spec.speed=speed;spec.phase=.2f;
            var lane=MovingEscalator.Create(sim.Root,spec,Surface.Material("Moving fixture",.8f,.4f),null,true,false);
            StationMotion.SetAnalyticOnly(sim.Scene,true);return lane;
        }
        static void SweepOracle()
        {
            using(var sim=new ShotSimulation(false))
            {
                Vector3 half=new Vector3(.5f,.12f,.2f);float radius=.023f;
                StationGeometry.Box(sim.Root,"Oracle",Vector3.zero,half*2,Surface.Material("Oracle",.8f,.4f),"oracle","ORACLE");Physics.SyncTransforms();
                var random=new System.Random(5819);int mismatch=0,hits=0;float distanceError=0,normalError=0;
                float R()=>((float)random.NextDouble()*2-1);
                for(int i=0;i<1200;i++)
                {
                    Vector3 p=new Vector3(R(),R(),R()).normalized*(1+Mathf.Abs(R()));
                    Vector3 target=new Vector3(R()*.8f,R()*.4f,R()*.5f),d=(target-p).normalized*4;
                    bool expected=sim.Physics.SphereCast(p,radius,d.normalized,out var hit,d.magnitude,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    bool actual=SweptSphereBox.Cast(p,d,half,radius,out float f,out var n,out _);
                    if(expected!=actual){mismatch++;continue;}if(!expected)continue;hits++;
                    distanceError=Mathf.Max(distanceError,Mathf.Abs(f*d.magnitude-hit.distance));normalError=Mathf.Max(normalError,1-Vector3.Dot(n,hit.normal));
                }
                Check(mismatch==0&&distanceError<.0002f&&normalError<.001f,"Rounded sphere/box sweep against PhysX oracle",$"1200 deterministic face/edge/corner rays; hits={hits}; classification errors={mismatch}; max distance={distanceError:R}m; max 1-dot={normalError:R}");
                bool hitInside=SweptSphereBox.Cast(new Vector3(0,.13f,0),Vector3.down*.1f,half,radius,out float inside, out var normal,out _);
                bool departing=SweptSphereBox.Cast(new Vector3(0,.13f,0),Vector3.up*.1f,half,radius,out _,out _,out _);
                Check(hitInside&&inside==0&&normal.y>.999f&&!departing,"Initial overlap resolves only approaching contact",$"approaching={hitInside}, fraction={inside}; separating={departing}");
            }
        }
        static void BroadPhase()
        {
            using(var sim=new ShotSimulation(false,profile:BallProfile.Phase2Default))
            {
                var lane=Fixture(sim);var random=new System.Random(74598);int different=0,contacts=0;
                float maxTime=0,maxPoint=0,maxNormal=0;
                float R()=>((float)random.NextDouble()*2-1);
                for(int i=0;i<1600;i++)
                {
                    double time=random.NextDouble()*240;lane.specification.speed=(i%2==0?1:-1)*.5f;
                    int step=random.Next(lane.steps.Length);lane.Pose(step,time,out var center,out _,out _);
                    int axis=i%3;Vector3 direction=Vector3.zero;direction[axis]=i%7==0?-1:1;
                    Vector3 half=lane.steps[step].localScale*.5f;
                    Vector3 origin=center+direction*(half[axis]+.023f+.002f+Mathf.Abs(R())*.1f);
                    Vector3 displacement=-direction*(.01f+Mathf.Abs(R())*.2f)+new Vector3(R(),R(),R())*.04f;
                    float dt=i%3==0?1f/90:i%3==1?1f/180:1f/360;
                    bool found=lane.Sweep(origin,displacement,.023f,time,dt,out var accelerated);
                    bool brute=lane.Sweep(origin,displacement,.023f,time,dt,out var reference,false,true);
                    if(found!=brute){different++;continue;}if(!found)continue;contacts++;
                    maxTime=Mathf.Max(maxTime,Mathf.Abs(accelerated.time-reference.time));
                    maxPoint=Mathf.Max(maxPoint,Vector3.Distance(accelerated.point,reference.point));
                    maxNormal=Mathf.Max(maxNormal,Vector3.Distance(accelerated.normal,reference.normal));
                }
                Check(different==0&&maxTime<1e-7f&&maxPoint<1e-5f&&maxNormal<1e-4f,"Motion broad phase agrees with exhaustive step sweeps",
                    $"1600 rays over 240s, both directions, three timesteps; contacts={contacts}; classification={different}; time={maxTime:R}s; point={maxPoint:R}m; normal={maxNormal:R}");
            }
        }
        static ContactSample Impact(float speed,Vector3 incoming,Vector3 spin,bool riser=false)
        {
            using(var sim=new ShotSimulation(false,profile:BallProfile.Phase2Default))
            {
                var lane=Fixture(sim,speed);StationMotion.SetTime(sim.Scene,.17);
                lane.Pose(20,.17,out var center,out _,out _);
                float depth=lane.steps[20].localScale.z,halfHeight=lane.specification.stepHeight*.5f;
                Vector3 origin=center+(riser?new Vector3(0,halfHeight-.08f,-depth*.5f-sim.Ball.Profile.radius_m-.004f):Vector3.up*(halfHeight+sim.Ball.Profile.radius_m+.006f));
                ContactSample first=default;bool hit=false;sim.Ball.Contact+=s=>{if(!hit){hit=true;first=s;}};
                sim.Ball.Launch(origin,incoming,spin);Physics.SyncTransforms();
                for(int i=0;i<100&&!hit;i++)sim.Ball.BeforeStep(BallBody.Step);
                Check(hit&&first.surfaceId==lane.surface.surfaceId&&sim.Ball.ContactBudgetExhaustions==0,
                    riser?"Moving riser catches stationary ball":"Moving tread contact",$"speed={speed}; input={incoming:F3}; spin={spin:F1}; hit={hit}; surface={first.surfaceId}; normal={first.normal:F4}; output={first.outgoingVelocity:F5}");
                return first;
            }
        }
        static void MovingImpacts()
        {
            Physics.gravity=Vector3.zero;
            var up=Impact(1,Vector3.zero,Vector3.zero);
            float expected=1.8f*up.surfaceVelocity.y;
            Check(up.surfaceVelocity.y>.3f&&Mathf.Abs(up.outgoingVelocity.y-expected)<.0001f&&up.EnergyAfter>up.EnergyBefore,
                "Ascending tread does physical work",$"surface vy={up.surfaceVelocity.y:R}; predicted rebound={expected:R}; actual={up.outgoingVelocity.y:R}; work={up.SurfaceWork:R}J");
            var down=Impact(-1,new Vector3(0,-3,.15f),new Vector3(50,0,40));
            var riser=Impact(-1,Vector3.zero,Vector3.zero,true);
            Check(riser.normal.z<-.99f&&riser.outgoingVelocity.z<-.5f,"Descending riser imparts downhill velocity",$"normal={riser.normal:F5}; velocity={riser.outgoingVelocity:F5}");
            float error=0,relativeGain=0;
            foreach(var sample in new[]{up,down,riser})
            {
                error=Mathf.Max(error,Mathf.Abs((sample.EnergyAfter-sample.EnergyBefore)-(sample.RelativeEnergyAfter-sample.RelativeEnergyBefore)-sample.SurfaceWork));
                relativeGain=Mathf.Max(relativeGain,sample.RelativeEnergyAfter-sample.RelativeEnergyBefore);
            }
            Check(error<1e-6f&&relativeGain<1e-6f,"Moving-frame dissipation and world work balance",$"max balance error={error:R}J; max relative gain={relativeGain:R}J");
            var left=Impact(.5f,new Vector3(0,-2,.15f),new Vector3(0,0,80));
            var right=Impact(.5f,new Vector3(0,-2,.15f),new Vector3(0,0,-80));
            Check(Mathf.Abs(left.outgoingVelocity.x)>.2f&&Mathf.Abs(left.outgoingVelocity.x+right.outgoingVelocity.x)<.00001f,
                "Mirrored sidespin survives moving tread contact",$"left vx={left.outgoingVelocity.x:R}; right vx={right.outgoingVelocity.x:R}");
            var back=Impact(.5f,new Vector3(0,-2,.15f),new Vector3(-160,0,0));
            var top=Impact(.5f,new Vector3(0,-2,.15f),new Vector3(160,0,0));
            Check(back.outgoingVelocity.z<-.2f&&top.outgoingVelocity.z>.5f,"Backspin return and topspin drive on moving tread",$"back vz={back.outgoingVelocity.z:R}; top vz={top.outgoingVelocity.z:R}");
        }
        static void Timing()
        {
            Physics.gravity=Vector3.down*9.81f;
            using(var sim=new ShotSimulation(false,profile:BallProfile.Phase2Default))
            {
                var lane=Fixture(sim,.5f);lane.Pose(20,0,out var center,out _,out _);
                Vector3 origin=center+new Vector3(0,.9f,0),velocity=new Vector3(0,-2,.15f),spin=new Vector3(-90,0,35);
                var a=sim.Run(origin,velocity,spin,1.5f,startWorldTime:0);
                var b=sim.Run(origin,velocity,spin,1.5f,startWorldTime:.35);
                var repeat=sim.Run(origin,velocity,spin,1.5f,startWorldTime:0);
                float repeatError=0,phaseDifference=0;
                for(int i=0;i<Mathf.Min(a.Count,b.Count);i++)phaseDifference=Mathf.Max(phaseDifference,Vector3.Distance(a[i].position,b[i].position));
                for(int i=0;i<Mathf.Min(a.Count,repeat.Count);i++)repeatError=Mathf.Max(repeatError,Vector3.Distance(a[i].position,repeat[i].position));
                Check(a.Count==repeat.Count&&repeatError==0&&phaseDifference>.05f,"Release timing changes the bounce reproducibly",$"same input delayed 0.35s: max separation={phaseDifference:R}m; repeated phase error={repeatError:R}m; samples={a.Count}/{b.Count}/{repeat.Count}");
            }
        }
        static void Parity()
        {
            Physics.gravity=Vector3.down*9.81f;
            using(var live=new ShotSimulation(false,profile:BallProfile.Phase2Default))
            using(var preview=new ShotSimulation(false,profile:BallProfile.Phase2Default))
            {
                var a=Fixture(live,.5f);var b=Fixture(preview,.5f);StationMotion.SetAnalyticOnly(live.Scene,false);
                float positionError=0,spinError=0,rotationError=0,solidError=0;int budget=0;
                foreach(double phase in new[]{0.0,.17,3.42,109.91})
                {
                    StationMotion.SetTime(live.Scene,phase);StationMotion.SetTime(preview.Scene,phase);
                    a.Pose(20,phase,out var center,out _,out _);
                    // At late phases this index is on the concealed return; use a
                    // fixed public throw origin there instead of spawning inside it.
                    Vector3 origin=phase>10?new Vector3(0,4.9f,7):center+Vector3.up*.9f;
                    Vector3 velocity=new Vector3(.08f,-2,.15f),spin=new Vector3(-90,0,35);
                    live.Ball.Launch(origin,velocity,spin);preview.Ball.Launch(origin,velocity,spin);Physics.SyncTransforms();
                    for(int i=0;i<360;i++)
                    {
                        live.Ball.BeforeStep(BallBody.Step);preview.Ball.BeforeStep(BallBody.Step);
                        positionError=Mathf.Max(positionError,Vector3.Distance(live.Ball.Body.position,preview.Ball.Body.position));
                        spinError=Mathf.Max(spinError,Vector3.Distance(live.Ball.AngularVelocity,preview.Ball.AngularVelocity));
                        rotationError=Mathf.Max(rotationError,Quaternion.Angle(live.Ball.Body.rotation,preview.Ball.Body.rotation));
                        a.Pose(20,StationMotion.Time(live.Scene),out var expected,out _,out _);
                        solidError=Mathf.Max(solidError,Vector3.Distance(a.steps[20].localPosition,expected));
                    }
                    budget+=live.Ball.ContactBudgetExhaustions+preview.Ball.ContactBudgetExhaustions;
                }
                Check(positionError==0&&spinError==0&&rotationError<.001f&&solidError<1e-6f&&budget==0,
                    "Animated live solids agree with analytic prediction",$"four starting phases, 360 steps each; position={positionError:R}m; spin={spinError:R}; rotation={rotationError:R}deg; collider pose={solidError:R}m; budgets={budget}");
            }
        }
        static void Riding()
        {
            var spec=JsonUtility.FromJson<StationLayout.Escalator>(JsonUtility.ToJson(StationLayout.Load().escalators[0]));
            spec.lowerCenter=new Vector3(500,0,0);spec.uphill=Vector3.forward;
            var root=new GameObject("Riding fixture");
            var lane=MovingEscalator.Create(root.transform,spec,Surface.Material("Ride fixture",.8f,.4f),null,true,true);
            var walker=new GameObject("Riding player").AddComponent<FirstPersonWalker>();
            const float dt=1f/90;
            try
            {
                foreach(float speed in new[]{.5f,-.5f})
                {
                    spec.speed=speed;walker.Place(spec.lowerCenter+new Vector3(0,4/Mathf.Sqrt(3)+.03f,4));
                    void Tick(Vector2 input){StationMotion.Advance(root.scene,dt);Physics.SyncTransforms();walker.Move(input,0,false,dt);}
                    for(int i=0;i<30;i++)Tick(Vector2.zero);
                    Vector3 start=walker.transform.position;int grounded=0;
                    for(int i=0;i<180;i++){Tick(Vector2.zero);if(walker.Grounded)grounded++;}
                    Vector3 change=walker.transform.position-start;
                    Check(Mathf.Sign(change.z)==Mathf.Sign(speed)&&Mathf.Abs(change.z-speed*2*Mathf.Sqrt(.75f))<.06f&&grounded==180,
                        "Standing passenger rides the moving bank",$"speed={speed}; displacement={change:F5}; grounded={grounded}/180");
                    start=walker.transform.position;for(int i=0;i<180;i++)Tick(speed>0?Vector2.down:Vector2.up);
                    change=walker.transform.position-start;
                    Check(change.z*speed<-.25f&&walker.Grounded,"Walking against escalator travel remains possible",$"belt={speed}; displacement={change:F5}; grounded={walker.Grounded}");
                }
            }
            finally{UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(root);}
        }
        static void Openings(StationLayout layout)
        {
            using(var sim=new ShotSimulation(true,layout,BallProfile.Phase2Default))
            {
                var lanes=sim.Root.GetComponentsInChildren<MovingEscalator>();int tested=0,fail=0;var bad=new List<string>();
                foreach(double phase in new[]{0.0,.19,.61})
                {
                    StationMotion.SetTime(sim.Scene,phase);Physics.SyncTransforms();
                    foreach(var lane in lanes)foreach(bool top in new[]{false,true})
                    foreach(float along in new[]{.10f,.35f,.65f,.82f})
                    foreach(float across in new[]{-.25f,0f,.25f})
                    {
                        var spec=lane.specification;
                        float elevation=top?spec.height:0;
                        Vector3 origin=lane.transform.TransformPoint(new Vector3(across*spec.width,elevation+.4f,top?spec.run+along:-along));
                        bool found=sim.Physics.SphereCast(origin,.023f,Vector3.down,out var hit,.7f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                        // A nearest-hit query can hide a stationary floor that is
                        // coplanar with a moving tread. Query static solids alone
                        // as well, so collider ordering cannot mask the overlap.
                        bool staticHit=sim.Physics.SphereCast(origin,.023f,Vector3.down,out var fixedHit,.7f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore);
                        float deckY=lane.transform.TransformPoint(new Vector3(0,elevation,0)).y;
                        bool overlay=staticHit&&fixedHit.point.y>=deckY-.02f;
                        tested++;if(!found||hit.collider.gameObject.layer!=CollisionLayers.MovingSteps||overlay)
                        {
                            fail++;
                            if(bad.Count<24)bad.Add(spec.id+(top?" top":" bottom")+"@"+phase+" along="+along+" across="+across+"="+(found?hit.collider.name:"missing")+(overlay?" static overlay="+fixedHit.collider.name:""));
                        }
                    }
                }
                var expected=new HashSet<string>();
                // Compare generated chains to the independent architectural
                // flight inventory, including added candidate banks.
                int specified=0;
                foreach(var flight in layout.flights)if(flight.role=="escalator"){expected.Add(flight.id);specified++;}
                var actual=new HashSet<string>();foreach(var lane in lanes)actual.Add(lane.specification.id);
                Check(specified>0&&specified==expected.Count&&lanes.Length==expected.Count&&actual.SetEquals(expected)&&tested==expected.Count*72&&fail==0,
                    "All bank flats have moving solids and no stationary floor overlay",
                    $"{tested-fail}/{tested}; lanes={lanes.Length}; expected paired lanes={expected.Count}; "+string.Join(";",bad));
            }
        }
        static void StationImpacts(StationLayout layout,string output)
        {
            Physics.gravity=Vector3.zero;
            var rows=new List<string>{"lane,phase,spin,hit,surface,forward_velocity,lateral_velocity,surface_vy,relative_energy_gain,work_balance_error,contact_budget"};
            using(var sim=new ShotSimulation(true,layout,BallProfile.Phase2Default))
            {
                var lanes=sim.Root.GetComponentsInChildren<MovingEscalator>();
                foreach(var lane in lanes)
                {
                    int hits=0,failed=0;float maximumGain=0,maximumBalance=0,maximumMirror=0;
                    foreach(double phase in new[]{0.0,.19,.61})
                    {
                        StationMotion.SetTime(sim.Scene,phase);
                        int index=-1;float nearest=float.MaxValue;Vector3 center=default;
                        for(int i=0;i<lane.steps.Length;i++)
                        {
                            lane.Pose(i,phase,out var p,out _,out _);
                            float distance=(p-new Vector3(0,lane.specification.height*.5f,lane.specification.run*.5f)).sqrMagnitude;
                            if(distance<nearest){nearest=distance;index=i;center=p;}
                        }
                        if(index<0)throw new InvalidOperationException("No candidate escalator steps: "+lane.name);
                        Vector3 forward=lane.transform.TransformDirection(Vector3.forward),right=lane.transform.TransformDirection(Vector3.right);
                        Vector3 origin=lane.transform.TransformPoint(center)+Vector3.up*(lane.specification.stepHeight*.5f+sim.Ball.Profile.radius_m+.08f);
                        var spins=new[]{Vector3.zero,-right*160,right*160,forward*80,-forward*80};
                        float left=0;
                        for(int j=0;j<spins.Length;j++)
                        {
                            StationMotion.SetTime(sim.Scene,phase);bool found=false;ContactSample first=default;
                            void Contact(ContactSample sample){if(!found){found=true;first=sample;}}
                            sim.Ball.Contact+=Contact;
                            try
                            {
                                sim.Ball.Launch(origin,Vector3.down*2+forward*.15f,spins[j]);Physics.SyncTransforms();
                                for(int k=0;k<90&&!found;k++)sim.Ball.BeforeStep(BallBody.Step);
                            }
                            finally{sim.Ball.Contact-=Contact;}
                            float along=Vector3.Dot(first.outgoingVelocity,forward),across=Vector3.Dot(first.outgoingVelocity,right);
                            float gain=first.RelativeEnergyAfter-first.RelativeEnergyBefore;
                            float balance=Mathf.Abs(first.EnergyAfter-first.EnergyBefore-gain-first.SurfaceWork);
                            bool ok=found&&first.surfaceId==lane.surface.surfaceId&&first.normal.y>.999f&&
                                first.surfaceVelocity.y*lane.specification.speed>0&&gain<1e-6f&&balance<1e-6f&&sim.Ball.ContactBudgetExhaustions==0;
                            if(j==1)ok&=along<-.2f;
                            if(j==2)ok&=along>.5f;
                            if(j==3){left=across;ok&=Mathf.Abs(across)>.2f;}
                            if(j==4){float mirror=Mathf.Abs(left+across);maximumMirror=Mathf.Max(maximumMirror,mirror);ok&=mirror<.0001f;}
                            if(found&&first.surfaceId==lane.surface.surfaceId)hits++;
                            if(!ok)failed++;
                            maximumGain=Mathf.Max(maximumGain,gain);maximumBalance=Mathf.Max(maximumBalance,balance);
                            rows.Add(FormattableString.Invariant($"{lane.specification.id},{phase},{j},{found},{first.surfaceId},{along:R},{across:R},{first.surfaceVelocity.y:R},{gain:R},{balance:R},{sim.Ball.ContactBudgetExhaustions}"));
                        }
                    }
                    Check(hits==15&&failed==0,"Full station moving-tread spin and work: "+lane.specification.id,
                        $"three phases, five spins; hits={hits}/15; failures={failed}; max relative gain={maximumGain:R}J; work error={maximumBalance:R}J; mirrored kick error={maximumMirror:R}m/s");
                }
            }
            File.WriteAllLines(Path.Combine(output,"station-impacts.csv"),rows);
        }
    }
}
#endif
