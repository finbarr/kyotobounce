#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto
{
    public static class CupBoundaryVerification
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Native()
        {
            if(!Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-cup-boundary"))return;
            try{Run();Application.Quit(0);}catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        public static void Run()
        {
            var argument=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-evidence="));
            if(argument==null)throw new ArgumentException("Explicit evidence directory required.");
            string output=argument.Substring("--kyoto-evidence=".Length);Directory.CreateDirectory(output);
            var report=new List<string>();int failed=0;
            void Check(bool good,string name,string details="")
            {string line=(good?"PASS ":"FAIL ")+name+" "+details;report.Add(line);Debug.Log(line);if(!good)failed++;}
            report.Add($"Unity={Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}");
            using(var sim=new ShotSimulation(false,profile:BallProfile.Phase2Default))
            {
                var sphere=sim.Ball.GetComponent<SphereCollider>();float ballRadius=sim.Ball.Profile.radius_m;
                var center=new Vector3(91.800987f,33.5f,1.5795234f);
                foreach(float radius in new[]{.10f,.125f,.15f})
                {
                    sim.SetCup(center,radius);Physics.SyncTransforms();
                    var walls=new List<Collider>();foreach(var c in sim.Root.GetComponentsInChildren<Collider>())if(c.name=="Cup shell")walls.Add(c);
                    int clear=0,captured=0,rejected=0,penetrating=0;
                    float clearance=radius-ballRadius;
                    // Between the inscribed circle and real polygon corner;
                    // independently compare capture with actual PhysX solids.
                    float cornerRadius=Mathf.Lerp(clearance,clearance/Mathf.Cos(Mathf.PI/48),.6f);
                    for(int i=0;i<48;i++)
                    {
                        foreach(bool outside in new[]{false,true})
                        {
                            float angle=(i+(outside?0:.5f))*2*Mathf.PI/48;
                            float distance=outside?clearance+.0005f:cornerRadius;
                            Vector3 offset=new Vector3(Mathf.Sin(angle)*distance,0,Mathf.Cos(angle)*distance);
                            Vector3 resting=center+offset+Vector3.up*(CupCapture.Floor+ballRadius+.0002f);
                            bool overlaps=false;
                            foreach(var wall in walls)if(Physics.ComputePenetration(sphere,resting,Quaternion.identity,wall,wall.transform.position,wall.transform.rotation,out _,out float depth)&&depth>.00002f)overlaps=true;
                            var cup=new CupCapture{Base=center,InnerRadius=radius,BallRadius=ballRadius};
                            cup.Reset(center+offset+Vector3.up*.4f);cup.Step(center+offset+Vector3.up*.1f,Vector3.down,.01f);
                            int awards=0;for(int j=0;j<150;j++)if(cup.Step(resting,Vector3.zero,.01f))awards++;
                            if(outside){if(overlaps)penetrating++;if(!cup.Captured&&awards==0)rejected++;}
                            else{if(!overlaps)clear++;if(cup.Captured&&awards==1)captured++;}
                        }
                    }
                    Check(walls.Count==48&&clear==48,"Actual polygon corners admit the ball",$"cup_radius={radius:R}; clear={clear}/48; physical wall boxes={walls.Count}");
                    Check(captured==48,"Valid corner entry settles and awards exactly once",$"cup_radius={radius:R}; captures={captured}/48");
                    Check(rejected==48&&penetrating==48,"Outside wall planes remain rejected",$"cup_radius={radius:R}; rejected={rejected}/48; actual penetrating controls={penetrating}/48");
                }
                var capture=new CupCapture{Base=center,InnerRadius=.15f,BallRadius=ballRadius};
                var rest=center+Vector3.up*(CupCapture.Floor+ballRadius+.0002f);
                capture.Reset(center+new Vector3(.3f,.05f,0));for(int i=0;i<100;i++)capture.Step(rest,Vector3.zero,.01f);
                Check(!capture.Captured,"Sideways overlap without mouth entry cannot score");
                capture.Reset(center+Vector3.up*.4f);capture.Step(center+Vector3.up*.1f,Vector3.down,.01f);
                capture.Step(center+new Vector3(.2f,.25f,0),Vector3.up,.01f);
                for(int i=0;i<100;i++)capture.Step(rest,Vector3.zero,.01f);
                Check(!capture.Captured,"Rim-out clears entry state before later overlap");
            }
            File.WriteAllLines(Path.Combine(output,"verification.txt"),report);
            if(failed>0)throw new Exception(failed+" cup-boundary checks failed.");
        }
    }
}
#endif
