using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto.Editor
{
    // Exercise the actual player against the passage edge that a centered
    // route does not cover. This is automated collision evidence, not input QA.
    public static class AtriumPassageBoundaryVerification
    {
        static string Argument(string name)
        {
            string prefix="--kyoto-"+name+"=";
            var arg=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return arg==null?throw new ArgumentException("Missing "+prefix):arg.Substring(prefix.Length);
        }
        public static void Run()
        {
            string path=Argument("layout-candidate"),output=Argument("evidence");
            if(Directory.Exists(output)&&Directory.GetFileSystemEntries(output).Length>0)
                throw new InvalidOperationException("Use a fresh boundary evidence directory.");
            string text=File.ReadAllText(path);var layout=JsonUtility.FromJson<StationLayout>(text);
            var root=new GameObject("Atrium passage boundary verification");StationWorld.Create(root.transform,layout);
            var walker=new GameObject("Passage edge walker").AddComponent<FirstPersonWalker>();
            var report=new List<string>{"Scoped authored passage edge: physical ray plus continuous capsule push; not ordinary input or building survey."};
            using(var sha=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant());
            var trace=new List<string>{"x_station,frame,x,y,z,grounded"};int failed=0;
            foreach(float x in new[]{33.6f,35f,38f,41f,43f})
            {
                var start=new Vector3(x,7.38f,.2f);walker.Place(start);Physics.SyncTransforms();
                string expected=x<34.4f?"east-upper-bank-entry-cheek":"east-upper-bank-passage-enclosure";
                bool ray=Physics.Raycast(start+Vector3.up*.35f,Vector3.forward,out var hit,2f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)
                    &&hit.collider.name==expected;
                float maxZ=start.z,minY=start.y;
                for(int frame=0;frame<180;frame++)
                {
                    StationMotion.Advance(root.scene,1f/90);Physics.SyncTransforms();
                    walker.Move(Vector2.up,0,false,1f/90);
                    var p=walker.transform.position;maxZ=Mathf.Max(maxZ,p.z);minY=Mathf.Min(minY,p.y);
                    if(frame%9==0)trace.Add(FormattableString.Invariant($"{x:R},{frame},{p.x:R},{p.y:R},{p.z:R},{walker.Grounded}"));
                }
                bool pass=ray&&maxZ<.8f&&maxZ>.3f&&minY>7.30f&&walker.Grounded;
                if(!pass)failed++;
                report.Add($"{(pass?"PASS":"FAIL")} passage edge X={x:R}: expected={expected}, ray={ray}, hit={(hit.collider?hit.collider.name:"none")}, maxZ={maxZ:R}, minY={minY:R}, grounded={walker.Grounded}");
            }
            Directory.CreateDirectory(output);File.WriteAllLines(Path.Combine(output,"verification.txt"),report);File.WriteAllLines(Path.Combine(output,"trace.csv"),trace);
            foreach(string line in report)Debug.Log(line);
            UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(root);
            if(failed>0)throw new Exception(failed+" passage edge checks failed.");
        }
    }
}
