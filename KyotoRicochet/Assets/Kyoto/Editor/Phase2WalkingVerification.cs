using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2WalkingVerification
    {
        static readonly List<string> report=new List<string>();
        static int failed;
        static void Check(bool value,string name,string detail="")
        {string line=(value?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!value)failed++;}
        static Vector2[][] Contours(int count,float z)
        {
            var rows=new Vector2[count+1][];
            for(int i=0;i<=count;i++)rows[i]=new[]{new Vector2(-2,z+i*.3f),new Vector2(0,z+i*.3f+.12f),new Vector2(2,z+i*.3f)};
            return rows;
        }
        public static void Run()
        {
            report.Clear();failed=0;Check(Application.isPlaying,"CharacterController exercised in Unity Play mode");
            const float rise=.175f,dt=1f/90;
            var root=new GameObject("Walking verification");
            var stone=Surface.Material("Test stone",.76f,.24f);
            StationGeometry.Box(root.transform,"Lower floor",new Vector3(0,-.25f,-2),new Vector3(8,.5f,4.3f),stone,"lower","LOWER");
            StairGeometry.Create(root.transform,"flight-a",Contours(13,0),0,rise,stone);
            StationGeometry.Box(root.transform,"Landing",new Vector3(0,13*rise-.15f,4.71f),new Vector3(4,.3f,1.65f),stone,"landing","LANDING");
            StairGeometry.Create(root.transform,"flight-b",Contours(14,5.4f),13*rise,rise,stone);
            StationGeometry.Box(root.transform,"Upper floor",new Vector3(0,27*rise-.15f,11),new Vector3(8,.3f,2.8f),stone,"upper","UPPER");
            var actor=new GameObject("Test walker");actor.AddComponent<CharacterController>();var walker=actor.AddComponent<FirstPersonWalker>();
            walker.Place(new Vector3(0,.03f,-1));Physics.SyncTransforms();
            var trace=new List<string>{"section,seconds,x,y,z,grounded"};float clock=0;
            void Move(string section,float yaw,float seconds)
            {
                for(int i=0;i<Mathf.RoundToInt(seconds/dt);i++)
                {
                    walker.Move(Vector2.up,yaw,false,dt);clock+=dt;
                    var p=actor.transform.position;
                    if(i%9==0)trace.Add(FormattableString.Invariant($"{section},{clock:R},{p.x:R},{p.y:R},{p.z:R},{walker.Grounded}"));
                }
            }
            Move("ascent-a",0,4.2f);
            Check(actor.transform.position.z>4.3f&&actor.transform.position.z<5.4f,"Reach intermediate landing",actor.transform.position.ToString("F5"));
            for(int i=0;i<90;i++)walker.Move(Vector2.zero,0,false,dt);
            Check(Mathf.Abs(actor.transform.position.y-13*rise)<.06f,"Stand on landing at correct height",actor.transform.position.y.ToString("F5"));
            Move("turn-right",90,.3f);Move("turn-left",-90,.3f);
            Check(Mathf.Abs(actor.transform.position.x)<.03f,"Turn and move across landing without drift");
            Move("ascent-b",0,4.6f);
            Check(actor.transform.position.z>10&&Mathf.Abs(actor.transform.position.y-27*rise)<.06f,"Ascend both curved flights",actor.transform.position.ToString("F5"));
            Move("descent",180,8.8f);
            Check(actor.transform.position.z<0&&Mathf.Abs(actor.transform.position.y)<.06f,"Descend both flights continuously",actor.transform.position.ToString("F5"));
            Check(Physics.GetIgnoreLayerCollision(CollisionLayers.Player,CollisionLayers.BallStairs),"Capsule ignores individual ball treads");
            // A real ball in this same world must hit the physical tread, never the player ramp.
            var obj=new GameObject("Tread probe ball");obj.AddComponent<Rigidbody>();obj.AddComponent<SphereCollider>();var ball=obj.AddComponent<BallBody>();
            var contacts=new List<ContactSample>();ball.Contact+=contacts.Add;
            ball.Launch(new Vector3(0,2,1.35f),Vector3.down*5,new Vector3(200,0,0));
            for(int i=0;i<180&&contacts.Count==0;i++)ball.BeforeStep(BallBody.Step);
            Check(contacts.Count>0&&contacts[0].surfaceId=="flight-a","Ball contacts a real stair tread",contacts.Count>0?contacts[0].surfaceId:"no contact");
            Check(contacts.Count>0&&contacts[0].normal.y>.99f,"Ball sees a horizontal tread rather than a slope");
            Check(ball.ContactBudgetExhaustions==0,"No exhausted contact budget at a tread");
            walker.Place(new Vector3(0,.03f,-1));
            Check(walker.TryRelease(0,0,out var release),"Unobstructed hand release accepted",release.ToString("F5"));
            var wall=StationGeometry.Box(root.transform,"Release wall",release+Vector3.forward*.05f,new Vector3(1,2,.1f),stone,"wall","WALL");Physics.SyncTransforms();
            bool safe=walker.TryRelease(0,0,out var shortened);
            Check(!safe||!Physics.CheckSphere(shortened,BallBody.Radius+.004f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore),"Near-wall throw cannot spawn in geometry");
            string path="../artifacts/phase2/walking";Directory.CreateDirectory(path);File.WriteAllLines(path+"/verification.txt",report);File.WriteAllLines(path+"/two-flight-trace.csv",trace);
            UnityEngine.Object.DestroyImmediate(root);UnityEngine.Object.DestroyImmediate(actor);UnityEngine.Object.DestroyImmediate(obj);
            if(failed>0)throw new Exception(failed+" walking checks failed.");
        }
    }
}
