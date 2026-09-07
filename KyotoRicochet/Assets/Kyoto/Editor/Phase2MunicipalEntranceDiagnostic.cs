using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    // Use the default physics scene: this is the scene queried by the production
    // walker's ground snap and hand-release checks.
    public static class Phase2MunicipalEntranceDiagnostic
    {
        public static void Run()
        {
            string resource=null,output=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-municipal-resource="))resource=arg.Substring("--kyoto-municipal-resource=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            }
            if(resource==null||output==null)throw new ArgumentException("Explicit municipal resource and evidence paths required.");
            if(!Application.isPlaying)throw new InvalidOperationException("Walking checks require Play mode.");
            Directory.CreateDirectory(output);
            var asset=Resources.Load<MunicipalGeometry>(resource);
            if(!asset)throw new InvalidDataException("Municipal asset absent.");
            var root=new GameObject("Municipal entrance join diagnostic");
            var actor=new GameObject("Entrance walker");
            var failures=new List<string>();var rows=new List<string>{"route,frame,x,y,z,groundY,grounded"};
            float maxHeightError=0,maxStep=0;int samples=0,routes=0;
            try
            {
                var surface=Surface.Material("Entrance diagnostic surface",.68f,.5f);
                asset.Create(root.transform,true,false,_=>surface,p=>p.role=="municipal-ground");
                StationGeometry.Box(root.transform,"Current concourse",new Vector3(20,-.3f,-6),new Vector3(210,.6f,70),surface,"concourse","CONCOURSE");
                actor.AddComponent<CharacterController>();var walker=actor.AddComponent<FirstPersonWalker>();
                const float dt=1f/90;
                foreach(float x in new[]{-50f,0f,50f})
                {
                    walker.Place(new Vector3(x,.03f,26));Physics.SyncTransforms();
                    for(int i=0;i<90;i++)walker.Move(Vector2.zero,0,false,dt);
                    foreach(float yaw in new[]{0f,180f})
                    {
                        routes++;string name=$"x{x}-{(yaw==0?"out":"in")}";
                        var start=actor.transform.position;var previous=start;
                        for(int i=0;i<810;i++)
                        {
                            walker.Move(Vector2.up,yaw,false,dt);var feet=actor.transform.position;
                            maxStep=Mathf.Max(maxStep,Mathf.Abs(feet.y-previous.y));previous=feet;
                            if(i%9!=0)continue;
                            samples++;
                            bool hit=Physics.Raycast(feet+Vector3.up*2,Vector3.down,out var ground,4,CollisionLayers.WalkingMask,QueryTriggerInteraction.Ignore);
                            float error=hit?Mathf.Abs(feet.y-ground.point.y):float.PositiveInfinity;
                            maxHeightError=Mathf.Max(maxHeightError,error);
                            if(!hit||error>.06f||!walker.Grounded)failures.Add($"{name},{i},hit={hit},heightError={error:R},grounded={walker.Grounded}");
                            rows.Add(FormattableString.Invariant($"{name},{i},{feet.x:R},{feet.y:R},{feet.z:R},{ground.point.y:R},{walker.Grounded}"));
                        }
                        float travel=Vector3.Dot(actor.transform.position-start,yaw==0?Vector3.forward:Vector3.back);
                        if(Mathf.Abs(travel-12.6f)>.08f)failures.Add($"{name},travel={travel:R}");
                        var stop=actor.transform.position;
                        for(int i=0;i<90;i++)walker.Move(Vector2.zero,yaw,false,dt);
                        if(Vector3.Distance(stop,actor.transform.position)>.02f)failures.Add($"{name},stop drift");
                        if(!walker.TryRelease(yaw,0,out _))failures.Add($"{name},hand release blocked");
                    }
                }
            }
            finally{UnityEngine.Object.DestroyImmediate(actor);UnityEngine.Object.DestroyImmediate(root);}
            File.WriteAllLines(Path.Combine(output,"walking-trace.csv"),rows);
            File.WriteAllLines(Path.Combine(output,"failures.csv"),failures);
            var report=new[]{failures.Count==0?"PASS entrance transition walking":"FAIL entrance transition walking",
                $"resource={resource}; geometry_sha256={asset.geometrySha256}; manifest_sha256={asset.manifestSha256}",
                $"routes={routes}; samples={samples}; maxHeightErrorM={maxHeightError:R}; maxFrameHeightChangeM={maxStep:R}; failures={failures.Count}",
                "Production CharacterController, placed once per lane; continuous outward/return movement, stops and hand releases.",
                "Default physics scene, isolated source ground plus the current concourse dimensions. This is not a native keyboard walkthrough or a complete station-route check."};
            File.WriteAllLines(Path.Combine(output,"verification.txt"),report);foreach(var line in report)Debug.Log(line);
            if(failures.Count>0)throw new Exception("Municipal entrance walking failed: "+failures.Count);
        }
    }
}
