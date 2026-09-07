using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

namespace Kyoto.Editor
{
    // Temporary local reflection comparison. No scene or material asset is saved.
    public static class AtriumCladdingAppearanceStudy
    {
        [Serializable] sealed class Pose {public string id;public Vector3 position,lookAt;public float fov,roll;public int captureWidth,captureHeight;}
        [Serializable] sealed class Poses {public Pose[] cameras;}
        static string Arg(string key)=>Environment.GetCommandLineArgs().First(a=>a.StartsWith("--kyoto-"+key+"=")).Substring(("--kyoto-"+key+"=").Length);
        static string output;static Pose[] poses;static Camera view;static ReflectionProbe probe;
        static void Capture(string variant)
        {
            var reflection=Object.FindFirstObjectByType<PlanarFacadeReflection>();
            foreach(var p in poses.Where(p=>p.id=="ground-reverse"||p.id=="lower-ascent"||p.id=="theatre-passage"))
            {
                view.transform.SetPositionAndRotation(p.position,Quaternion.LookRotation(p.lookAt-p.position)*Quaternion.AngleAxis(p.roll,Vector3.forward));
                view.fieldOfView=p.fov;view.aspect=(float)p.captureWidth/p.captureHeight;view.ResetProjectionMatrix();
                reflection.RenderForCamera(view,p.captureWidth,p.captureHeight);
                MunicipalMaterialPreview.Capture(view,p.captureWidth,p.captureHeight,output+"/"+variant+"-"+p.id+".png");
            }
        }
        public static void Run()
        {
            output=Arg("evidence");if(Directory.Exists(output))throw new InvalidOperationException("Use a fresh study directory.");Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(Arg("scene-path"));view=Object.FindFirstObjectByType<GameController>().view;
            poses=JsonUtility.FromJson<Poses>(File.ReadAllText(Arg("poses"))).cameras;
            var rows=new List<string>{"Read-only local reflection study; no photographic acceptance."};
            var targets=Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.name.StartsWith("Layout blender-41a83148cd18 batch ")).ToArray();
            if(targets.Length==0)throw new InvalidOperationException("Missing authored granite renderers.");
            foreach(var r in targets)
                rows.Add($"{r.name}: bounds={r.bounds}, GI={r.receiveGI}, lightmap={r.lightmapIndex}, UVscale={r.lightmapScaleOffset}, vertices={r.GetComponent<MeshFilter>().sharedMesh.vertexCount}, reflection={r.reflectionProbeUsage}");
            foreach(var p in Object.FindObjectsByType<ReflectionProbe>(FindObjectsSortMode.None))rows.Add($"Existing reflection: {p.name}, position={p.transform.position}, bounds={p.bounds}, texture={(p.texture?p.texture.name:"missing")}");
            File.WriteAllLines(output+"/diagnostic.txt",rows);Capture("baseline");
            probe=new GameObject("Temporary eastern ground reflection").AddComponent<ReflectionProbe>();
            probe.transform.position=new Vector3(26,3,-6);probe.size=new Vector3(55,18,40);probe.boxProjection=true;probe.blendDistance=1;probe.importance=10;
            probe.mode=ReflectionProbeMode.Baked;
            probe.resolution=256;probe.hdr=true;probe.nearClipPlane=.05f;probe.farClipPlane=180;
            string asset=Arg("probe-asset");if(File.Exists(asset))throw new InvalidOperationException("Use a fresh probe asset.");
            Directory.CreateDirectory(Path.GetDirectoryName(asset));
            if(!Lightmapping.BakeReflectionProbe(probe,asset))throw new InvalidOperationException("Reflection bake failed.");
            AssetDatabase.Refresh();probe.bakedTexture=AssetDatabase.LoadAssetAtPath<Texture>(asset);
            if(!probe.bakedTexture)throw new InvalidOperationException("Missing baked reflection texture.");
            File.AppendAllText(output+"/diagnostic.txt",$"Study reflection position={probe.transform.position}, bounds={probe.bounds}, texture={probe.bakedTexture.name}\n");
            Capture("local-reflection");File.AppendAllText(output+"/diagnostic.txt","Local 256px HDR box-projected reflection captured successfully; no geometry, albedo or light changes.\n");
            Object.DestroyImmediate(probe.gameObject);
        }
    }
}
