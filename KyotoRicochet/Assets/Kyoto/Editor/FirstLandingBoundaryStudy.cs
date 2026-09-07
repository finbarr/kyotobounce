using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Continuous capsule pushes cover the changed landing perimeter. Removing
    // only the new guards in this temporary scene supplies a negative control.
    public static class FirstLandingBoundaryStudy
    {
        static string Arg(string key) => Environment.GetCommandLineArgs().Single(a => a.StartsWith("--kyoto-" + key + "=")).Split('=', 2)[1];
        public static void Run()
        {
            string output=Arg("evidence"),text=File.ReadAllText(Arg("layout-candidate"));
            if(Directory.Exists(output))throw new InvalidOperationException("Use a fresh evidence directory.");
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("First landing guard verification");
            StationWorld.Create(root.transform,JsonUtility.FromJson<StationLayout>(text));Physics.SyncTransforms();
            var walker=new GameObject("Landing perimeter walker").AddComponent<FirstPersonWalker>();
            var prefixes=new[]{"east-second-west-return","east-second-notch-return","east-second-frontage-return"};
            var guards=root.GetComponentsInChildren<Collider>().Where(c=>prefixes.Any(p=>c.name.StartsWith(p))).ToArray();
            if(guards.Length<9)throw new InvalidOperationException("Expected new glass, rail and base colliders.");
            string heightArg=Environment.GetCommandLineArgs().SingleOrDefault(a=>a.StartsWith("--kyoto-first-landing-elevation="));
            float h=heightArg==null?7.35f:float.Parse(heightArg.Split('=',2)[1],System.Globalization.CultureInfo.InvariantCulture);
            if(h<3||h>10)throw new ArgumentOutOfRangeException("first-landing-elevation");
            var cases=new[]{
                (id:"west",start:new Vector3(30.05f,h+.03f,2.4f),boundary:new Vector3(29.56f,h,2.4f),outward:Vector3.left,yaw:-90f),
                (id:"notch",start:new Vector3(31f,h+.03f,1.75f),boundary:new Vector3(31f,h,1.24f),outward:Vector3.back,yaw:180f),
                (id:"frontage",start:new Vector3(32.76f,h+.03f,0),boundary:new Vector3(32.24f,h,0),outward:Vector3.left,yaw:-90f)
            };
            var report=new List<string>{"First-landing perimeter: continuous player pushes and guard-disabled negative controls; not ordinary input acceptance."};
            using(var hash=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant());
            var trace=new List<string>{"guards_enabled,edge,frame,x,y,z,grounded"};int failures=0;
            foreach(bool enabled in new[]{true,false})
            {
                foreach(var c in guards)c.enabled=enabled;
                Physics.SyncTransforms();
                foreach(var q in cases)
                {
                    walker.Place(q.start);Physics.SyncTransforms();float minY=q.start.y,maxOutward=-10;
                    for(int frame=0;frame<180;frame++)
                    {
                        StationMotion.Advance(root.scene,1f/90);Physics.SyncTransforms();walker.Move(Vector2.up,q.yaw,false,1f/90);
                        var p=walker.transform.position;minY=Mathf.Min(minY,p.y);maxOutward=Mathf.Max(maxOutward,Vector3.Dot(p-q.boundary,q.outward));
                        if(frame%9==0)trace.Add(FormattableString.Invariant($"{enabled},{q.id},{frame},{p.x:R},{p.y:R},{p.z:R},{walker.Grounded}"));
                    }
                    bool pass=enabled?minY>h-.05f&&maxOutward<-.15f&&walker.Grounded:minY<h-.25f||maxOutward>.10f;
                    if(!pass)failures++;
                    report.Add(FormattableString.Invariant($"{(pass?"PASS":"FAIL")} guards={enabled} edge={q.id}: minY={minY:R}, maxOutward={maxOutward:R}, grounded={walker.Grounded}"));
                }
            }
            foreach(var c in guards)c.enabled=true;Physics.SyncTransforms();
            // The recessed point is outside the frontage roof, so its next floor
            // is the ground concourse. Include player-only walking geometry here.
            foreach(var q in new[]{(id:"recess",point:new Vector3(30.8f,h+.65f,0),expectedY:0f),
                                   (id:"retained landing",point:new Vector3(33f,h+.65f,0),expectedY:h)})
            {
                bool hit=Physics.Raycast(q.point,Vector3.down,out var contact,9f,CollisionLayers.WalkingMask,QueryTriggerInteraction.Ignore);
                bool pass=hit&&Mathf.Abs(contact.point.y-q.expectedY)<.05f;
                if(!pass)failures++;
                report.Add($"{(pass?"PASS":"FAIL")} {q.id} walking support: hit={(hit?contact.collider.name:"none")}, Y={contact.point.y:R}, expected Y={q.expectedY:R}");
            }
            Directory.CreateDirectory(output);File.WriteAllLines(output+"/verification.txt",report);File.WriteAllLines(output+"/trace.csv",trace);
            UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(root);
            if(failures>0)throw new InvalidOperationException(failures+" landing boundary assertions failed.");
        }
    }
}
