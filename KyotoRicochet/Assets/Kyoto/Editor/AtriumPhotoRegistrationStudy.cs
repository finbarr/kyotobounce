using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Kyoto.Editor
{
    // Research-only capture. Does not save or change the shipped scene/cameras.
    public static class AtriumPhotoRegistrationStudy
    {
        [Serializable] sealed class Proof { public string id; public Vector3 world; public Vector2 pixel; }
        [Serializable] sealed class Pose
        {
            public string id; public Vector3 position,lookAt;
            public float fov,roll,principalPointOffsetX,principalPointOffsetY;
            public int captureWidth,captureHeight; public Proof[] proof;
        }
        [Serializable] sealed class Poses { public Pose[] cameras; }
        [Serializable] sealed class HitRecord { public string surface; public float distance; public Vector3 point; }
        [Serializable] sealed class Sightline { public string camera,landmark; public Vector3 target; public float targetDistance; public HitRecord[] interveningHits; }
        [Serializable] sealed class Sightlines { public Sightline[] lines; }
        static string Arg(string name) => Environment.GetCommandLineArgs().Single(a=>a.StartsWith("--kyoto-"+name+"=")).Split('=',2)[1];
        public static void InspectVisibility()
        {
            string output=Arg("evidence");
            if(Directory.Exists(output)) throw new InvalidOperationException("Use a fresh evidence directory.");
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(Arg("scene-path"));Physics.SyncTransforms();
            var colliders=Object.FindObjectsByType<Collider>(FindObjectsSortMode.None);
            int eligible=colliders.Count(c=>c.enabled&&c.gameObject.activeInHierarchy&&(CollisionLayers.StaticBallMask&(1<<c.gameObject.layer))!=0);
            File.WriteAllText(output+"/collider-state.txt","Total colliders: "+colliders.Length+"; enabled static-ball-mask colliders: "+eligible+"; mask: "+CollisionLayers.StaticBallMask+"\n");
            if(eligible==0)
            {
                File.WriteAllText(output+"/UNAVAILABLE.txt","Saved scene has no enabled static ball colliders in edit mode. Empty raycast results do not establish visibility. Use rendered meshes or a running physics scene.\n");
                return;
            }
            var targets=new[] {
                ("portal-header-center",new Vector3(43.912f,5.30f,-.36f)),
                ("portal-header-north",new Vector3(43.912f,5.30f,1.16f)),
                ("portal-header-south",new Vector3(43.912f,5.30f,-1.88f)),
                ("upper-opening-north-top",new Vector3(44.2f,11.15f,1.05f)),
                ("upper-opening-north-base",new Vector3(44.2f,7.35f,1.05f))
            };
            var result=new List<Sightline>();
            foreach(var p in JsonUtility.FromJson<Poses>(File.ReadAllText(Arg("poses"))).cameras)
                foreach(var t in targets)
                {
                    var delta=t.Item2-p.position;
                    var hits=Physics.RaycastAll(p.position,delta.normalized,delta.magnitude-.05f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore)
                        .OrderBy(h=>h.distance).Select(h=>new HitRecord {surface=h.collider.GetComponentInParent<Surface>()?.surfaceId??h.collider.name,distance=h.distance,point=h.point}).ToArray();
                    result.Add(new Sightline {camera=p.id,landmark=t.Item1,target=t.Item2,targetDistance=delta.magnitude,interveningHits=hits});
                }
            File.WriteAllText(output+"/sightlines.json",JsonUtility.ToJson(new Sightlines{lines=result.ToArray()},true));
            File.WriteAllLines(output+"/summary.txt",result.Select(q=>q.camera+" / "+q.landmark+": "+(q.interveningHits.Length==0?"clear":q.interveningHits[0].surface+" at "+q.interveningHits[0].distance.ToString("F3")+" m")));
        }
        public static void Capture()
        {
            string output=Arg("evidence");
            if(Directory.Exists(output)) throw new InvalidOperationException("Use a fresh evidence directory.");
            Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(Arg("scene-path"));
            var view=Object.FindFirstObjectByType<GameController>().view;
            var reflection=Object.FindFirstObjectByType<PlanarFacadeReflection>();
            var report=new List<string>();
            foreach(var p in JsonUtility.FromJson<Poses>(File.ReadAllText(Arg("poses"))).cameras)
            {
                view.transform.SetPositionAndRotation(p.position,Quaternion.LookRotation(p.lookAt-p.position)*Quaternion.AngleAxis(p.roll,Vector3.forward));
                view.fieldOfView=p.fov;view.aspect=(float)p.captureWidth/p.captureHeight;view.ResetProjectionMatrix();
                var projection=view.projectionMatrix;
                projection.m02=-2*p.principalPointOffsetX;
                projection.m12=2*p.principalPointOffsetY;
                view.projectionMatrix=projection;
                float maximum=0;
                foreach(var proof in p.proof)
                {
                    var q=view.WorldToViewportPoint(proof.world);
                    maximum=Mathf.Max(maximum,Vector2.Distance(new Vector2(q.x*p.captureWidth,(1-q.y)*p.captureHeight),proof.pixel));
                }
                report.Add((maximum<.02f?"PASS ":"FAIL ")+p.id+": maximum independent projection difference "+maximum.ToString("R")+" px.");
                File.WriteAllLines(output+"/projection-verification.txt",report);
                if(maximum>=.02f) throw new InvalidOperationException("Off-center projection disagrees with the independent camera model.");
                reflection.RenderForCamera(view,p.captureWidth,p.captureHeight);
                MunicipalMaterialPreview.Capture(view,p.captureWidth,p.captureHeight,output+"/"+p.id+".png");
            }
        }
    }
}
