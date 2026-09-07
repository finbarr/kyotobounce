using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Independent occupied/clear-space probes supplement tests of existing mesh faces.
    public static class AtriumBoundaryVerification
    {
        [Serializable] sealed class Probe
        {
            public string id,expectedSurface;
            public Vector3 origin,direction,expectedNormal;
            public float radius,maxDistance,minHitDistance,maxHitDistance;
            public bool clear;
        }
        [Serializable] sealed class Settings {public Probe[] probes;}
        static string Arg(string key)
        {
            string prefix="--kyoto-"+key+"=";
            string value=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return value==null?throw new ArgumentException("Missing "+prefix):value.Substring(prefix.Length);
        }
        public static void Run()
        {
            string text=File.ReadAllText(Arg("layout-candidate")),output=Arg("evidence");
            string settingsText=File.ReadAllText(Arg("boundary-probes"));
            if(Directory.Exists(output)&&Directory.GetFileSystemEntries(output).Length>0)
                throw new InvalidOperationException("Use a fresh boundary evidence directory.");
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("Atrium boundary coverage");
            StationWorld.Create(root.transform,JsonUtility.FromJson<StationLayout>(text));Physics.SyncTransforms();
            var report=new List<string>{"Scoped boundary occupancy and clear-space coverage; no photographic or normal-input acceptance."};
            using(var sha=SHA256.Create())
            {
                report.Add("layout_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant());
                report.Add("probes_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(settingsText))).Replace("-","").ToLowerInvariant());
            }
            var probes=JsonUtility.FromJson<Settings>(settingsText).probes;
            if(probes==null||probes.Length==0)throw new InvalidOperationException("Nonempty boundary probes required.");
            int failures=0;
            foreach(var p in probes)
            {
                if(p.direction.sqrMagnitude<.99f||p.maxDistance<=0||p.radius<0||(!p.clear&&string.IsNullOrEmpty(p.expectedSurface)))
                    throw new InvalidOperationException("Invalid boundary probe "+p.id);
                bool hit=Physics.SphereCast(p.origin,p.radius,p.direction.normalized,out var contact,p.maxDistance,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                string id=hit?contact.collider.name:"none";
                bool normal=p.expectedNormal.sqrMagnitude<.5f||Vector3.Dot(contact.normal,p.expectedNormal.normalized)>.99f;
                bool pass=p.clear?!hit:hit&&id==p.expectedSurface&&normal&&contact.distance>=p.minHitDistance&&contact.distance<=p.maxHitDistance;
                if(!pass)failures++;
                report.Add(FormattableString.Invariant($"{(pass?"PASS":"FAIL")} {p.id}: clearExpected={p.clear}, hit={id}, distance={contact.distance:R}, point={contact.point:F5}, normal={contact.normal:F5}"));
            }
            Directory.CreateDirectory(output);File.WriteAllLines(Path.Combine(output,"verification.txt"),report);
            foreach(string line in report)Debug.Log(line);UnityEngine.Object.DestroyImmediate(root);
            if(failures>0)throw new InvalidOperationException(failures+" boundary probes failed.");
        }
    }
}
