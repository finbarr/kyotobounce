using System;
using System.IO;
using System.Linq;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto.Editor
{
    // Temporary scene inspection. It never saves the opened gameplay scene.
    public static class MunicipalMaterialPreview
    {
        public static void Run()
        {
            string resource=null,output=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-municipal-resource="))resource=arg.Substring("--kyoto-municipal-resource=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            }
            if(resource==null||output==null)throw new ArgumentException("Explicit candidate resource and output required.");
            var asset=Resources.Load<MunicipalGeometry>(resource);if(!asset)throw new InvalidOperationException("Missing candidate resource.");
            EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            var parts=asset.parts.ToDictionary(p=>p.id);int replaced=0;
            foreach(var filter in UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None))
            {
                if(!parts.TryGetValue(filter.name,out var part))continue;
                filter.sharedMesh=part.mesh;filter.GetComponent<MeshRenderer>().sharedMaterials=part.materials;replaced++;
            }
            if(replaced!=parts.Count)throw new InvalidOperationException("Candidate does not match saved scene parts: "+replaced+" / "+parts.Count);
            var camera=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            var layout=StationLayout.Load();var cameras=layout.cameras.Concat(layout.inspectionCameras).ToArray();
            Directory.CreateDirectory(output);
            foreach(var name in new[]{"inspect-north-bus-terminal","inspect-north-forecourt","01-entrance"})
            {
                var c=cameras.Single(p=>p.id==name);int width=c.captureWidth>0?c.captureWidth:1440,height=c.captureHeight>0?c.captureHeight:900;
                camera.transform.SetPositionAndRotation(c.position,Quaternion.LookRotation(c.lookAt-c.position)*Quaternion.AngleAxis(c.roll,Vector3.forward));camera.fieldOfView=c.fov;camera.aspect=(float)width/height;
                Capture(camera,width,height,Path.Combine(output,name+".png"));
            }
            File.WriteAllText(Path.Combine(output,"preview.txt"),"PASS temporary editor GPU preview; scene not saved.\nresource="+resource+"\ngeometry_sha256="+asset.geometrySha256+"\nmanifest_sha256="+asset.manifestSha256+"\nparts="+replaced+"\nNot native input, final material acceptance or a performance measurement.\n");
            Debug.Log("KYOTO_MUNICIPAL_MATERIAL_PREVIEW_COMPLETE "+output);
        }
        internal static void Capture(Camera camera,int width,int height,string path)
        {
            var target=new RenderTexture(width,height,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);
            var pixels=new Texture2D(width,height,TextureFormat.RGB24,false,false);var previous=RenderTexture.active;
            try
            {
                target.Create();var request=new RenderPipeline.StandardRequest{destination=target};
                if(!RenderPipeline.SupportsRenderRequest(camera,request))throw new InvalidOperationException("Unsupported render request.");
                for(int i=0;i<3;i++)RenderPipeline.SubmitRenderRequest(camera,request);
                RenderTexture.active=target;pixels.ReadPixels(new Rect(0,0,width,height),0,0);pixels.Apply();File.WriteAllBytes(path,pixels.EncodeToPNG());
            }
            finally{RenderTexture.active=previous;target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(pixels);}
        }
    }
}
