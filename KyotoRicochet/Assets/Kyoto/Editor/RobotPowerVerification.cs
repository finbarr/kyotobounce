using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class RobotPowerVerification
    {
        public static void Run()
        {
            var report=new List<string>();int failed=0;
            void Check(bool ok,string name){report.Add((ok?"PASS ":"FAIL ")+name);if(!ok)failed++;}
            Check(Application.isPlaying,"Real Unity collision queries in Play mode");
            var root=new GameObject("Robot power collision fixture");
            var material=Surface.Material("Thin surface",.76f,.24f);
            // Four millimetres is much thinner than one tick's 100 m/s travel.
            var slab=StationGeometry.Box(root.transform,"Thin slab",Vector3.zero,new Vector3(30,.004f,30),material,"thin-slab","SLAB");
            slab.GetComponent<Surface>().useBallReferenceResponse=true;
            var obj=new GameObject("Fast ball");obj.AddComponent<Rigidbody>();obj.AddComponent<SphereCollider>();
            var ball=obj.AddComponent<BallBody>();ball.SetProfile(BallProfile.Phase2Default);
            var contacts=new List<ContactSample>();ball.Contact+=contacts.Add;
            try
            {
                int cases=0;
                foreach(var normal in new[]{Vector3.up,Vector3.forward,new Vector3(.3f,.8f,.52f).normalized})
                foreach(float angle in new[]{0f,35f,70f})foreach(float spin in new[]{-200f,0f,200f})
                {
                    cases++;contacts.Clear();slab.transform.rotation=Quaternion.FromToRotation(Vector3.up,normal);
                    var tangent=Vector3.Cross(normal,Vector3.right).normalized;
                    var velocity=100*(-normal*Mathf.Cos(angle*Mathf.Deg2Rad)+tangent*Mathf.Sin(angle*Mathf.Deg2Rad));
                    ball.Launch(normal,velocity,Vector3.Cross(normal,tangent)*spin);Physics.SyncTransforms();
                    for(int i=0;i<18&&contacts.Count==0;i++)ball.BeforeStep(BallBody.Step);
                    Check(contacts.Count>0,$"Case {cases}: swept contact at 100 m/s");
                    if(contacts.Count==0)continue;
                    var hit=contacts[0];
                    float before=ball.Profile.mass_kg*hit.incomingVelocity.sqrMagnitude+ball.Profile.Inertia*hit.incomingSpin.sqrMagnitude;
                    float after=ball.Profile.mass_kg*hit.outgoingVelocity.sqrMagnitude+ball.Profile.Inertia*hit.outgoingSpin.sqrMagnitude;
                    Check(hit.surfaceId=="thin-slab"&&Vector3.Dot(hit.normal,normal)>.99f&&Vector3.Dot(hit.outgoingVelocity,normal)>0&&Vector3.Dot(ball.Body.position,normal)>ball.Profile.radius_m-.001f,$"Case {cases}: rebound stays on the front of a 4 mm surface");
                    Check(after<=before*1.00001f&&!float.IsNaN(after)&&ball.ContactBudgetExhaustions==0,$"Case {cases}: finite passive response without exhausted contact budget");
                }
                Directory.CreateDirectory("../artifacts/phase3/robot-power");
                File.WriteAllLines("../artifacts/phase3/robot-power/collision-verification.txt",report);
                Debug.Log($"Robot power: {cases} high-speed collision cases, {failed} failures");
                if(failed>0)throw new Exception(failed+" robot power checks failed");
            }
            finally{UnityEngine.Object.DestroyImmediate(obj);UnityEngine.Object.DestroyImmediate(root);UnityEngine.Object.DestroyImmediate(material);}
        }
    }
}
