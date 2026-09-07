using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto.Editor
{
    // Replace the station only in memory. Saved lighting, camera and material
    // assets give a comparable preview without installing an unfinished layout.
    public static class StationCandidatePreview
    {
        [Serializable] sealed class ProjectionCheck { public Vector3 world; public Vector2 pixel; }
        [Serializable] sealed class ProjectionResult
        {
            public string camera,stage;public Vector3 world;public Vector2 predicted,actual;
            public float errorPixels,depth;public bool passed;
        }
        [Serializable] sealed class ProjectionReport
        {
            public string candidateSha256,posesSha256,baselineScene,baselineSceneSha256;
            public float tolerancePixels=.05f;
            public ProjectionResult[] checks;
        }
        [Serializable] sealed class Pose
        {
            public string id;public Vector3 position,lookAt;public float fov,roll,principalPointOffsetX,principalPointOffsetY;
            public int captureWidth,captureHeight;public ProjectionCheck[] projectionChecks;
        }
        [Serializable] sealed class Poses
        {
            public Pose[] cameras;
            public string motionCameraId; public int motionFrames,motionFps;
        }
        static string Argument(string name)
        {
            string prefix="--kyoto-"+name+"=";
            var value=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return value==null?throw new ArgumentException("Required: "+prefix):value.Substring(prefix.Length);
        }
        static Material Material(string name)
        {
            var asset=AssetDatabase.LoadAssetAtPath<Material>("Assets/Kyoto/Phase2/Materials/"+name+".mat");
            return asset?asset:throw new InvalidOperationException("Missing saved material: "+name);
        }
        public static void Run()
        {
            string path=Argument("layout-candidate"),output=Argument("evidence"),posePath=Argument("poses");
            var candidate=JsonUtility.FromJson<StationLayout>(File.ReadAllText(path));
            var settings=JsonUtility.FromJson<Poses>(File.ReadAllText(posePath));var poses=settings.cameras;
            if(Directory.Exists(output)&&Directory.EnumerateFileSystemEntries(output).Any())
                throw new InvalidOperationException("Preview evidence directory must be new or empty.");
            Directory.CreateDirectory(output);
            var baselineArg=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-preview-base-scene="));
            string baselineScene=baselineArg==null?Phase2Builder.ScenePath:baselineArg.Substring("--kyoto-preview-base-scene=".Length);
            EditorSceneManager.OpenScene(baselineScene);
            var view=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            var reflection=UnityEngine.Object.FindFirstObjectByType<PlanarFacadeReflection>();
            if(!reflection)throw new InvalidOperationException("Saved north facade reflection is required.");
            float scale=reflection.resolutionScale,blur=reflection.blurMip;
            int maximumWidth=reflection.maximumWidth;
            var template=reflection.materialTemplate;
            var projectionResults=new List<ProjectionResult>();
            void Capture(Pose pose,string stage)
            {
                int width=pose.captureWidth,height=pose.captureHeight;
                view.transform.SetPositionAndRotation(pose.position,Quaternion.LookRotation(pose.lookAt-pose.position)*Quaternion.AngleAxis(pose.roll,Vector3.forward));
                view.fieldOfView=pose.fov;view.aspect=(float)width/height;view.ResetProjectionMatrix();
                var projection=view.projectionMatrix;projection.m02=-2*pose.principalPointOffsetX;projection.m12=2*pose.principalPointOffsetY;view.projectionMatrix=projection;
                if(pose.projectionChecks!=null)foreach(var check in pose.projectionChecks)
                {
                    var q=view.WorldToViewportPoint(check.world);
                    var actual=new Vector2(q.x*width,(1-q.y)*height);
                    float error=Vector2.Distance(actual,check.pixel);
                    projectionResults.Add(new ProjectionResult { camera=pose.id,stage=stage,world=check.world,
                        predicted=check.pixel,actual=actual,errorPixels=error,depth=q.z,passed=q.z>0&&error<=.05f });
                    if(q.z<=0||error>.05f)throw new InvalidOperationException("Camera projection mismatch: "+pose.id+" "+error+" px");
                }
                reflection.RenderForCamera(view,width,height);
                MunicipalMaterialPreview.Capture(view,width,height,Path.Combine(output,pose.id+"-"+stage+".png"));
            }
            foreach(var pose in poses)Capture(pose,"installed");
            var materials=new Dictionary<string,Material>();
            foreach(var pair in new[]{
                ("stone","Stone"),("granite","Granite"),("stair-stone","Stair stone"),("stair-tread","Stair nosing finish"),
                ("facade","Facade"),("steel","Steel"),("silver","Silver cladding"),("dark-metal","Dark facade frame"),
                ("bronze","Bell bronze"),("roof","Canopy steel"),("glass","Glass placeholder"),("window","Reflective facade glazing"),
                ("limestone","Pale cladding"),("rose","Rose facade band"),("rubber","Rubber handrail"),
                ("escalator","Escalator treads"),("escalator-casing","Escalator stainless casing"),
                ("escalator-edge","Escalator yellow edge"),("escalator-silver-edge","Escalator silver edge"),
                ("grass","Garden turf"),("soil","Planting soil"),("leaves","Bamboo foliage"),("bamboo","Bamboo culm"),
                ("wood","Timber bench"),("garden-paving","Garden paving"),("garden-court","Garden court stone"),
                ("garden-yellow","Yellow painted metal"),("garden-blue","Blue painted metal"),("garden-red","Red painted metal"),
                ("tower-white","Tower white painted steel"),("tower-red","Tower vermilion painted steel"),
                ("tower-window","Tower dark glazing"),("asphalt","Forecourt asphalt"),("road-paint","Road crossing paint"),("planting","Planter stone")})
                materials.Add(pair.Item1,Material(pair.Item2));
            var station=GameObject.Find("Station · shared metric layout");
            if(!station||reflection.gameObject!=station)throw new InvalidOperationException("Unexpected saved station hierarchy.");
            UnityEngine.Object.DestroyImmediate(station);
            station=new GameObject("Temporary complete station candidate");
            StationWorld.Create(station.transform,candidate,false,false,materials);
            foreach(var renderer in station.GetComponentsInChildren<MeshRenderer>())
                if(renderer.sharedMaterial==materials["glass"])renderer.shadowCastingMode=ShadowCastingMode.Off;
            var glazing=candidate.boxes.Where(b=>b.id.StartsWith("west-north-panel-")&&b.material=="window").ToArray();
            var ids=new HashSet<string>(glazing.Select(b=>b.id));
            var objects=station.GetComponentsInChildren<Transform>().Where(t=>ids.Contains(t.name)).ToDictionary(t=>t.name,t=>t);
            var renderers=glazing.Select(b=>objects[b.id].GetComponentInChildren<Renderer>()).ToArray();
            PlanarFacadeReflection.FacadePlane(glazing,out var point,out var normal,out float deviation);
            if(deviation>.1f)throw new InvalidOperationException("Candidate north glazing exceeds plane tolerance.");
            reflection=station.AddComponent<PlanarFacadeReflection>();
            reflection.Configure(view,renderers,template,point,normal,deviation);
            reflection.resolutionScale=scale;reflection.maximumWidth=maximumWidth;reflection.blurMip=blur;
            var lightingArg=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-blender-lighting="));
            if(lightingArg!=null)BlenderLightingPreview.Apply(lightingArg.Substring("--kyoto-blender-lighting=".Length),view);
            foreach(var pose in poses)Capture(pose,"candidate");
            if(settings.motionFrames>0)
            {
                if(settings.motionFrames>240||settings.motionFps<1||settings.motionFps>60)
                    throw new ArgumentException("Motion preview requires 1–240 frames and 1–60 fps.");
                var motionPose=Array.Find(poses,p=>p.id==settings.motionCameraId);
                if(motionPose==null)throw new ArgumentException("Motion preview camera is absent from the pose file.");
                for(int frame=0;frame<settings.motionFrames;frame++)
                {
                    StationMotion.SetTime(station.scene,frame/(double)settings.motionFps);
                    Capture(motionPose,"motion-"+frame.ToString("D4"));
                }
            }
            using(var hash=SHA256.Create())
            {
                string Digest(string file)=>BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(file))).Replace("-","").ToLowerInvariant();
                string candidateHash=Digest(path);
                File.WriteAllText(Path.Combine(output,"projection-checks.json"),JsonUtility.ToJson(new ProjectionReport {
                    candidateSha256=candidateHash,posesSha256=Digest(posePath),baselineScene=baselineScene,
                    baselineSceneSha256=Digest(baselineScene),checks=projectionResults.ToArray()
                },true)+"\n");
                File.WriteAllText(Path.Combine(output,"preview.txt"),"Temporary complete-layout editor GPU preview; scene and assets not saved.\ncandidate_sha256="+
                    candidateHash+
                    "\nlanes="+candidate.escalators.Length+"\nmotion_frames="+settings.motionFrames+"\nmotion_fps="+settings.motionFps+
                    "\nNot photo registration, normal input, native release or performance acceptance.\n");
            }
            Debug.Log("KYOTO_STATION_CANDIDATE_PREVIEW_COMPLETE "+output);
        }
    }
}
