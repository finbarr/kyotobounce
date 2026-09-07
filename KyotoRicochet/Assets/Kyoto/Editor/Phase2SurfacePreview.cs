using System;
using System.IO;
using System.Linq;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2SurfacePreview
    {
        public static void Run()
        {
            string output=null;
            foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            if(output==null)throw new ArgumentException("Explicit evidence path required.");
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            var camera=UnityEngine.Object.FindFirstObjectByType<GameController>().view;
            var layout=StationLayout.Load();var cameras=layout.cameras.Concat(layout.inspectionCameras).ToArray();
            foreach(var name in new[]{"02-great-stair","inspect-lower-escalators","inspect-upper-crossing","inspect-east-escalator-bottom"})
            {
                var c=cameras.Single(p=>p.id==name);int width=c.captureWidth>0?c.captureWidth:1440,height=c.captureHeight>0?c.captureHeight:900;
                camera.transform.SetPositionAndRotation(c.position,Quaternion.LookRotation(c.lookAt-c.position)*Quaternion.AngleAxis(c.roll,Vector3.forward));
                camera.fieldOfView=c.fov;camera.aspect=(float)width/height;
                MunicipalMaterialPreview.Capture(camera,width,height,Path.Combine(output,name+".png"));
            }
            var flight=layout.flights.First(f=>f.id=="daikaidan-flight-01");var rows=flight.Rows();int col=rows[0].Length/3;
            var a=rows[4][col];var b=rows[9][col];
            var eye=new Vector3(a.x,flight.baseElevation+5*flight.rise+1.65f,a.y);
            var target=new Vector3(b.x,flight.baseElevation+10*flight.rise,b.y);
            camera.transform.SetPositionAndRotation(eye,Quaternion.LookRotation(target-eye));camera.fieldOfView=50;camera.aspect=1.5f;
            MunicipalMaterialPreview.Capture(camera,1200,800,Path.Combine(output,"stair-tread-close.png"));
            var lane=UnityEngine.Object.FindObjectsByType<MovingEscalator>(FindObjectsSortMode.None).First(l=>l.specification.id=="east-skyway-escalator-1");
            var escalatorEye=lane.transform.TransformPoint(new Vector3(0,2.65f,1));var escalatorTarget=lane.transform.TransformPoint(new Vector3(0,.55f,4));
            camera.transform.SetPositionAndRotation(escalatorEye,Quaternion.LookRotation(escalatorTarget-escalatorEye));camera.fieldOfView=45;
            MunicipalMaterialPreview.Capture(camera,1200,800,Path.Combine(output,"escalator-tread-close.png"));
            File.WriteAllText(Path.Combine(output,"preview.txt"),"PASS saved-scene editor GPU surface preview; scene not saved.\nClose view eye="+eye.ToString("F6")+"; target="+target.ToString("F6")+"; vertical FOV=50; aspect=1.5\nNot normal-input or photographic acceptance.\n");
            File.Copy("Assets/Kyoto/Resources/StationLayout.json",Path.Combine(output,"layout-used.json"));
            Debug.Log("KYOTO_SURFACE_PREVIEW_COMPLETE "+output);
        }
    }
}
