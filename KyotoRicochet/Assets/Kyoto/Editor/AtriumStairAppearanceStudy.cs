using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace Kyoto.Editor
{
    // Read-only comparison: cloned materials and renderer changes are never saved.
    public static class AtriumStairAppearanceStudy
    {
        static string Arg(string name) => Environment.GetCommandLineArgs()
            .First(a => a.StartsWith("--kyoto-" + name + "="))
            .Substring(("--kyoto-" + name + "=").Length);

        static string Hash(byte[] bytes)
        {
            using(var sha=SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();
        }
        static bool StairAppearance(MeshRenderer r) => r.name.StartsWith("Layout blender-67fae19be052 batch ")
            || r.name.StartsWith("Layout blender-ba59502667e8 batch ");
        static List<string> Triangles(MeshRenderer[] renderers)
        {
            var result=new List<string>();
            foreach(var r in renderers)
            {
                var m=r.GetComponent<MeshFilter>().sharedMesh;
                var v=m.vertices;var n=m.normals;var uv=m.uv;var t=m.triangles;
                for(int k=0;k<t.Length;k+=3)
                {
                    using(var stream=new MemoryStream()) using(var writer=new BinaryWriter(stream))
                    {
                        writer.Write(r.sharedMaterial.name);
                        for(int j=0;j<3;j++)
                        {
                            int i=t[k+j];var p=r.transform.TransformPoint(v[i]);var normal=r.transform.TransformDirection(n[i]);
                            foreach(float f in new[]{p.x,p.y,p.z,normal.x,normal.y,normal.z,uv[i].x,uv[i].y}) writer.Write(f);
                        }
                        writer.Flush();result.Add(Hash(stream.ToArray()));
                    }
                }
            }
            result.Sort(StringComparer.Ordinal);return result;
        }
        public static void VerifySplit()
        {
            string output=Arg("evidence");Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(Arg("before-scene"));
            string layout=Object.FindFirstObjectByType<GameController>().layoutOverride.text;
            var before=Triangles(Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(StairAppearance).ToArray());
            EditorSceneManager.OpenScene(Arg("scene-path"));
            var afterRenderers=Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(StairAppearance).ToArray();
            var after=Triangles(afterRenderers);var lines=new List<string>();
            void Check(bool pass,string message) {lines.Add((pass?"PASS ":"FAIL ")+message);}
            Check(layout==Object.FindFirstObjectByType<GameController>().layoutOverride.text,"Identical architectural layout, physics surfaces, routes, materials and moving lanes.");
            Check(before.SequenceEqual(after),$"Both affected finishes retain all {before.Count} oriented visible triangles, world positions, normals and texture coordinates exactly.");
            var local=afterRenderers.Where(r=>r.bounds.min.x>=15.999f&&r.bounds.max.x<=48.201f&&r.bounds.min.y>=-.301f&&r.bounds.max.y<=15.501f).ToArray();
            Check(local.Length==4,"The two east flights have four independently lit finish renderers.");
            foreach(var r in local)
                Check(r.receiveGI==ReceiveGI.Lightmaps&&r.lightmapIndex>=0&&r.lightmapIndex<LightmapSettings.lightmaps.Length,
                    $"{r.name}: local bounds {r.bounds}, saved lightmap {r.lightmapIndex}.");
            File.WriteAllLines(output+"/verification.txt",lines);
            File.WriteAllText(output+"/triangle-signature.txt",Hash(Encoding.UTF8.GetBytes(string.Join("\n",after)))+"\n");
            if(lines.Any(l=>l.StartsWith("FAIL "))) throw new InvalidOperationException("Stair lighting verification failed.");
        }

        public static void VerifyFinalLighting()
        {
            string output=Arg("evidence");Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(Arg("scene-path"));
            var renderers=Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None)
                .Where(r=>r.name.StartsWith("Layout blender-e8bd1cbb7fbf batch ")||r.name.StartsWith("Layout blender-0a317ee14540 batch ")).ToArray();
            var layout=StationLayout.Load(Object.FindFirstObjectByType<GameController>().layoutOverride);
            var flights=new[]{"east-1f-2f","east-2f-3f"}.Select(id=>
            {
                var panel=layout.panels.Single(p=>p.id==id&&p.ballStairs);
                var bounds=new Bounds(panel.vertices[0],Vector3.zero);
                foreach(var point in panel.vertices)bounds.Encapsulate(point);
                return (id,bounds);
            }).ToArray();
            bool SameBounds(Bounds a,Bounds b)=>Vector3.Distance(a.center,b.center)<.001f&&Vector3.Distance(a.size,b.size)<.001f;
            var lines=new List<string>();
            bool split=renderers.Length==4&&flights.All(f=>renderers.Count(r=>SameBounds(r.bounds,f.bounds))==2);
            lines.Add((split?"PASS ":"FAIL ")+"Two finish renderers per authored eastern stair flight in the final saved scene.");
            foreach(var r in renderers)
            {
                // Match the current authored flight rather than the old 13.8 m
                // run limit, which rejected a correctly lengthened upper stair.
                bool local=flights.Any(f=>SameBounds(r.bounds,f.bounds));
                bool baked=r.receiveGI==ReceiveGI.Lightmaps&&r.lightmapIndex>=0&&r.lightmapIndex<LightmapSettings.lightmaps.Length;
                lines.Add((local&&baked?"PASS ":"FAIL ")+r.name+": local bounds "+r.bounds+"; saved lightmap "+r.lightmapIndex);
            }
            File.WriteAllLines(output+"/verification.txt",lines);
            if(lines.Any(l=>l.StartsWith("FAIL ")))throw new InvalidOperationException("Final stair lighting verification failed.");
        }

        [Serializable] sealed class Pose {public string id;public Vector3 position,lookAt;public float fov,roll,principalPointOffsetY;public int captureWidth,captureHeight;}
        [Serializable] sealed class Poses {public Pose[] cameras;}
        public static void CaptureSaved()
        {
            string output=Arg("evidence");Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(Arg("scene-path"));
            var view=Object.FindFirstObjectByType<GameController>().view;
            var reflection=Object.FindFirstObjectByType<PlanarFacadeReflection>();
            foreach(var p in JsonUtility.FromJson<Poses>(File.ReadAllText(Arg("poses"))).cameras)
            {
                view.transform.SetPositionAndRotation(p.position,Quaternion.LookRotation(p.lookAt-p.position)*Quaternion.AngleAxis(p.roll,Vector3.forward));
                view.fieldOfView=p.fov;view.aspect=(float)p.captureWidth/p.captureHeight;view.ResetProjectionMatrix();
                var projection=view.projectionMatrix;projection.m12=2*p.principalPointOffsetY;view.projectionMatrix=projection;
                reflection.RenderForCamera(view,p.captureWidth,p.captureHeight);
                MunicipalMaterialPreview.Capture(view,p.captureWidth,p.captureHeight,output+"/"+p.id+".png");
            }
        }

        public static void Run()
        {
            string output = Arg("evidence");
            Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(Arg("scene-path"));
            var game = Object.FindFirstObjectByType<GameController>();
            var view = game.view;
            var reflection = Object.FindFirstObjectByType<PlanarFacadeReflection>();
            var targets = Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None)
                .Where(r => r.name.StartsWith("Layout blender-67fae19be052 batch ")).ToArray();
            if(targets.Length == 0) throw new InvalidOperationException("Expected batched stair stone renderers.");
            var originals = targets.Select(r => r.sharedMaterials).ToArray();
            var lightmaps = targets.Select(r => r.lightmapIndex).ToArray();
            var report = new List<string>();
            foreach(var r in targets)
            {
                var mesh = r.GetComponent<MeshFilter>().sharedMesh;
                report.Add($"{r.name}: vertices={mesh.vertexCount}; lightmap={r.lightmapIndex}; bounds={r.bounds}; materials={string.Join(",", r.sharedMaterials.Select(m=>m.name))}");
                var vertices=mesh.vertices; var normals=mesh.normals; var triangles=mesh.triangles;
                float minimumDot=1; int upward=0, backward=0;
                for(int i=0;i<triangles.Length;i+=3)
                {
                    int a=triangles[i], b=triangles[i+1], c=triangles[i+2];
                    var n=Vector3.Cross(vertices[b]-vertices[a],vertices[c]-vertices[a]).normalized;
                    if(n.y>.99f) upward++;
                    if(n.x<-.99f) backward++;
                    foreach(int j in new[]{a,b,c}) minimumDot=Mathf.Min(minimumDot,Vector3.Dot(n,normals[j]));
                }
                report.Add($"normal alignment minimum={minimumDot:R}; upward triangles={upward}; negative-X triangles={backward}");
            }
            var anchor=new GameObject("Temporary lower stair light probe anchor");
            anchor.transform.position=new Vector3(22,4.8f,4.65f);
            foreach(var position in new[]{targets[0].bounds.center,anchor.transform.position})
            {
                LightProbes.GetInterpolatedProbe(position,null,out var sh);var values=new Color[2];
                sh.Evaluate(new[]{Vector3.up,Vector3.left},values);
                report.Add($"Probe {position}: up={values[0]}; riser={values[1]}");
            }
            foreach(string variant in new[]{"baseline","flat-normal","neutral-albedo","probe-lighting","local-probe"})
            {
                var copies=new List<Material>();
                for(int i=0;i<targets.Length;i++)
                {
                    var materials=originals[i].Select(m=>new Material(m)).ToArray(); copies.AddRange(materials);
                    foreach(var m in materials)
                    {
                        if(variant=="flat-normal") m.DisableKeyword("_NORMALMAP");
                        if(variant=="neutral-albedo") {m.SetTexture("_BaseMap",null);m.SetColor("_BaseColor",new Color(.48f,.48f,.48f,1));}
                    }
                    targets[i].sharedMaterials=materials;
                    targets[i].lightmapIndex=variant=="probe-lighting"?-1:lightmaps[i];
                    targets[i].lightProbeUsage=LightProbeUsage.BlendProbes;
                    targets[i].probeAnchor=variant=="local-probe"?anchor.transform:null;
                }
                view.transform.SetPositionAndRotation(new Vector3(11,1.65f,2),Quaternion.LookRotation(new Vector3(19,6.75f,2.4f)));
                view.fieldOfView=67;view.aspect=1.5f;view.ResetProjectionMatrix();
                reflection.RenderForCamera(view,1200,800);
                MunicipalMaterialPreview.Capture(view,1200,800,output+"/"+variant+".png");
                for(int i=0;i<targets.Length;i++) targets[i].sharedMaterials=originals[i];
                foreach(var m in copies) Object.DestroyImmediate(m);
            }
            File.WriteAllLines(output+"/diagnostic.txt",report);
            Debug.Log("ATRIUM_STAIR_STUDY_COMPLETE");
        }
    }
}
