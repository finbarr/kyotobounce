using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Source-data oracle for the editable Blender export. Calls the production
    // MovingEscalator factory/Pose; it does not duplicate the motion equations.
    public static class Phase2MotionExport
    {
        [Serializable] sealed class Frame { public double time; public Vector3[] local, world; }
        [Serializable] sealed class Solid { public string name; public Vector3[] vertices; public int[] triangles; }
        [Serializable] sealed class Lane
        {
            public string id; public int stepCount; public float speed; public double cycleSeconds;
            public Vector3 size; public Frame[] frames; public Solid[] casings;
        }
        [Serializable] sealed class Report
        {
            public string layoutSha256, runtimeSourceSha256, unityVersion, environment;
            public Lane[] lanes;
        }
        static string Hash(string path)
        {
            using(var hash=SHA256.Create())
                return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(path))).Replace("-","").ToLowerInvariant();
        }
        public static void Run()
        {
            var arg=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-evidence="));
            if(arg==null)throw new ArgumentException("Explicit output directory required.");
            string output=arg.Substring("--kyoto-evidence=".Length); Directory.CreateDirectory(output);
            var candidate=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-layout-candidate="));
            string layoutPath=candidate==null?"Assets/Kyoto/Resources/StationLayout.json":candidate.Substring("--kyoto-layout-candidate=".Length);
            var layout=JsonUtility.FromJson<StationLayout>(File.ReadAllText(layoutPath));
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("Blender motion oracle"); var rows=new List<Lane>();
            foreach(var spec in layout.escalators)
            {
                var lane=MovingEscalator.Create(root.transform,spec,null,null,true,false);
                double length=0;
                for(int i=1;i<spec.path.Length;i++)length+=Vector3.Distance(spec.path[i-1],spec.path[i]);
                double cycle=length/Math.Abs(spec.speed);
                var frames=new List<Frame>();
                foreach(double time in new[]{0,.125,.5,1,10,cycle-1e-5,cycle,cycle+1e-5,7*cycle+.173,599.9})
                {
                    lane.SetTime(time);
                    var local=new Vector3[spec.stepCount]; var world=new Vector3[spec.stepCount];
                    for(int i=0;i<spec.stepCount;i++)
                    {
                        local[i]=lane.steps[i].localPosition; world[i]=lane.steps[i].position;
                    }
                    frames.Add(new Frame{time=time,local=local,world=world});
                }
                var casings=new List<Solid>();
                for(int i=0;i<3;i++)
                {
                    var mesh=lane.transform.Find(spec.id+" casing "+i).GetComponent<MeshCollider>().sharedMesh;
                    casings.Add(new Solid{name=spec.id+" casing "+i,vertices=mesh.vertices,triangles=mesh.triangles});
                }
                rows.Add(new Lane{id=spec.id,stepCount=spec.stepCount,speed=spec.speed,cycleSeconds=cycle,
                    size=lane.steps[0].localScale,frames=frames.ToArray(),casings=casings.ToArray()});
            }
            var report=new Report{layoutSha256=Hash(layoutPath),
                runtimeSourceSha256=Hash("Assets/Kyoto/Scripts/MovingEscalator.cs"),
                unityVersion=Application.unityVersion,environment="Unity editor; production factory/Pose, no physics simulation or native input claim",
                lanes=rows.ToArray()};
            File.WriteAllText(Path.Combine(output,"unity-motion-oracle.json"),JsonUtility.ToJson(report,true)+"\n");
            UnityEngine.Object.DestroyImmediate(root);
            Debug.Log("KYOTO_MOTION_EXPORT lanes="+rows.Count+" file="+Path.Combine(output,"unity-motion-oracle.json"));
        }
    }
}
