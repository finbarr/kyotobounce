using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Start in the public concourse: a probe beside the glass can miss an occluding wall.
    public static class AtriumLowerOpeningVerification
    {
        static string Arg(string key)
        {
            string prefix="--kyoto-"+key+"=";
            string value=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return value==null?throw new ArgumentException("Missing "+prefix):value.Substring(prefix.Length);
        }
        public static void Run()
        {
            string text=File.ReadAllText(Arg("layout-candidate")),output=Arg("evidence");
            if(Directory.Exists(output)&&Directory.GetFileSystemEntries(output).Length>0)
                throw new InvalidOperationException("Use a fresh opening evidence directory.");
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("Lower opening verification");
            StationWorld.Create(root.transform,JsonUtility.FromJson<StationLayout>(text));
            var ball=new GameObject("Opening production ball").AddComponent<BallBody>();
            ball.SetProfile(BallProfile.Phase2Default);Physics.SyncTransforms();
            var report=new List<string>{"Public-side aperture sphere sweeps and production-ball throws; not normal-input or photographic acceptance."};
            using(var sha=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant());
            int failures=0;
            void Check(bool pass,string name,string detail)
            {
                report.Add((pass?"PASS ":"FAIL ")+name+": "+detail);
                if(!pass)failures++;
            }
            string first=null;
            ball.Impact+=(surface,point,speed)=>{if(first==null)first=surface.surfaceId;};
            foreach(var bay in new[]{
                (id:"east-lower-service-door",x0:22.2f,x1:23.45f,y0:0f,y1:2.35f),
                (id:"east-lower-display",x0:24.55f,x1:27.55f,y0:.48f,y1:2.55f),
                (id:"east-lower-landing-door",x0:30.05f,x1:32.55f,y0:0f,y1:2.75f)})
            for(int pane=0;pane<2;pane++)
            {
                float x=Mathf.Lerp(bay.x0,bay.x1,pane==0?.25f:.75f);
                string expected=bay.id+" glass "+pane;
                foreach(float fraction in new[]{.25f,.5f,.75f})
                foreach(float offset in new[]{-.3f,0,.3f})
                {
                    float y=Mathf.Lerp(bay.y0,bay.y1,fraction);
                    var origin=new Vector3(x+offset,y,2.35f);
                    var direction=(new Vector3(x,y,4.015f)-origin).normalized;
                    bool hit=Physics.SphereCast(origin,ball.Profile.radius_m,direction,out var contact,2.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    string id=hit?contact.collider.name:"none";
                    Check(hit&&id==expected&&Mathf.Abs(contact.point.z-4.015f)<.003f&&contact.normal.z<-.99f,
                        expected+" public-side sweep",$"height={y:R}, offset={offset:R}, hit={id}, point={contact.point:F5}");
                }
                first=null;
                ball.Launch(new Vector3(x,(bay.y0+bay.y1)*.5f+.55f,2.35f),Vector3.forward*5,new Vector3(40,25,-30));
                Physics.SyncTransforms();
                for(int step=0;step<180&&first==null;step++)ball.BeforeStep(BallBody.Step);
                Check(first==expected&&ball.Velocity.z<0&&ball.ContactBudgetExhaustions==0&&ball.StaticOverlapRecoveries==0,
                    expected+" production throw",$"first={first??"none"}, outgoing={ball.Velocity:F5}, budget={ball.ContactBudgetExhaustions}, recoveries={ball.StaticOverlapRecoveries}");
            }
            Directory.CreateDirectory(output);File.WriteAllLines(Path.Combine(output,"verification.txt"),report);
            foreach(string line in report)Debug.Log(line);
            UnityEngine.Object.DestroyImmediate(ball.gameObject);UnityEngine.Object.DestroyImmediate(root);
            if(failures>0)throw new InvalidOperationException(failures+" lower opening checks failed.");
        }
    }
}
