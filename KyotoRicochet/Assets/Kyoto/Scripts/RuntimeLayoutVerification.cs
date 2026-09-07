using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto
{
    // Explicit opt-in evidence capture; never runs during an ordinary game session.
    public sealed class RuntimeLayoutVerification:MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Install()
        {
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-phase2-layout"))
                new GameObject("Layout evidence capture").AddComponent<RuntimeLayoutVerification>();
        }
        IEnumerator Start()
        {
            var game=FindFirstObjectByType<GameController>();
            if(!game||!game.phase2Layout){Debug.LogError("Layout capture needs the Phase 2 scene.");Application.Quit(1);yield break;}
            string path=Path.Combine(Application.persistentDataPath,"layout-evidence");
            foreach(string arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))path=arg.Substring("--kyoto-evidence=".Length);
            Directory.CreateDirectory(path);game.BeginVerification();game.Begin();game.Guide=false;
            bool offscreen=Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-layout-offscreen");
            game.enabled=false;game.GetComponent<FlightCamera>().enabled=false;game.GetComponent<GameHUD>().enabled=false;game.SetBallVisible(false);
            StationMotion.SetTime(game.gameObject.scene,0);Physics.SyncTransforms();
            // Let the player's first frame, shaders and shadows finish before capturing.
            for(int i=0;i<45;i++)yield return null;
            var cameras=new List<StationLayout.ComparisonCamera>(game.Layout.cameras);
            if(game.Layout.inspectionCameras!=null)cameras.AddRange(game.Layout.inspectionCameras);
            string poseArgument=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-layout-poses="));
            if(poseArgument!=null)
            {
                string poseText=File.ReadAllText(poseArgument.Substring("--kyoto-layout-poses=".Length));
                var poses=JsonUtility.FromJson<StationLayout>(poseText).cameras;
                if(poses==null||poses.Length==0||poses.Length>128)throw new InvalidOperationException("Expected 1–128 inspection poses.");
                cameras=new List<StationLayout.ComparisonCamera>(poses);
                File.WriteAllText(Path.Combine(path,"inspection-poses-used.json"),poseText);
            }
            File.WriteAllText(Path.Combine(path,"layout-used.json"),game.LayoutSource.text);
            File.WriteAllText(Path.Combine(path,"camera-settings.csv"),"id,width,height,vertical_fov_degrees,roll_degrees,station_seconds\n");
            int defaultWidth=offscreen?1440:Screen.width,defaultHeight=offscreen?900:Screen.height;
            foreach(var c in cameras)
            {
                int width=c.captureWidth>0?c.captureWidth:defaultWidth,height=c.captureHeight>0?c.captureHeight:defaultHeight;
                if(!offscreen&&(Screen.width!=width||Screen.height!=height))
                {
                    Screen.SetResolution(width,height,FullScreenMode.Windowed);
                    for(int i=0;i<8;i++)yield return null;
                }
                game.view.transform.SetPositionAndRotation(c.position,Quaternion.LookRotation(c.lookAt-c.position)*Quaternion.AngleAxis(c.roll,Vector3.forward));game.view.fieldOfView=c.fov;
                game.view.aspect=(float)width/height;
                for(int i=0;i<3;i++)yield return null;
                if(offscreen)CaptureOffscreen(game.view,width,height,Path.Combine(path,c.id+".png"));
                else
                {
                    yield return new WaitForEndOfFrame();
                    ScreenCapture.CaptureScreenshot(Path.Combine(path,c.id+".png"));
                }
                File.AppendAllText(Path.Combine(path,"camera-settings.csv"),FormattableString.Invariant($"{c.id},{(offscreen?width:Screen.width)},{(offscreen?height:Screen.height)},{c.fov:R},{c.roll:R},{StationMotion.Time(game.gameObject.scene):R}\n"));
                yield return null;yield return null;
            }
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-escalator-motion"))
            {
                foreach(string id in new[]{"inspect-east-escalator-bottom","inspect-lower-escalators","inspect-east-lower-access"})
                {
                    var c=cameras.Find(q=>q.id==id);
                    if(c==null)throw new InvalidOperationException("Missing moving-bank inspection camera: "+id);
                    string sequence=Path.Combine(path,id+"-motion");Directory.CreateDirectory(sequence);
                    game.view.transform.SetPositionAndRotation(c.position,Quaternion.LookRotation(c.lookAt-c.position));game.view.fieldOfView=c.fov;game.view.aspect=1.6f;
                    File.WriteAllText(Path.Combine(sequence,"time.csv"),"frame,station_seconds\n");
                    for(int frame=0;frame<32;frame++)
                    {
                        double seconds=frame/16.0;StationMotion.SetTime(game.gameObject.scene,seconds);Physics.SyncTransforms();yield return null;
                        CaptureOffscreen(game.view,1440,900,Path.Combine(sequence,frame.ToString("D3")+".png"));
                        File.AppendAllText(Path.Combine(sequence,"time.csv"),FormattableString.Invariant($"{frame},{seconds:R}\n"));
                    }
                }
                StationMotion.SetTime(game.gameObject.scene,0);Physics.SyncTransforms();
            }
            string cameraScope=poseArgument==null?$"{game.Layout.cameras.Length} comparison cameras and {cameras.Count-game.Layout.cameras.Length} supplementary inspection cameras.":$"{cameras.Count} explicitly supplied inspection cameras; not formal photo-registration evidence.";
            File.WriteAllText(Path.Combine(path,"capture-settings.txt"),$"Native player · working circulation draft\n{Application.version}\n{(offscreen?"Offscreen GPU render requests; not displayed-window or input evidence":"Displayed-window screenshots")}\nPer-view resolution in camera-settings.csv\n{SystemInfo.graphicsDeviceName}\n{game.Layout.status}\n{cameraScope}\nPhoto registration remains pending.\n");
            for(int i=0;i<30;i++)yield return null;
            Debug.Log("KYOTO_LAYOUT_CAPTURE_COMPLETE "+path);Application.Quit(0);
        }
        static void CaptureOffscreen(Camera camera,int width,int height,string path)
        {
            var target=new RenderTexture(width,height,24,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);
            var pixels=new Texture2D(width,height,TextureFormat.RGB24,false,false);
            var previous=RenderTexture.active;
            try
            {
                target.Create();
                var reflection=FindFirstObjectByType<PlanarFacadeReflection>();
                if(reflection)reflection.RenderForCamera(camera,width,height);
                var request=new RenderPipeline.StandardRequest{destination=target};
                if(!RenderPipeline.SupportsRenderRequest(camera,request))throw new InvalidOperationException("Current render pipeline cannot capture the requested view.");
                RenderPipeline.SubmitRenderRequest(camera,request);
                RenderTexture.active=target;pixels.ReadPixels(new Rect(0,0,width,height),0,0);pixels.Apply();
                File.WriteAllBytes(path,pixels.EncodeToPNG());
            }
            finally{RenderTexture.active=previous;target.Release();Destroy(target);Destroy(pixels);}
        }
    }
}
