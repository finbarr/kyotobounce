using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Unity.Profiling;
using Unity.Profiling.LowLevel.Unsafe;

namespace Kyoto
{
    // Opt-in native rendering fixture. The production reflection LateUpdate runs
    // first; the main view uses an explicit request because batch cameras may not
    // render automatically. Synchronized readback prevents empty frame timings.
    [DefaultExecutionOrder(11000)]
    public sealed class RuntimeFacadeVerification:MonoBehaviour
    {
        [Serializable] sealed class Timing
        {
            public int width,height,samples;public bool reflection;public double medianMs,p95Ms;
            public double[] frameIntervalsMs;
        }
        [Serializable] sealed class Report
        {
            public string status,layoutSha256,graphicsDevice;public int poseChecks,renderCount,skipCount;
            public float maximumMatrixError;public Timing[] timings;public string[] limits;
        }
        [Serializable] sealed class CounterSeries {public string name,unit;public bool valid;public long[] values;}
        [Serializable] sealed class ProfileCondition
        {
            public string view,condition;public float reflectionScale;public bool reflection,mainShadows,reflectionShadows;
            public double medianMs,p95Ms;public double[] intervalsMs,mainSubmissionMs,readbackMs,reflectionSubmissionMs,stationUpdateMs;
            public CounterSeries[] counters;
        }
        [Serializable] sealed class ProfileReport {public string layoutSha256,status;public int meshRenderers,staticBatchedRenderers;public ProfileCondition[] conditions;public string[] limits;}
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Install()
        {
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-facade-reflections"||a=="--kyoto-facade-profile"||a=="--kyoto-facade-transitions"))
                new GameObject("Native facade rendering verification").AddComponent<RuntimeFacadeVerification>();
        }
        string output;GameController game;Camera view;PlanarFacadeReflection reflection;RenderTexture target;Texture2D syncPixel;
        Vector3 origin;Quaternion rotation;int poseChecks;float maximumMatrixError;readonly List<Timing> timings=new();
        double mainSubmissionMs,readbackMs;
        IEnumerator Start()
        {
            output=Path.Combine(Application.persistentDataPath,"facade-reflection-evidence");
            foreach(string arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            Directory.CreateDirectory(output);var run=Run();
            while(true)
            {
                object next;
                try{if(!run.MoveNext())break;next=run.Current;}
                catch(Exception e){File.WriteAllText(Path.Combine(output,"failure.txt"),e.ToString());UnityEngine.Debug.LogException(e);Application.Quit(1);yield break;}
                yield return next;
            }
            UnityEngine.Debug.Log("KYOTO_NATIVE_FACADE_PASS "+output);Application.Quit(0);
        }
        IEnumerator Run()
        {
            if(SystemInfo.graphicsDeviceType==GraphicsDeviceType.Null)throw new InvalidOperationException("This verification requires a GPU.");
            game=FindFirstObjectByType<GameController>();reflection=FindFirstObjectByType<PlanarFacadeReflection>();
            if(!game||!game.phase2Layout||!reflection)throw new InvalidOperationException("Missing Phase 2 facade component.");
            game.BeginVerification();game.Begin();game.Guide=false;game.enabled=false;
            game.GetComponent<FlightCamera>().enabled=false;game.GetComponent<GameHUD>().enabled=false;game.SetBallVisible(false);
            view=game.view;view.enabled=true;Application.targetFrameRate=-1;QualitySettings.vSyncCount=0;
            var c=game.Layout.cameras.Single(c=>c.id=="02-great-stair");
            origin=c.position;rotation=Quaternion.LookRotation(c.lookAt-c.position);view.fieldOfView=c.fov;
            SetTarget(1440,900);SetPose(0);StationMotion.SetTime(game.gameObject.scene,0);Physics.SyncTransforms();
            syncPixel=new Texture2D(1,1,TextureFormat.RGB24,false,false);
            for(int i=0;i<30;i++)yield return null;
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-facade-transitions"))
            {
                var transitions=Transitions();while(transitions.MoveNext())yield return transitions.Current;yield break;
            }
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-facade-profile"))
            {
                var profile=Profile();while(profile.MoveNext())yield return profile.Current;yield break;
            }
            // Exercise rolling/translating camera poses and changing escalator
            // phases, then inspect the next frame's actual LateUpdate result.
            for(int i=0;i<90;i++)
            {
                SetPose(i/89f);double phase=i/30.0;StationMotion.SetTime(game.gameObject.scene,phase);Physics.SyncTransforms();
                var position=view.transform.position;var turn=view.transform.rotation;var projection=view.projectionMatrix;
                int before=reflection.RenderCount;bool culling=GL.invertCulling;long started=Stopwatch.GetTimestamp();
                yield return null;
                if((Stopwatch.GetTimestamp()-started)/(double)Stopwatch.Frequency>60)throw new InvalidOperationException("Native frame did not complete promptly.");
                if(reflection.RenderCount!=before+1||!reflection.ReflectionValid)throw new InvalidOperationException("Expected one LateUpdate reflection per enabled-camera frame.");
                if(view.transform.position!=position||view.transform.rotation!=turn||view.projectionMatrix!=projection||GL.invertCulling!=culling||StationMotion.Time(game.gameObject.scene)!=phase)
                    throw new InvalidOperationException("Reflection changed the source camera, culling or escalator phase.");
                var expected=view.worldToCameraMatrix*PlanarFacadeReflection.ReflectionMatrix(reflection.planePoint,reflection.planeNormal);
                var actual=reflection.ReflectedCamera.worldToCameraMatrix;
                for(int k=0;k<16;k++)maximumMatrixError=Mathf.Max(maximumMatrixError,Mathf.Abs(expected[k]-actual[k]));
                if(maximumMatrixError>.0001f)throw new InvalidOperationException("Reflection camera lags the current game camera.");
                if(reflection.TextureSize!=new Vector2Int(720,450))throw new InvalidOperationException("Unexpected native reflection resolution.");
                poseChecks++;
                if(i==0||i==44||i==89)SaveTarget("pose-"+i.ToString("D2")+".png");
            }
            foreach(var size in new[]{new Vector2Int(1440,900),new Vector2Int(1920,1080)})
            foreach(bool enabled in new[]{false,true})
            {
                SetTarget(size.x,size.y);reflection.enabled=enabled;var samples=new List<double>();
                for(int i=0;i<240;i++)
                {
                    SetPose((i%180)/179f);StationMotion.SetTime(game.gameObject.scene,i/60.0);Physics.SyncTransforms();
                    long started=Stopwatch.GetTimestamp();yield return null;
                    if(i>=60)samples.Add((Stopwatch.GetTimestamp()-started)*1000.0/Stopwatch.Frequency);
                }
                var sorted=samples.OrderBy(x=>x).ToArray();timings.Add(new Timing{width=size.x,height=size.y,reflection=enabled,samples=sorted.Length,
                    medianMs=sorted[sorted.Length/2],p95Ms=sorted[(int)Math.Ceiling(sorted.Length*.95)-1],frameIntervalsMs=samples.ToArray()});
                SaveTarget(size.x+"-"+(enabled?"reflection-on":"reflection-off")+".png");
            }
            reflection.enabled=true;
            File.WriteAllText(Path.Combine(output,"layout-used.json"),game.LayoutSource.text);
            File.WriteAllText(Path.Combine(output,"verification.json"),JsonUtility.ToJson(new Report{
                status="PASS native reflection LateUpdate with explicit main-view render and GPU readback",layoutSha256=game.course.layoutSha256,graphicsDevice=SystemInfo.graphicsDeviceName,
                poseChecks=poseChecks,maximumMatrixError=maximumMatrixError,renderCount=reflection.RenderCount,skipCount=reflection.SkipCount,timings=timings.ToArray(),
                limits=new[]{"Native production reflection LateUpdate followed by an explicit main render request and one-pixel synchronized GPU readback, not normal keyboard/mouse or display/focus evidence.",
                    "Short fixture with explicit escalator phases, disabled gameplay simulation and no trajectory preview; not the ten-minute game-performance gate.",
                    "Frame intervals are CPU wall time between coroutine frames and exclude the immediately preceding pose/phase update. No GPU timing attribution.",
                    "Inspect saved images separately. Photographic registration and optical material calibration remain incomplete."}},true)+"\n");
        }
        void LateUpdate()
        {
            if(!view||!target||!syncPixel)return;
            var request=new RenderPipeline.StandardRequest{destination=target};
            if(!RenderPipeline.SupportsRenderRequest(view,request))throw new InvalidOperationException("Native main-view request is unsupported.");
            long started=Stopwatch.GetTimestamp();RenderPipeline.SubmitRenderRequest(view,request);mainSubmissionMs=Milliseconds(started);
            var previous=RenderTexture.active;started=Stopwatch.GetTimestamp();
            try{RenderTexture.active=target;syncPixel.ReadPixels(new Rect(target.width/2,target.height/2,1,1),0,0);syncPixel.Apply();}
            finally{RenderTexture.active=previous;readbackMs=Milliseconds(started);}
        }
        static double Milliseconds(long start)=>(Stopwatch.GetTimestamp()-start)*1000.0/Stopwatch.Frequency;
        IEnumerator Transitions()
        {
            // A warm steady-state image can hide a one-frame stale material
            // buffer. Capture the first visible frame after enabling or resizing.
            StationMotion.SetTime(game.gameObject.scene,0);Physics.SyncTransforms();
            int count=reflection.RenderCount;reflection.enabled=false;yield return null;
            if(reflection.ReflectionValid||reflection.RenderCount!=count)throw new InvalidOperationException("Disabled reflection continued rendering.");
            SaveTarget("disabled.png");reflection.enabled=true;yield return null;
            if(!reflection.ReflectionValid||reflection.RenderCount!=count+1)throw new InvalidOperationException("Reflection failed to resume on its first frame.");
            SaveTarget("enabled-first.png");yield return null;SaveTarget("enabled-settled.png");
            foreach(float scale in new[]{.25f,.5f})
            {
                reflection.resolutionScale=scale;yield return null;
                string id=scale<.5f?"quarter":"half";SaveTarget(id+"-first.png");yield return null;SaveTarget(id+"-settled.png");
            }
            File.WriteAllText(Path.Combine(output,"transition-status.txt"),"Native state transitions checked. Compare first-frame and settled PNGs for stale pixels before accepting visual continuity.\n");
        }
        IEnumerator Profile()
        {
            var requested=new HashSet<string>{"Draw Calls Count","Batches Count","SetPass Calls Count","Triangles Count","Vertices Count","Shadow Casters Count",
                "GPU Frame Time","CPU Main Thread Frame Time","CPU Render Thread Frame Time","GC Allocated In Frame"};
            var handles=new List<ProfilerRecorderHandle>();ProfilerRecorderHandle.GetAvailable(handles);
            var available=new List<string>();var counters=new List<(string name,string unit,ProfilerRecorder recorder)>();
            foreach(var handle in handles)
            {
                var description=ProfilerRecorderHandle.GetDescription(handle);
                available.Add(description.Category.Name+"\t"+description.Name+"\t"+description.UnitType);
                if(requested.Contains(description.Name))counters.Add((description.Name,description.UnitType.ToString(),ProfilerRecorder.StartNew(description.Category,description.Name)));
            }
            File.WriteAllLines(Path.Combine(output,"available-counters.tsv"),available.OrderBy(x=>x));
            var conditions=new List<ProfileCondition>();var mainData=view.GetUniversalAdditionalCameraData();var mirrorData=reflection.ReflectedCamera.GetUniversalAdditionalCameraData();
            bool oldMainShadows=mainData.renderShadows,oldMirrorShadows=mirrorData.renderShadows;float oldScale=reflection.resolutionScale;
            try
            {
                foreach(string id in new[]{"02-great-stair","05-west-terrace"})
                foreach(var condition in new[]{("off",false,.5f,true,true),("half",true,.5f,true,true),("quarter",true,.25f,true,true),
                    ("mirror-no-shadows",true,.5f,true,false),("no-shadows",true,.5f,false,false)})
                {
                    var pose=game.Layout.cameras.Single(c=>c.id==id);view.transform.SetPositionAndRotation(pose.position,Quaternion.LookRotation(pose.lookAt-pose.position));view.fieldOfView=pose.fov;view.ResetProjectionMatrix();
                    reflection.enabled=condition.Item2;reflection.resolutionScale=condition.Item3;mainData.renderShadows=condition.Item4;mirrorData.renderShadows=condition.Item5;
                    var elapsed=new List<double>();var main=new List<double>();var readback=new List<double>();var reflected=new List<double>();var station=new List<double>();
                    var values=counters.Select(c=>new List<long>()).ToArray();
                    for(int i=0;i<180;i++)
                    {
                        long start=Stopwatch.GetTimestamp();StationMotion.SetTime(game.gameObject.scene,i/60.0);Physics.SyncTransforms();double stationMs=Milliseconds(start);
                        yield return null;
                        if(i<60)continue;
                        elapsed.Add(Milliseconds(start));station.Add(stationMs);main.Add(mainSubmissionMs);readback.Add(readbackMs);reflected.Add(condition.Item2?reflection.LastSubmissionMilliseconds:0);
                        for(int k=0;k<counters.Count;k++)values[k].Add(counters[k].recorder.Valid&&counters[k].recorder.Count>0?counters[k].recorder.LastValue:-1);
                    }
                    var sorted=elapsed.OrderBy(x=>x).ToArray();conditions.Add(new ProfileCondition{view=id,condition=condition.Item1,reflectionScale=condition.Item3,
                        reflection=condition.Item2,mainShadows=condition.Item4,reflectionShadows=condition.Item5,medianMs=sorted[sorted.Length/2],p95Ms=sorted[(int)Math.Ceiling(sorted.Length*.95)-1],
                        intervalsMs=elapsed.ToArray(),mainSubmissionMs=main.ToArray(),readbackMs=readback.ToArray(),reflectionSubmissionMs=reflected.ToArray(),stationUpdateMs=station.ToArray(),
                        counters=counters.Select((c,k)=>new CounterSeries{name=c.name,unit=c.unit,valid=c.recorder.Valid,values=values[k].ToArray()}).ToArray()});
                    SaveTarget(id+"-"+condition.Item1+".png");
                    UnityEngine.Debug.Log($"KYOTO_RENDER_PROFILE {id} {condition.Item1} median={sorted[sorted.Length/2]:F3}ms");
                }
            }
            finally
            {
                mainData.renderShadows=oldMainShadows;mirrorData.renderShadows=oldMirrorShadows;reflection.resolutionScale=oldScale;reflection.enabled=true;
                foreach(var counter in counters)counter.recorder.Dispose();
            }
            var renderers=FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None);
            File.WriteAllText(Path.Combine(output,"profile.json"),JsonUtility.ToJson(new ProfileReport{status="Completed native rendering cost experiment; diagnostic settings are not saved",
                layoutSha256=game.course.layoutSha256,meshRenderers=renderers.Length,staticBatchedRenderers=renderers.Count(r=>r.isPartOfStaticBatch),conditions=conditions.ToArray(),
                limits=new[]{"1440x900 main target, 60 warm-up and 120 measured frames per condition, explicit main render and synchronized readback.",
                    "CPU stage durations include any stalls within the calls; they are not separate GPU timings.","Counter values of -1 mean no sample. Valid counters returning only zero may be unavailable in this batch path; do not infer zero GPU work.",
                    "Station pose updates are included, but normal input, game simulation and trajectory preview are disabled. No gameplay performance acceptance.",
                    "Shadow and resolution changes are attribution experiments, not approved appearance changes."}},true)+"\n");
            File.WriteAllText(Path.Combine(output,"layout-used.json"),game.LayoutSource.text);
        }
        void SetPose(float t)
        {
            float angle=t*Mathf.PI*2;
            view.transform.SetPositionAndRotation(origin+new Vector3(.7f*Mathf.Sin(angle),.2f*Mathf.Cos(angle),.2f*Mathf.Sin(angle)),
                rotation*Quaternion.Euler(4*Mathf.Sin(angle),6*Mathf.Sin(angle),25*Mathf.Cos(angle)));
        }
        void SetTarget(int width,int height)
        {
            view.targetTexture=null;if(target){target.Release();Destroy(target);}
            target=new RenderTexture(width,height,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB){name="Native facade fixture main view"};target.Create();
            view.targetTexture=target;view.aspect=(float)width/height;view.ResetProjectionMatrix();
        }
        void SaveTarget(string name)
        {
            var previous=RenderTexture.active;var pixels=new Texture2D(target.width,target.height,TextureFormat.RGB24,false,false);
            try
            {
                RenderTexture.active=target;pixels.ReadPixels(new Rect(0,0,target.width,target.height),0,0);pixels.Apply();
                File.WriteAllBytes(Path.Combine(output,name),pixels.EncodeToPNG());
                var data=pixels.GetRawTextureData<byte>();int colored=0;foreach(byte value in data)if(value>12)colored++;
                if(colored<data.Length/100)throw new InvalidOperationException("Main camera produced an empty image: "+name);
            }
            finally{RenderTexture.active=previous;Destroy(pixels);}
        }
    }
}
