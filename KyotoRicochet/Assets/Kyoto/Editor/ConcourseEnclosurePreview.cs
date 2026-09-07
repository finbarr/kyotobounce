using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Source-candidate study. Opens the saved scene, adds only the new meshes,
    // and renders paired views without saving scene or material assets.
    public static class ConcourseEnclosurePreview
    {
        [Serializable] sealed class Poses {public StationLayout.ComparisonCamera[] cameras;}
        static string Argument(string name)
        {
            string prefix="--kyoto-"+name+"=";
            var value=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return value==null?throw new ArgumentException("Required: "+prefix):value.Substring(prefix.Length);
        }
        public static void Run()
        {
            string path=Argument("layout-candidate"),output=Argument("evidence"),posePath=Argument("concourse-poses");
            var candidate=JsonUtility.FromJson<StationLayout>(File.ReadAllText(path));
            var baseline=StationLayout.Load();
            if(candidate.panels.Length<=baseline.panels.Length)throw new InvalidOperationException("No added panels.");
            for(int i=0;i<baseline.panels.Length;i++)
                if(JsonUtility.ToJson(candidate.panels[i])!=JsonUtility.ToJson(baseline.panels[i]))
                    throw new InvalidOperationException("Preview does not replace existing geometry: "+baseline.panels[i].id);
            var added=candidate.panels.Skip(baseline.panels.Length).ToArray();
            if(added.Any(p=>!p.id.StartsWith("concourse-")||!p.collision))throw new InvalidOperationException("Unexpected candidate addition.");
            var poses=JsonUtility.FromJson<Poses>(File.ReadAllText(posePath)).cameras;
            EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            var view=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            var reflection=UnityEngine.Object.FindFirstObjectByType<PlanarFacadeReflection>();
            Directory.CreateDirectory(output);
            void Capture(StationLayout.ComparisonCamera pose,string stage)
            {
                int width=pose.captureWidth,height=pose.captureHeight;
                view.transform.SetPositionAndRotation(pose.position,Quaternion.LookRotation(pose.lookAt-pose.position)*Quaternion.AngleAxis(pose.roll,Vector3.forward));
                view.fieldOfView=pose.fov;view.aspect=(float)width/height;view.ResetProjectionMatrix();
                if(reflection)reflection.RenderForCamera(view,width,height);
                MunicipalMaterialPreview.Capture(view,width,height,Path.Combine(output,pose.id+"-"+stage+".png"));
            }
            foreach(var pose in poses)Capture(pose,"before");
            var materials=new Dictionary<string,Material>();
            foreach(var pair in new[]{("facade","Facade"),("limestone","Pale cladding"),("dark-metal","Dark facade frame")})
            {
                var material=AssetDatabase.LoadAssetAtPath<Material>("Assets/Kyoto/Phase2/Materials/"+pair.Item2+".mat");
                if(!material)throw new InvalidOperationException("Missing material "+pair.Item2);
                materials.Add(pair.Item1,material);
            }
            var root=new GameObject("Temporary concourse enclosure candidate");
            StationWorld.Create(root.transform,new StationLayout{boxes=Array.Empty<StationLayout.Box>(),
                beams=Array.Empty<StationLayout.Beam>(),flights=Array.Empty<StationLayout.Flight>(),panels=added},true,false,materials);
            Physics.SyncTransforms();
            foreach(var pose in poses)Capture(pose,"candidate");
            using(var hash=SHA256.Create())
                File.WriteAllText(Path.Combine(output,"preview.txt"),"Temporary editor GPU source study; scene not saved.\ncandidate_sha256="+
                    BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant()+
                    "\nadded_panels="+added.Length+"\nNot photo registration, normal input, native release or performance acceptance.\n");
            Debug.Log("KYOTO_CONCOURSE_PREVIEW_COMPLETE "+output);
        }
    }
}
