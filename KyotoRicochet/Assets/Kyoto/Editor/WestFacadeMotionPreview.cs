using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto.Editor
{
    // Exercises the production reflection component in a temporary scene. GPU
    // readback timings include synchronization; they are not native frame rates.
    public static class WestFacadeMotionPreview
    {
        [Serializable] sealed class Pose {public Vector3 position,lookAt;public float fov,roll,principalPointOffsetY;public int captureWidth,captureHeight;}
        [Serializable] sealed class Model {public string model;public Pose camera;}
        [Serializable] sealed class Fit {public Model[] models;}
        [Serializable] sealed class Marker {public string color;public Vector3 sourcePosition;public Vector2 expectedPixel;}
        [Serializable] sealed class Markers {public Marker[] markers;public string purpose;}
        [Serializable] sealed class Frame {public string id;public Vector3 position;public Quaternion rotation;public float fov;public double stationTime;public int width,height;public Vector2Int reflectionSize;public double submissionMs;public bool rendered;}
        [Serializable] sealed class Timing {public int width,height;public bool reflection;public double medianMs,p95Ms;public double[] samplesMs;}
        [Serializable] sealed class Report {public string status;public float planeDeviationM;public int reflectingPanels,renderCount,skipCount;public Frame[] frames;public Timing[] timings;public string[] limits;}
        static Camera view;static PlanarFacadeReflection reflector;static MovingEscalator[] lanes;static GameObject[] markers;
        static Material[] inks;static Pose pose;static Quaternion baseRotation;static string output;
        static void SetPose(Vector3 position,Quaternion rotation,int width,int height,float fov,float shift=0)
        {
            view.transform.SetPositionAndRotation(position,rotation);view.fieldOfView=fov;view.aspect=(float)width/height;view.ResetProjectionMatrix();
            var projection=view.projectionMatrix;projection.m12=2*shift;view.projectionMatrix=projection;
        }
        static void SetTime(double time){foreach(var lane in lanes)lane.SetTime(time);}
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
            view=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            baseRotation=Quaternion.LookRotation(pose.lookAt-pose.position)*Quaternion.AngleAxis(pose.roll,Vector3.forward);
            var old=StationLayout.Load().boxes.ToDictionary(b=>b.id);var next=JsonUtility.FromJson<StationLayout>(File.ReadAllText(candidate));
            var objects=UnityEngine.Object.FindObjectsByType<Transform>(FindObjectsSortMode.None).Where(t=>old.ContainsKey(t.name)).ToDictionary(t=>t.name);
            int changed=0;
            foreach(var b in next.boxes)
            {
                if(old[b.id].material==b.material)continue;
                if(!b.id.StartsWith("west-north-panel-")||old[b.id].material!="rose"||b.material!="window")throw new InvalidOperationException("Unreviewed candidate change: "+b.id);
                var t=objects[b.id];t.localPosition=b.center;t.localRotation=Quaternion.Euler(0,b.yaw,0);t.GetComponentInChildren<MeshFilter>().transform.localScale=b.size;changed++;
            }
            if(changed!=204)throw new InvalidOperationException("Unexpected candidate pane count.");
            var boxes=next.boxes.Where(b=>b.id.StartsWith("west-north-panel-")&&b.material=="window").ToArray();
            var renderers=boxes.Select(b=>objects[b.id].GetComponentInChildren<Renderer>()).ToArray();
            PlanarFacadeReflection.FacadePlane(boxes,out var point,out var normal,out float deviation);
            if(deviation>.1f)throw new InvalidOperationException("One reflection plane diverges excessively from actual pane faces: "+deviation);
            var shader=Shader.Find("Kyoto/Planar Facade Glass");if(!shader||!shader.isSupported)throw new InvalidOperationException("Runtime reflection shader unavailable.");
            var material=new Material(shader);reflector=new GameObject("Production reflection component under test").AddComponent<PlanarFacadeReflection>();
            reflector.Configure(view,renderers,material,point,normal,deviation);
            lanes=UnityEngine.Object.FindObjectsByType<MovingEscalator>(FindObjectsSortMode.None);SetTime(0);
            SetPose(pose.position,baseRotation,1008,567,pose.fov,pose.principalPointOffsetY);
            markers=new GameObject[3];inks=new Material[3];var colors=new[]{Color.red,Color.green,Color.blue};
            var pixels=new[]{new Vector2(870,205),new Vector2(840,160),new Vector2(760,215)};
            for(int i=0;i<3;i++)
            {
                var ray=view.ViewportPointToRay(new Vector3(pixels[i].x/1008,1-pixels[i].y/567,0));
                if(!new Plane(normal,point).Raycast(ray,out float distance))throw new InvalidOperationException("Marker ray misses plane.");
                markers[i]=GameObject.CreatePrimitive(PrimitiveType.Sphere);UnityEngine.Object.DestroyImmediate(markers[i].GetComponent<Collider>());
                markers[i].name="Temporary motion marker "+i;markers[i].transform.position=ray.GetPoint(distance)+Vector3.Reflect(ray.direction,normal)*4;markers[i].transform.localScale=Vector3.one*.44f;
                inks[i]=new Material(Shader.Find("Universal Render Pipeline/Unlit"));inks[i].SetColor("_BaseColor",colors[i]);markers[i].GetComponent<Renderer>().sharedMaterial=inks[i];markers[i].SetActive(false);
            }
            var frames=new List<Frame>();
            foreach(var spec in new[]{("lower",Vector3.zero,Vector3.zero,1008,567,0.0),("translate",new Vector3(.7f,.15f,.2f),new Vector3(.5f,2,0),1008,567,.35),
                ("roll-left",new Vector3(-.4f,.2f,0),new Vector3(0,-1,-25),1008,567,.7),("roll-right",new Vector3(.2f,.3f,0),new Vector3(0,1,25),1008,567,1.05),
                ("resize",Vector3.zero,Vector3.zero,1200,900,1.4)})
            {
                SetPose(pose.position+spec.Item2,baseRotation*Quaternion.Euler(spec.Item3),spec.Item4,spec.Item5,pose.fov,pose.principalPointOffsetY);SetTime(spec.Item6);
                frames.Add(CaptureMarkers(spec.Item1,spec.Item4,spec.Item5,spec.Item6));
            }
            foreach(string id in new[]{"05-west-terrace","inspect-side-stair-upper","inspect-upper-crossing"})
            {
                var c=next.cameras.Concat(next.inspectionCameras).Single(c=>c.id==id);SetPose(c.position,Quaternion.LookRotation(c.lookAt-c.position),1200,750,c.fov);
                SetTime(1.75);frames.Add(CaptureClean(id,1200,750,1.75));
            }
            // Fixed view, two phases: compare reflected moving steps as well as
            // camera motion. A renderer may not freeze the station clock.
            SetPose(pose.position,baseRotation,1008,567,pose.fov,pose.principalPointOffsetY);
            SetTime(0);frames.Add(CaptureClean("phase-0",1008,567,0));SetTime(.35);frames.Add(CaptureClean("phase-035",1008,567,.35));
            int before=reflector.RenderCount;
            SetPose(point-normal*1+Vector3.up*30,Quaternion.LookRotation(normal),1008,567,65);
            if(reflector.RenderForCamera(view,1008,567)||reflector.ReflectionValid||reflector.RenderCount!=before)throw new InvalidOperationException("Back-side render was not skipped.");
            SetPose(pose.position,baseRotation*Quaternion.Euler(0,180,0),1008,567,65);
            if(reflector.RenderForCamera(view,1008,567)||reflector.ReflectionValid||reflector.RenderCount!=before)throw new InvalidOperationException("Offscreen facade was not skipped.");
            var timings=new List<Timing>();
            foreach(var size in new[]{new Vector2Int(1440,900),new Vector2Int(1920,1080)})
            foreach(bool enabled in new[]{false,true})
            {
                SetPose(pose.position,baseRotation,size.x,size.y,pose.fov);SetTime(0);reflector.enabled=enabled;
                timings.Add(Measure(size.x,size.y,enabled));
            }
            reflector.enabled=true;
            File.WriteAllText(Path.Combine(output,"preview.json"),JsonUtility.ToJson(new Report{
                status="Runtime component rendering checks pass; inspect images and marker centroids separately",planeDeviationM=deviation,reflectingPanels=renderers.Length,
                renderCount=reflector.RenderCount,skipCount=reflector.SkipCount,frames=frames.ToArray(),timings=timings.ToArray(),
                limits=new[]{"Temporary editor scene: explicit production component calls, not LateUpdate or native input evidence.","Timings include main render and GPU readback; no game simulation, ten-minute session, or native frame-rate acceptance.","Glazing construction, reflectance and blur remain inferred.","No gameplay asset or scene is saved."}},true)+"\n");
            UnityEngine.Debug.Log("KYOTO_WEST_MOTION_PREVIEW_PASS "+output);
        }
        static Frame CaptureClean(string id,int width,int height,double time)
        {
            var position=view.transform.position;var rotation=view.transform.rotation;var projection=view.projectionMatrix;
            var step=lanes[0].steps[0].position;double clock=StationMotion.Time(view.gameObject.scene);bool culling=GL.invertCulling;
            bool rendered=reflector.RenderForCamera(view,width,height);
            if(view.transform.position!=position||view.transform.rotation!=rotation||view.projectionMatrix!=projection||lanes[0].steps[0].position!=step||StationMotion.Time(view.gameObject.scene)!=clock||GL.invertCulling!=culling)
                throw new InvalidOperationException("Reflection changed source camera, culling or station state.");
            MunicipalMaterialPreview.Capture(view,width,height,Path.Combine(output,id+".png"));
            return new Frame{id=id,position=position,rotation=rotation,fov=view.fieldOfView,stationTime=time,width=width,height=height,reflectionSize=reflector.TextureSize,submissionMs=reflector.LastSubmissionMilliseconds,rendered=rendered};
        }
        static Frame CaptureMarkers(string id,int width,int height,double time)
        {
            string folder=Path.Combine(output,id);Directory.CreateDirectory(folder);
            var frame=CaptureClean(id,width,height,time);File.Copy(Path.Combine(output,id+".png"),Path.Combine(folder,"glazing-planar-reflection.png"));
            string raw=Path.Combine(folder,"reflection-target");Directory.CreateDirectory(raw);
            CaptureTarget(Path.Combine(raw,"glazing-planar-reflection.png"));
            foreach(var marker in markers)marker.SetActive(true);reflector.RenderForCamera(view,width,height);
            CaptureTarget(Path.Combine(raw,"mirror-marker-validation.png"));
            MunicipalMaterialPreview.Capture(view,width,height,Path.Combine(folder,"mirror-marker-validation.png"));
            var reflection=PlanarFacadeReflection.ReflectionMatrix(reflector.planePoint,reflector.planeNormal);var rows=new List<Marker>();
            for(int i=0;i<3;i++)
            {
                var q=view.WorldToViewportPoint(reflection.MultiplyPoint3x4(markers[i].transform.position));
                rows.Add(new Marker{color=new[]{"red","green","blue"}[i],sourcePosition=markers[i].transform.position,expectedPixel=new Vector2(q.x*width,(1-q.y)*height)});
            }
            File.WriteAllText(Path.Combine(folder,"marker-predictions.json"),JsonUtility.ToJson(new Markers{markers=rows.ToArray(),purpose="Fixed world markers across camera translation, roll and resize; production reflection component."},true)+"\n");
            var rawRows=rows.Select(row=>new Marker{color=row.color,sourcePosition=row.sourcePosition,
                expectedPixel=new Vector2(row.expectedPixel.x*reflector.TextureSize.x/width,row.expectedPixel.y*reflector.TextureSize.y/height)}).ToArray();
            File.WriteAllText(Path.Combine(raw,"marker-predictions.json"),JsonUtility.ToJson(new Markers{markers=rawRows,
                purpose="Same fixed world markers in the reflected render target, before foreground mullion occlusion and glass compositing."},true)+"\n");
            foreach(var marker in markers)marker.SetActive(false);return frame;
        }
        static void CaptureTarget(string path)
        {
            var target=reflector.ReflectionTexture;var previous=RenderTexture.active;
            var pixels=new Texture2D(target.width,target.height,TextureFormat.RGB24,false,true);
            try{RenderTexture.active=target;pixels.ReadPixels(new Rect(0,0,target.width,target.height),0,0);pixels.Apply();File.WriteAllBytes(path,pixels.EncodeToPNG());}
            finally{RenderTexture.active=previous;UnityEngine.Object.DestroyImmediate(pixels);}
        }
        static Timing Measure(int width,int height,bool enabled)
        {
            var target=new RenderTexture(width,height,24,RenderTextureFormat.ARGB32);target.Create();
            var readback=new Texture2D(1,1,TextureFormat.RGB24,false);var previous=RenderTexture.active;var samples=new List<double>();
            try
            {
                for(int i=0;i<45;i++)
                {
                    long start=Stopwatch.GetTimestamp();if(enabled)reflector.RenderForCamera(view,width,height);
                    RenderPipeline.SubmitRenderRequest(view,new RenderPipeline.StandardRequest{destination=target});
                    RenderTexture.active=target;readback.ReadPixels(new Rect(width/2,height/2,1,1),0,0);readback.Apply();
                    double ms=(Stopwatch.GetTimestamp()-start)*1000.0/Stopwatch.Frequency;if(i>=10)samples.Add(ms);
                }
            }
            finally{RenderTexture.active=previous;target.Release();UnityEngine.Object.DestroyImmediate(target);UnityEngine.Object.DestroyImmediate(readback);}
            var sorted=samples.OrderBy(v=>v).ToArray();return new Timing{width=width,height=height,reflection=enabled,medianMs=sorted[sorted.Length/2],p95Ms=sorted[(int)Math.Ceiling(sorted.Length*.95)-1],samplesMs=samples.ToArray()};
        }
    }
}
