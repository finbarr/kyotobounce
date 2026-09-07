#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto
{
    // Read-only candidate assessment in an isolated physics scene. Does not
    // replace the station layout, scene, course or native application.
    public static class MunicipalGroundVerification
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            if(!Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-municipal-ground"))return;
            try{Run();Application.Quit(0);}
            catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        [Serializable] sealed class Query
        {
            public float x,z,height,edgeClearanceM;
            public bool expectedHit,ballProbe;
            public int triangle;
            public Vector3 normal;
        }
        [Serializable] sealed class Fixture
        {
            public string sourceSha256;
            public StationLayout.Panel panel;
            public Query[] queries;
            public Curb[] curbs;
        }
        [Serializable] sealed class Curb {public Vector3 point,normal;public int triangle;public float edgeClearanceM;}
        public static void Run()
        {
            string input=null,output=null,municipalResource=null;
            foreach(string arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-fixture="))input=arg.Substring("--kyoto-fixture=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
                if(arg.StartsWith("--kyoto-municipal-resource="))municipalResource=arg.Substring("--kyoto-municipal-resource=".Length);
            }
            if(input==null||output==null)throw new ArgumentException("Explicit fixture and evidence paths are required.");
            Directory.CreateDirectory(output);
            var fixture=JsonUtility.FromJson<Fixture>(File.ReadAllText(input));
            var layout=new StationLayout{boxes=Array.Empty<StationLayout.Box>(),beams=Array.Empty<StationLayout.Beam>(),
                flights=Array.Empty<StationLayout.Flight>(),panels=new[]{fixture.panel}};
            var report=new List<string>{$"Unity={Application.unityVersion}; editor={Application.isEditor}; source={fixture.sourceSha256}",
                "Isolated open source terrain: sampled height casts and production BallBody impacts. No whole-station, native-input or solid-volume claim."};
            var failures=new List<string>();var curbDetails=new List<string>();var sweepDetails=new List<string>();
            int casts=0,balls=0,curbBalls=0;float maxHeight=0,maxNormal=0,maxImpactPlaneError=0,maxEnergyGain=0;
            using(var sim=new ShotSimulation(municipalResource==null,layout,profile:BallProfile.Phase2Default))
            {
                if(municipalResource!=null)
                {
                    var municipal=Resources.Load<MunicipalGeometry>(municipalResource);
                    if(!municipal)throw new InvalidDataException("Missing municipal resource: "+municipalResource);
                    var response=Surface.Material("Isolated source-ground diagnostic asphalt",.68f,.50f);
                    municipal.Create(sim.Root,true,false,_=>response,p=>p.role=="municipal-ground");
                    report.Add($"resource={municipalResource}; geometry_sha256={municipal.geometrySha256}; manifest_sha256={municipal.manifestSha256}");
                }
                Physics.SyncTransforms();
                foreach(var q in fixture.queries)
                {
                    casts++;
                    bool hit=sim.Physics.Raycast(new Vector3(q.x,5,q.z),Vector3.down,out var h,12,
                        CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore);
                    if(hit!=q.expectedHit){failures.Add($"cast,{q.x},{q.z},expected={q.expectedHit},actual={hit}");continue;}
                    if(!hit)continue;
                    float error=Mathf.Abs(h.point.y-q.height),normalError=1-Vector3.Dot(h.normal,q.normal);
                    maxHeight=Mathf.Max(maxHeight,error);maxNormal=Mathf.Max(maxNormal,normalError);
                    if(error>.002f||normalError>.01f)failures.Add($"height,{q.x},{q.z},error={error:R},normal={normalError:R}");
                    if(!q.ballProbe)continue;
                    var point=new Vector3(q.x,q.height,q.z);
                    foreach(float speed in new[]{3f,16f})foreach(Vector3 spin in new[]{Vector3.zero,Vector3.right*160,Vector3.right*-160,Vector3.forward*160,Vector3.forward*-160})
                    {
                        balls++;ContactSample first=default;bool contacted=false;
                        Action<ContactSample> capture=c=>{if(!contacted){first=c;contacted=true;}};
                        sim.Ball.Contact+=capture;
                        try
                        {
                            sim.Ball.Launch(point+q.normal*(sim.Ball.Profile.radius_m+.05f),-q.normal*speed,spin);
                            Physics.SyncTransforms();
                            for(int i=0;i<12&&!contacted;i++)sim.Ball.BeforeStep(BallBody.Step);
                            bool finite=float.IsFinite(sim.Ball.Body.position.x)&&float.IsFinite(sim.Ball.Body.position.y)&&float.IsFinite(sim.Ball.Body.position.z);
                            if(!contacted||!finite||sim.Ball.ContactBudgetExhaustions!=0)
                                failures.Add($"ball,{q.x},{q.z},speed={speed},spin={spin},contact={contacted},finite={finite},budget={sim.Ball.ContactBudgetExhaustions}");
                            if(contacted)
                            {
                                float planeError=Mathf.Abs(Vector3.Dot(first.point-point,q.normal));
                                float gain=first.EnergyAfter-first.EnergyBefore;
                                maxImpactPlaneError=Mathf.Max(maxImpactPlaneError,planeError);maxEnergyGain=Mathf.Max(maxEnergyGain,gain);
                                if(planeError>.002f||Vector3.Dot(first.normal,q.normal)<.99f||Vector3.Dot(first.outgoingVelocity,q.normal)<=0||gain>1e-5f)
                                    failures.Add($"impact,{q.x},{q.z},speed={speed},spin={spin},planeError={planeError:R},normalDot={Vector3.Dot(first.normal,q.normal):R},energyGain={gain:R}");
                            }
                        }
                        finally{sim.Ball.Contact-=capture;}
                    }
                }
                // Independent triangle-centroid fixtures target actual curb faces,
                // which were deliberately excluded from the broad ground grid.
                if(fixture.curbs!=null)foreach(var q in fixture.curbs)
                foreach(float speed in new[]{3f,16f})foreach(Vector3 spin in new[]{Vector3.zero,Vector3.right*160,Vector3.right*-160,Vector3.forward*160,Vector3.forward*-160})
                {
                    curbBalls++;ContactSample first=default;bool contacted=false;
                    Action<ContactSample> capture=c=>{if(!contacted){first=c;contacted=true;}};
                    sim.Ball.Contact+=capture;
                    try
                    {
                        sim.Ball.Launch(q.point+q.normal*(sim.Ball.Profile.radius_m+.05f),-q.normal*speed,spin);
                        Physics.SyncTransforms();
                        for(int i=0;i<12&&!contacted;i++)
                        {
                            if(q.triangle==829&&speed==3&&spin==Vector3.zero)
                            {
                                var position=sim.Ball.Body.position;
                                bool ray=sim.Physics.Raycast(position,-q.normal,out var rh,.2f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore);
                                bool sweep=sim.Physics.SphereCast(position,sim.Ball.Profile.radius_m,-q.normal,out var sh,.05f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore);
                                sweepDetails.Add(JsonUtility.ToJson(new SweepTrace{frame=i,position=position,ray=ray,rayDistance=rh.distance,rayPoint=rh.point,
                                    rayObject=ray?rh.collider.name:null,rayTriangle=rh.triangleIndex,sweep=sweep,sweepDistance=sh.distance,sweepPoint=sh.point,
                                    sweepObject=sweep?sh.collider.name:null,sweepTriangle=sh.triangleIndex}));
                            }
                            sim.Ball.BeforeStep(BallBody.Step);
                        }
                        float planeError=contacted?Mathf.Abs(Vector3.Dot(first.point-q.point,q.normal)):float.PositiveInfinity;
                        float dot=contacted?Vector3.Dot(first.normal,q.normal):-1;
                        float gain=contacted?first.EnergyAfter-first.EnergyBefore:0;
                        if(!contacted||!float.IsFinite(sim.Ball.Body.position.sqrMagnitude)||sim.Ball.ContactBudgetExhaustions!=0||
                            planeError>.002f||dot<.99f||Vector3.Dot(first.outgoingVelocity,q.normal)<=0||gain>1e-5f)
                        {
                            failures.Add($"curb,{q.triangle},speed={speed},spin={spin},contact={contacted},planeError={planeError:R},normalDot={dot:R},energyGain={gain:R}");
                            if(spin==Vector3.zero)curbDetails.Add(JsonUtility.ToJson(new CurbFailure{fixture=q,speed=speed,point=first.point,normal=first.normal,
                                incoming=first.incomingVelocity,outgoing=first.outgoingVelocity,surfaceId=first.surfaceId,time=first.time,
                                overlapRecoveries=sim.Ball.StaticOverlapRecoveries,maxOverlapDepth=sim.Ball.MaximumStaticOverlapDepth,ballPosition=sim.Ball.Body.position}));
                        }
                        if(contacted){maxImpactPlaneError=Mathf.Max(maxImpactPlaneError,planeError);maxEnergyGain=Mathf.Max(maxEnergyGain,gain);}
                    }
                    finally{sim.Ball.Contact-=capture;}
                }
            }
            report.Add($"casts={casts}; production ball fixtures={balls}; failures={failures.Count}; max height error={maxHeight:R}m; max 1-dot normal={maxNormal:R}");
            report.Add($"curb face production ball fixtures={curbBalls}; edge/nose grazing and terrain outer-boundary checks remain separate");
            report.Add($"max impact-plane error={maxImpactPlaneError:R}m; max contact-energy gain={maxEnergyGain:R}J");
            report.Add(failures.Count==0?"PASS sampled source-terrain contact assessment":"FAIL sampled source-terrain contact assessment");
            File.WriteAllLines(Path.Combine(output,"verification.txt"),report);
            File.WriteAllLines(Path.Combine(output,"failures.csv"),failures);
            File.WriteAllLines(Path.Combine(output,"curb-failures.jsonl"),curbDetails);
            File.WriteAllLines(Path.Combine(output,"sweep-trace.jsonl"),sweepDetails);
            foreach(string line in report)Debug.Log(line);
            if(failures.Count>0)throw new Exception("Source terrain contact failures: "+failures.Count);
        }
        [Serializable] sealed class CurbFailure
        {public Curb fixture;public float speed,time;public string surfaceId;public Vector3 point,normal,incoming,outgoing;public int overlapRecoveries;public float maxOverlapDepth;public Vector3 ballPosition;}
        [Serializable] sealed class SweepTrace
        {public int frame,rayTriangle,sweepTriangle;public Vector3 position,rayPoint,sweepPoint;public bool ray,sweep;public float rayDistance,sweepDistance;public string rayObject,sweepObject;}
    }
}

#endif
