using System;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    // Preserve the old solver and the actual GameController control mapping as runtime evidence.
    // This suite records behavior; it does not assert that Phase 1 is physically calibrated.
    public static class Phase2Baseline
    {
        public static void Run()
        {
            if (!Application.isPlaying) throw new InvalidOperationException("Requires Play mode.");
            Physics.gravity = Vector3.down * 9.81f;
            string directory = Path.GetFullPath("../artifacts/phase2/baseline");
            Directory.CreateDirectory(directory);
            var controlObject = new GameObject("Inactive launch controls");
            controlObject.SetActive(false);
            var controls = controlObject.AddComponent<GameController>();
            controls.Yaw = controls.Pitch = 0;
            controls.Speed = 1;
            using (var summary = new StreamWriter(Path.Combine(directory, "unity-contact-baseline.csv")))
            {
                summary.WriteLine("case,speed,top_control,side_control,omega_x,omega_y,omega_z,first_out_x,first_out_y,first_out_z,returned,final_x,final_z");
                string[] names = { "neutral", "side-right", "side-left", "backspin", "topspin", "backspin-faster" };
                for (int i = 0; i < names.Length; i++)
                using (var sim = new ShotSimulation(false))
                {
                    controls.Speed = i == 5 ? 4 : 1;
                    controls.Spin = i == 3 || i == 5 ? -200 : i == 4 ? 200 : 0;
                    controls.SideSpin = i == 1 ? 200 : i == 2 ? -200 : 0;
                    StationGeometry.Box(sim.Root, "Concourse specimen", new Vector3(0,-.25f,0), new Vector3(30,.5f,30), Surface.Material("Phase 1 concourse",.76f,.24f),"floor","FLOOR");
                    bool hit = false, returned = false;
                    Vector3 first = Vector3.zero;
                    sim.Ball.Impact += (s,p,v) => { if (!hit) { first = sim.Ball.Velocity; hit = true; } };
                    Vector3 spin = controls.LaunchSpin;
                    using (var trace = new StreamWriter(Path.Combine(directory,names[i]+".csv")))
                    {
                        trace.WriteLine("time,x,y,z,vx,vy,vz,wx,wy,wz");
                        sim.Run(new Vector3(0,1.25f,0),controls.LaunchVelocity,spin,2,sample:b => {
                            var p=b.Body.position;var v=b.Velocity;var w=b.AngularVelocity;
                            if(hit && p.z<0) returned=true;
                            trace.WriteLine(FormattableString.Invariant($"{b.Clock:R},{p.x:R},{p.y:R},{p.z:R},{v.x:R},{v.y:R},{v.z:R},{w.x:R},{w.y:R},{w.z:R}"));
                        });
                    }
                    var end=sim.Ball.Body.position;
                    summary.WriteLine(FormattableString.Invariant($"{names[i]},{controls.Speed},{controls.Spin},{controls.SideSpin},{spin.x},{spin.y},{spin.z},{first.x:R},{first.y:R},{first.z:R},{returned},{end.x:R},{end.z:R}"));
                    Debug.Log($"BASELINE {names[i]} first={first:F6} returned={returned} spin={spin}");
                    if(!hit)throw new Exception("Baseline missed the floor: "+names[i]);
                }
            }
            UnityEngine.Object.DestroyImmediate(controlObject);
        }
    }
}
