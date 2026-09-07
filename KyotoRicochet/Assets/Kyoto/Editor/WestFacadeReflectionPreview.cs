using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto.Editor
{
    // Isolated rendering study: applies candidate north-panel dimensions/materials
    // to the opened scene in memory. Never saves scene, materials, or geometry.
    public static class WestFacadeReflectionPreview
    {
        [Serializable] sealed class Pose {public Vector3 position,lookAt;public float fov,roll,principalPointOffsetY;public int captureWidth,captureHeight;}
        [Serializable] sealed class Model {public string model;public Pose camera;}
        [Serializable] sealed class Fit {public Model[] models;}
        [Serializable] sealed class Report {public string status;public int changedPanels,probeCount;public double elapsedSeconds;public string[] probeDescriptions,limitations;}
        static Camera view;static Pose pose;static string output;static double started;static int changed;
        static int finishFrames;
        static readonly List<ReflectionProbe> probes=new();
        static RenderTexture RenderEnvironment(Vector3 position)
        {
            var cube=new RenderTexture(256,256,24,RenderTextureFormat.ARGBHalf){dimension=TextureDimension.Cube,useMipMap=true,autoGenerateMips=false};cube.Create();
            var target=new RenderTexture(256,256,24,RenderTextureFormat.ARGBHalf);target.Create();
            var camera=new GameObject("Temporary environment capture").AddComponent<Camera>();
            camera.enabled=false;camera.transform.position=position;camera.fieldOfView=90;camera.aspect=1;
            camera.nearClipPlane=.1f;camera.farClipPlane=350;camera.clearFlags=CameraClearFlags.Skybox;camera.allowHDR=true;
            var directions=new[]{Vector3.right,Vector3.left,Vector3.up,Vector3.down,Vector3.forward,Vector3.back};
            var ups=new[]{Vector3.up,Vector3.up,Vector3.back,Vector3.forward,Vector3.up,Vector3.up};
            for(int i=0;i<6;i++)
            {
                camera.transform.rotation=Quaternion.LookRotation(directions[i],ups[i]);
                // URP's direct cube request constructs an intermediate descriptor
                // without depth. Use an explicit depth-backed 2D face, then copy.
                var request=new RenderPipeline.StandardRequest{destination=target};
                if(!RenderPipeline.SupportsRenderRequest(camera,request))throw new InvalidOperationException("Cube-face render request unavailable.");
                RenderPipeline.SubmitRenderRequest(camera,request);
                Graphics.CopyTexture(target,0,0,cube,i,0);
                var previous=RenderTexture.active;RenderTexture.active=target;
                var pixels=new Texture2D(256,256,TextureFormat.RGB24,false,true);pixels.ReadPixels(new Rect(0,0,256,256),0,0);pixels.Apply();
                File.WriteAllBytes(Path.Combine(output,"probe-"+probes.Count+"-face-"+i+".png"),pixels.EncodeToPNG());
                RenderTexture.active=previous;UnityEngine.Object.DestroyImmediate(pixels);
            }
            cube.GenerateMips();target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(camera.gameObject);return cube;
        }
        static void SetView()
        {
            view.transform.SetPositionAndRotation(pose.position,Quaternion.LookRotation(pose.lookAt-pose.position)*Quaternion.AngleAxis(pose.roll,Vector3.forward));
            view.fieldOfView=pose.fov;view.aspect=(float)pose.captureWidth/pose.captureHeight;view.ResetProjectionMatrix();
            var projection=view.projectionMatrix;projection.m12=2*pose.principalPointOffsetY;view.projectionMatrix=projection;
        }
        public static void Run()
        {
            string fit=null,candidate=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-camera-fit="))fit=arg.Substring("--kyoto-camera-fit=".Length);
                if(arg.StartsWith("--kyoto-layout-candidate="))candidate=arg.Substring("--kyoto-layout-candidate=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            }
            if(fit==null||candidate==null||output==null)throw new ArgumentException("Explicit fit, candidate and output required.");
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            pose=JsonUtility.FromJson<Fit>(File.ReadAllText(fit)).models.Single(m=>m.model=="shifted").camera;
            view=UnityEngine.Object.FindFirstObjectByType<GameController>().view;SetView();
            MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,Path.Combine(output,"baseline.png"));
            var old=StationLayout.Load().boxes.ToDictionary(b=>b.id);
            var next=JsonUtility.FromJson<StationLayout>(File.ReadAllText(candidate));
            var objects=UnityEngine.Object.FindObjectsByType<Transform>(FindObjectsSortMode.None)
                .Where(t=>old.ContainsKey(t.name)).ToDictionary(t=>t.name);
            var glass=AssetDatabase.LoadAssetAtPath<Material>("Assets/Kyoto/Phase2/Materials/Reflective facade glazing.mat");
            foreach(var b in next.boxes)
            {
                var previous=old[b.id];if(previous.material==b.material)continue;
                if(!b.id.StartsWith("west-north-panel-")||previous.material!="rose"||b.material!="window")
                    throw new InvalidOperationException("Unreviewed candidate change: "+b.id);
                var t=objects[b.id];var mesh=t.GetComponentInChildren<MeshFilter>();
                t.localPosition=b.center;t.localRotation=Quaternion.Euler(0,b.yaw,0);mesh.transform.localScale=b.size;
                mesh.GetComponent<Renderer>().sharedMaterial=glass;changed++;
            }
            if(changed==0)throw new InvalidOperationException("Candidate has no north glazing correction.");
            MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,Path.Combine(output,"glazing-no-local-reflections.png"));
            // Approximate the courtyard environment, with overlapping volumes.
            // This tests ordinary probes; their parallax is not a planar mirror.
            started=EditorApplication.timeSinceStartup;
            foreach(var position in new[]{new Vector3(-84,26,4),new Vector3(-110,36,-2.5f),new Vector3(-141,48,-10)})
            {
                var p=new GameObject("Temporary west reflection "+probes.Count).AddComponent<ReflectionProbe>();
                p.transform.position=position;p.mode=ReflectionProbeMode.Custom;p.resolution=256;p.hdr=true;
                p.size=new Vector3(42,38,48);p.center=new Vector3(-5,7,-5);p.blendDistance=5;p.boxProjection=true;
                p.nearClipPlane=.1f;p.farClipPlane=350;p.clearFlags=ReflectionProbeClearFlags.Skybox;
                p.customBakedTexture=RenderEnvironment(position);probes.Add(p);
            }
            EditorApplication.update+=Finish;EditorApplication.QueuePlayerLoopUpdate();
        }
        static void Finish()
        {
            if(++finishFrames<5){EditorApplication.QueuePlayerLoopUpdate();return;}
            EditorApplication.update-=Finish;
            try
            {
                SetView();
                MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,Path.Combine(output,"glazing-local-reflections.png"));
                bool changedImage=!File.ReadAllBytes(Path.Combine(output,"glazing-no-local-reflections.png")).SequenceEqual(File.ReadAllBytes(Path.Combine(output,"glazing-local-reflections.png")));
                File.WriteAllText(Path.Combine(output,"preview.json"),JsonUtility.ToJson(new Report{
                    status=changedImage?"PASS reflection changes pixels; visual quality and photographic acceptance require inspection":"FAIL reflection-on and reflection-off images are identical",changedPanels=changed,probeCount=probes.Count,
                    elapsedSeconds=EditorApplication.timeSinceStartup-started,
                    probeDescriptions=probes.Select(p=>p.name+" texture="+(p.texture?p.texture.GetType().Name:"null")+" bounds="+p.bounds).ToArray(),
                    limitations=new[]{"Custom cube faces and ordinary mips are a rendering study, not a final roughness convolution.","Probe reflections approximate a volume and do not guarantee mirror parallax.","The camera is a lower-stair diagnostic; upper facade geometry remains inferred.","No scene or asset is saved; no native input or performance acceptance."}},true)+"\n");
                if(!changedImage)throw new InvalidOperationException("Local reflections did not affect the image.");
                Debug.Log("KYOTO_WEST_REFLECTION_PREVIEW_PASS "+output);EditorApplication.Exit(0);
            }
            catch(Exception e){Debug.LogException(e);EditorApplication.Exit(1);}
        }
    }
}
