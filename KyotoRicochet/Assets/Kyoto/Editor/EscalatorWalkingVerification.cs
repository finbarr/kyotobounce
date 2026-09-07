using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class EscalatorWalkingVerification
    {
        public static void Run()
        {
            string directory="../artifacts/phase3/escalator-walking";
            var layout=JsonUtility.FromJson<StationLayout>(File.ReadAllText("../artifacts/phase2/blender-authoring/iteration-20/export-05/station-layout.json"));
            var root=new GameObject("Reported escalator world");StationWorld.Create(root.transform,layout,true,true);
            StationMotion.SetAnalyticOnly(root.scene,true);Physics.simulationMode=SimulationMode.Script;
            var actor=new GameObject("Reported walker");var walker=actor.AddComponent<FirstPersonWalker>();
            var report=new List<string>();int failed=0;
            void Check(bool ok,string name,string detail="")
            {var line=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
            void Move(Vector2 input,float yaw,float seconds,bool fast=false)
            {for(int i=0;i<Mathf.RoundToInt(seconds/BallBody.Step);i++){StationMotion.Advance(root.scene,BallBody.Step);walker.Move(input,yaw,fast,BallBody.Step);}}
            var start=new Vector3(34.254364f,5.546713f,1.5709997f);
            try
            {
                foreach(var input in new[]{Vector2.zero,Vector2.up,Vector2.down,Vector2.left,Vector2.right})
                {
                    walker.Place(start);Move(input,95.58f,2);
                    var end=actor.transform.position;string label="Reported corner, input "+input;
                    if(input==Vector2.right)
                    {
                        Check(end.z>=start.z-.001f,label+": handrail blocks movement into the corner",end.ToString("F5"));
                        Move(Vector2.zero,95.58f,2);end=actor.transform.position;
                        Check(end.x>start.x+.2f,label+": releasing input restores the passive ride",end.ToString("F5"));
                    }
                    else if(input==Vector2.down)Check(end.x<start.x-.5f,label+": back away",end.ToString("F5"));
                    else if(input==Vector2.left)Check(end.z>start.z+.2f,label+": move toward lane center",end.ToString("F5"));
                    else Check(end.x>start.x+.2f,label+": advance along escalator",end.ToString("F5"));
                    Check(end.z>1.58f,label+": stay inside handrail");
                }
                foreach(var lane in UnityEngine.Object.FindObjectsByType<MovingEscalator>(FindObjectsSortMode.None))
                {
                    var spec=lane.specification;if(!spec.id.StartsWith("east-concourse-"))continue;
                    bool up=spec.speed>0;float from=up?-.7f:spec.run+.7f;
                    var feet=lane.transform.TransformPoint(new Vector3(0,up?0:spec.height,from))+Vector3.up*.03f;
                    walker.Place(feet);float duration=(spec.run+2)/(.4f*Mathf.Abs(spec.speed));
                    Move(Vector2.zero,90,duration);
                    var end=lane.transform.InverseTransformPoint(actor.transform.position);
                    Check(up?end.z>spec.run+.65f:end.z<-.65f,spec.id+": passive ride reaches opposite landing",end.ToString("F5"));
                    Check(Mathf.Abs(end.y-(up?spec.height:0))<.10f,spec.id+": ride stays on walking surface",end.ToString("F5"));
                    Move(Vector2.up,up?90:-90,1.2f);
                    var exit=lane.transform.InverseTransformPoint(actor.transform.position);
                    Check(up?exit.z>end.z+.8f:exit.z<end.z-.8f,spec.id+": walk off onto landing",exit.ToString("F5"));
                    // Walking against a descending lane must still be possible.
                    if(!up)
                    {
                        walker.Place(lane.transform.TransformPoint(new Vector3(0,0,-.7f))+Vector3.up*.03f);
                        for(int i=0;i<180*30&&lane.transform.InverseTransformPoint(actor.transform.position).z<spec.run+.7f;i++)
                        {StationMotion.Advance(root.scene,BallBody.Step);walker.Move(Vector2.up,90,true,BallBody.Step);}
                        var against=lane.transform.InverseTransformPoint(actor.transform.position);
                        Check(against.z>spec.run+.65f&&Mathf.Abs(against.y-spec.height)<.10f,spec.id+": walk up against travel",against.ToString("F5"));
                    }
                }
            }
            finally{UnityEngine.Object.DestroyImmediate(actor);UnityEngine.Object.DestroyImmediate(root);}
            Directory.CreateDirectory(directory);File.WriteAllLines(directory+"/verification.txt",report);
            // Existing independent stair fixture exercises ascent, descent,
            // landing pause, capsule clearance and actual ball tread contacts.
            Phase2WalkingVerification.Run();
            if(failed>0)throw new Exception(failed+" escalator walking checks failed");
        }
    }
}
