using System;
using System.IO;
using System.Linq;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Reprojects the existing saved architecture through alternate fitted lenses.
    // No geometry or scene asset is changed or saved by this diagnostic.
    public static class WestFacadeCameraPreview
    {
        [Serializable] sealed class CameraPose
        {
            public Vector3 position,lookAt;
            public float fov,roll,principalPointOffsetY;
            public int captureWidth,captureHeight;
        }
        [Serializable] sealed class Point { public float[] worldXYZ,projectedPixel; }
        [Serializable] sealed class Model { public string model;public CameraPose camera;public Point[] points; }
        [Serializable] sealed class Input { public Model[] models; }
        [Serializable] sealed class Probe { public Vector2 pixel;public string surface;public Vector3 point,normal;public float distance; }
        [Serializable] sealed class Result { public string model;public float maximumPixelError;public int points;public Probe[] probes; }
        [Serializable] sealed class Output { public string status;public Result[] results; }
        static Probe TraceVisibleMesh(Camera view,Vector2 pixel,int width,int height)
        {
            // The saved scene contains visuals; runtime builds collision separately.
            // Intersect visible triangles here, rather than reporting empty edit-mode physics.
            var ray=view.ViewportPointToRay(new Vector3(pixel.x/width,1-pixel.y/height,0));
            var result=new Probe{pixel=pixel,surface="no visible mesh hit",distance=500};
            foreach(var filter in UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None))
            {
                var renderer=filter.GetComponent<Renderer>();
                if(!renderer||!renderer.enabled||!renderer.bounds.IntersectRay(ray,out float boundDistance)||boundDistance>result.distance)continue;
                var mesh=filter.sharedMesh;if(!mesh||!mesh.isReadable)continue;
                var inverse=filter.transform.worldToLocalMatrix;
                var origin=inverse.MultiplyPoint3x4(ray.origin);var direction=inverse.MultiplyVector(ray.direction);
                var vertices=mesh.vertices;var triangles=mesh.triangles;
                for(int i=0;i<triangles.Length;i+=3)
                {
                    var a=vertices[triangles[i]];var e1=vertices[triangles[i+1]]-a;var e2=vertices[triangles[i+2]]-a;
                    var h=Vector3.Cross(direction,e2);float determinant=Vector3.Dot(e1,h);
                    if(Mathf.Abs(determinant)<1e-10f)continue;
                    float reciprocal=1/determinant;var s=origin-a;float u=reciprocal*Vector3.Dot(s,h);
                    if(u<0||u>1)continue;var q=Vector3.Cross(s,e1);float v=reciprocal*Vector3.Dot(direction,q);
                    if(v<0||u+v>1)continue;float distance=reciprocal*Vector3.Dot(e2,q);
                    if(distance<0||distance>=result.distance)continue;
                    result.surface=filter.name=="Cube"&&filter.transform.parent?filter.transform.parent.name:filter.name;
                    result.distance=distance;result.point=ray.GetPoint(distance);
                    result.normal=inverse.transpose.MultiplyVector(Vector3.Cross(e1,e2)).normalized;
                }
            }
            return result;
        }
        public static void Run()
        {
            string input=null,output=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-camera-fit="))input=arg.Substring("--kyoto-camera-fit=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            }
            if(input==null||output==null)throw new ArgumentException("Explicit fit input and evidence output required.");
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            var view=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            var original=StationLayout.Load().cameras.Single(c=>c.id=="02-great-stair");
            view.transform.SetPositionAndRotation(original.position,Quaternion.LookRotation(original.lookAt-original.position)*Quaternion.AngleAxis(original.roll,Vector3.forward));
            view.fieldOfView=original.fov;view.aspect=1008f/567;view.ResetProjectionMatrix();
            MunicipalMaterialPreview.Capture(view,1008,567,Path.Combine(output,"current-centered.png"));
            var fits=JsonUtility.FromJson<Input>(File.ReadAllText(input));var results=new System.Collections.Generic.List<Result>();
            foreach(var fit in fits.models)
            {
                var c=fit.camera;view.transform.SetPositionAndRotation(c.position,Quaternion.LookRotation(c.lookAt-c.position)*Quaternion.AngleAxis(c.roll,Vector3.forward));
                view.fieldOfView=c.fov;view.aspect=(float)c.captureWidth/c.captureHeight;view.ResetProjectionMatrix();
                var projection=view.projectionMatrix;projection.m12=2*c.principalPointOffsetY;view.projectionMatrix=projection;
                float maximum=0;
                foreach(var p in fit.points)
                {
                    var q=view.WorldToViewportPoint(new Vector3(p.worldXYZ[0],p.worldXYZ[1],p.worldXYZ[2]));
                    if(q.z<=0)throw new InvalidOperationException("Fitted landmark behind the camera.");
                    maximum=Mathf.Max(maximum,Vector2.Distance(new Vector2(q.x*c.captureWidth,(1-q.y)*c.captureHeight),new Vector2(p.projectedPixel[0],p.projectedPixel[1])));
                }
                if(maximum>.05f)throw new InvalidOperationException("Projection disagrees with independent fit: "+fit.model+" "+maximum+" px");
                MunicipalMaterialPreview.Capture(view,c.captureWidth,c.captureHeight,Path.Combine(output,fit.model+".png"));
                var probes=new System.Collections.Generic.List<Probe>();
                foreach(var pixel in new[]{new Vector2(439,70),new Vector2(436,233),new Vector2(595,380),new Vector2(575,445),new Vector2(173,284),new Vector2(934,236)})
                {
                    probes.Add(TraceVisibleMesh(view,pixel,c.captureWidth,c.captureHeight));
                }
                results.Add(new Result{model=fit.model,maximumPixelError=maximum,points=fit.points.Length,probes=probes.ToArray()});
            }
            File.WriteAllText(Path.Combine(output,"projection-verification.json"),JsonUtility.ToJson(new Output{status="PASS: Unity projection parity; photographic acceptance remains incomplete",results=results.ToArray()},true)+"\n");
            Debug.Log("KYOTO_WEST_CAMERA_PREVIEW_PASS "+output);
        }
    }
}
