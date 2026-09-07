using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto.Editor
{
    // Coverage probes catch missing enclosure that tests of existing faces miss.
    public static class AtriumFrontageRoofVerification
    {
        static string Arg(string name)
        {
            string prefix="--kyoto-"+name+"=";
            var value=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return value==null?throw new ArgumentException("Missing "+prefix):value.Substring(prefix.Length);
        }
        public static void Run()
        {
            string source=File.ReadAllText(Arg("layout-candidate")),output=Arg("evidence");
            if(Directory.Exists(output)&&Directory.GetFileSystemEntries(output).Length>0)
                throw new InvalidOperationException("Use a fresh roof evidence directory.");
            var root=new GameObject("Frontage roof coverage verification");
            StationWorld.Create(root.transform,JsonUtility.FromJson<StationLayout>(source));Physics.SyncTransforms();
            var report=new List<string>{"Scoped roof coverage above retained glazing; not a survey or normal-input acceptance."};
            using(var sha=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(source))).Replace("-","").ToLowerInvariant());
            int failed=0;
            foreach(float x in new[]{32.25f,33.65f,34.0f})
            foreach(float z in new[]{-20.8f,-18f,-15f,-12f,-9f,-6f,-2.2f})
            {
                bool contact=Physics.SphereCast(new Vector3(x,10.8f,z),.023f,Vector3.up,out var hit,1f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                string id=contact?hit.collider.name:"none";
                bool expected=id=="east-frontage-roof-return"||id.StartsWith("east-frontage-canopy-");
                bool pass=contact&&expected&&hit.point.y>=11.42f&&hit.point.y<=11.52f&&Vector3.Dot(hit.normal,Vector3.down)>.99f;
                if(!pass)failed++;
                report.Add(FormattableString.Invariant($"{(pass?"PASS":"FAIL")} roof X={x:R}, Z={z:R}: hit={id}, height={hit.point.y:R}, normal={hit.normal}, distance={hit.distance:R}"));
            }
            Directory.CreateDirectory(output);File.WriteAllLines(Path.Combine(output,"verification.txt"),report);
            foreach(var line in report)Debug.Log(line);UnityEngine.Object.DestroyImmediate(root);
            if(failed>0)throw new InvalidOperationException(failed+" roof coverage probes failed.");
        }
    }
}
