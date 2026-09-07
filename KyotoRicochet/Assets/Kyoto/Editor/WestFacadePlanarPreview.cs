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
    // One temporary planar reflection, using the measured near-north facade
    // direction. Optical/material constants remain study values; never saves assets.
    public static class WestFacadePlanarPreview
    {
        [Serializable] sealed class Pose {public Vector3 position,lookAt;public float fov,roll,principalPointOffsetY;public int captureWidth,captureHeight;}
        [Serializable] sealed class Model {public string model;public Pose camera;}
        [Serializable] sealed class Fit {public Model[] models;}
        [Serializable] sealed class Marker {public string color;public Vector3 sourcePosition;public Vector2 expectedPixel;}
        [Serializable] sealed class Markers {public Marker[] markers;public string purpose;}
        [Serializable] sealed class Report
        {
            public string status;public int changedPanels,reflectingPanels;public Vector3 planePoint,planeNormal;
            public float maximumPlaneProjectionErrorPixels,maximumMirrorDistanceErrorM;
            public string[] limitations;
        }
        public static void Run()
        {
            string fit=null,candidate=null,output=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-camera-fit="))fit=arg.Substring("--kyoto-camera-fit=".Length);
                if(arg.StartsWith("--kyoto-layout-candidate="))candidate=arg.Substring("--kyoto-layout-candidate=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            }
            if(fit==null||candidate==null||output==null)throw new ArgumentException("Explicit fit, candidate and output required.");
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            var pose=JsonUtility.FromJson<Fit>(File.ReadAllText(fit)).models.Single(m=>m.model=="shifted").camera;
            var view=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            view.transform.SetPositionAndRotation(pose.position,Quaternion.LookRotation(pose.lookAt-pose.position)*Quaternion.AngleAxis(pose.roll,Vector3.forward));
            view.fieldOfView=pose.fov;view.aspect=(float)pose.captureWidth/pose.captureHeight;view.ResetProjectionMatrix();
            var projection=view.projectionMatrix;projection.m12=2*pose.principalPointOffsetY;view.projectionMatrix=projection;
            var old=StationLayout.Load().boxes.ToDictionary(b=>b.id);var next=JsonUtility.FromJson<StationLayout>(File.ReadAllText(candidate));
            var objects=UnityEngine.Object.FindObjectsByType<Transform>(FindObjectsSortMode.None).Where(t=>old.ContainsKey(t.name)).ToDictionary(t=>t.name);
            var shader=Shader.Find("Kyoto/Facade Reflection Study");if(!shader||!shader.isSupported)throw new InvalidOperationException("Reflection study shader unavailable.");
            var material=new Material(shader);var glass=AssetDatabase.LoadAssetAtPath<Material>("Assets/Kyoto/Phase2/Materials/Reflective facade glazing.mat");
            var mirrors=new List<Renderer>();int changed=0;
            foreach(var b in next.boxes)
            {
                var previous=old[b.id];
                if(previous.material!=b.material)
                {
                    if(!b.id.StartsWith("west-north-panel-")||previous.material!="rose"||b.material!="window")throw new InvalidOperationException("Unreviewed candidate change: "+b.id);
                    var t=objects[b.id];t.localPosition=b.center;t.localRotation=Quaternion.Euler(0,b.yaw,0);
                    var mesh=t.GetComponentInChildren<MeshFilter>();mesh.transform.localScale=b.size;mesh.GetComponent<Renderer>().sharedMaterial=glass;changed++;
                }
                if(b.id.StartsWith("west-north-panel-")&&b.material=="window")mirrors.Add(objects[b.id].GetComponentInChildren<Renderer>());
            }
            if(changed!=204||mirrors.Count==0)throw new InvalidOperationException("Unexpected candidate glazing count.");
            MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,Path.Combine(output,"glazing-no-planar-reflection.png"));
            var point=new Vector3(-77.344295f,0,9.428287f);var far=new Vector3(-107.637491f,0,2.032407f);
            var tangent=(far-point).normalized;var normal=Vector3.Cross(tangent,Vector3.up).normalized;
            if(Vector3.Dot(view.transform.position-point,normal)<0)normal=-normal;
            point+=normal*.004f;float d=-Vector3.Dot(normal,point);
            var reflection=Matrix4x4.identity;
            for(int i=0;i<3;i++){for(int j=0;j<3;j++)reflection[i,j]-=2*normal[i]*normal[j];reflection[i,3]=-2*d*normal[i];}
            var mirrorCamera=new GameObject("Temporary reflected courtyard camera").AddComponent<Camera>();mirrorCamera.CopyFrom(view);mirrorCamera.enabled=false;
            mirrorCamera.transform.position=reflection.MultiplyPoint3x4(view.transform.position);
            mirrorCamera.transform.rotation=Quaternion.LookRotation(reflection.MultiplyVector(view.transform.forward),reflection.MultiplyVector(view.transform.up));
            mirrorCamera.worldToCameraMatrix=view.worldToCameraMatrix*reflection;mirrorCamera.projectionMatrix=projection;
            float maxPixel=0,maxDistance=0;
            for(int i=0;i<12;i++)
            {
                var p=point+tangent*(3+i*5)+Vector3.up*(23+i*2);
                var a=view.WorldToViewportPoint(p);var b=mirrorCamera.WorldToViewportPoint(p);
                maxPixel=Mathf.Max(maxPixel,Vector2.Distance(new Vector2(a.x*pose.captureWidth,a.y*pose.captureHeight),new Vector2(b.x*pose.captureWidth,b.y*pose.captureHeight)));
                var q=p+normal*4.3f;maxDistance=Mathf.Max(maxDistance,Mathf.Abs(Vector3.Dot(normal,reflection.MultiplyPoint3x4(q)-point)+Vector3.Dot(normal,q-point)));
            }
            if(maxPixel>.05f||maxDistance>.0001f)throw new InvalidOperationException("Reflection geometry failed: "+maxPixel+" px; "+maxDistance+" m");
            var clipPoint=mirrorCamera.worldToCameraMatrix.MultiplyPoint(point+normal*.01f);
            var clipNormal=mirrorCamera.worldToCameraMatrix.MultiplyVector(normal).normalized;
            mirrorCamera.projectionMatrix=mirrorCamera.CalculateObliqueMatrix(new Vector4(clipNormal.x,clipNormal.y,clipNormal.z,-Vector3.Dot(clipPoint,clipNormal)));
            var target=new RenderTexture(pose.captureWidth,pose.captureHeight,24,RenderTextureFormat.ARGBHalf);target.Create();
            bool invert=GL.invertCulling;
            try
            {
                foreach(var renderer in mirrors)renderer.enabled=false;
                GL.invertCulling=!invert;
                var request=new RenderPipeline.StandardRequest{destination=target};
                if(!RenderPipeline.SupportsRenderRequest(mirrorCamera,request))throw new InvalidOperationException("Reflected render request unavailable.");
                RenderPipeline.SubmitRenderRequest(mirrorCamera,request);
            }
            finally{GL.invertCulling=invert;foreach(var renderer in mirrors)renderer.enabled=true;}
            var previousTarget=RenderTexture.active;RenderTexture.active=target;
            var pixels=new Texture2D(pose.captureWidth,pose.captureHeight,TextureFormat.RGB24,false,true);pixels.ReadPixels(new Rect(0,0,pose.captureWidth,pose.captureHeight),0,0);pixels.Apply();
            File.WriteAllBytes(Path.Combine(output,"reflected-camera.png"),pixels.EncodeToPNG());RenderTexture.active=previousTarget;
            material.SetTexture("_Reflection",target);foreach(var renderer in mirrors)renderer.sharedMaterial=material;
            MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,Path.Combine(output,"glazing-planar-reflection.png"));
            // Visible markers independently check texture orientation and rendered
            // correspondence. They exist only in this diagnostic scene after the
            // clean candidate capture and never enter the generated architecture.
            var markerData=new List<Marker>();var markerPixels=new[]{new Vector2(965,135),new Vector2(934,210),new Vector2(820,190)};
            var colors=new[]{Color.red,Color.green,Color.blue};var colorNames=new[]{"red","green","blue"};
            for(int i=0;i<3;i++)
            {
                var pixel=markerPixels[i];var ray=view.ViewportPointToRay(new Vector3(pixel.x/pose.captureWidth,1-pixel.y/pose.captureHeight,0));
                if(!new Plane(normal,point).Raycast(ray,out float distance))throw new InvalidOperationException("Marker ray misses mirror plane.");
                var position=ray.GetPoint(distance)+Vector3.Reflect(ray.direction,normal)*4;
                var sphere=GameObject.CreatePrimitive(PrimitiveType.Sphere);sphere.name="Temporary reflected marker "+colorNames[i];
                UnityEngine.Object.DestroyImmediate(sphere.GetComponent<Collider>());sphere.transform.position=position;sphere.transform.localScale=Vector3.one*.44f;
                var ink=new Material(Shader.Find("Universal Render Pipeline/Unlit"));ink.SetColor("_BaseColor",colors[i]);sphere.GetComponent<Renderer>().sharedMaterial=ink;
                var projected=view.WorldToViewportPoint(reflection.MultiplyPoint3x4(position));
                markerData.Add(new Marker{color=colorNames[i],sourcePosition=position,expectedPixel=new Vector2(projected.x*pose.captureWidth,(1-projected.y)*pose.captureHeight)});
            }
            try
            {
                foreach(var renderer in mirrors)renderer.enabled=false;GL.invertCulling=!invert;
                RenderPipeline.SubmitRenderRequest(mirrorCamera,new RenderPipeline.StandardRequest{destination=target});
            }
            finally{GL.invertCulling=invert;foreach(var renderer in mirrors)renderer.enabled=true;}
            MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,Path.Combine(output,"mirror-marker-validation.png"));
            File.WriteAllText(Path.Combine(output,"marker-predictions.json"),JsonUtility.ToJson(new Markers{
                markers=markerData.ToArray(),purpose="Compare visible colored reflection centroids with expected pixels; projection-only checks do not verify texture orientation."},true)+"\n");
            File.WriteAllText(Path.Combine(output,"preview.json"),JsonUtility.ToJson(new Report{
                status="Projection checks pass; temporary render requires visual acceptance",changedPanels=changed,reflectingPanels=mirrors.Count,
                planePoint=point,planeNormal=normal,maximumPlaneProjectionErrorPixels=maxPixel,maximumMirrorDistanceErrorM=maxDistance,
                limitations=new[]{"One plane approximates the near-north facade; small plan bends and upper continuation remain inferred.","Coating reflectance 0.55 and tint are unmeasured study values; no roughness blur or transmission.","Saved gameplay scene, material assets, collision and native app are unchanged.","Reflection is captured for this view only; runtime camera motion, stereo and performance are not implemented or verified."}},true)+"\n");
            Debug.Log("KYOTO_WEST_PLANAR_PREVIEW_COMPLETE "+output);
        }
    }
}
