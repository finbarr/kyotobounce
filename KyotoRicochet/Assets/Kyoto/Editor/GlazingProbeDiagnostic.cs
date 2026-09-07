using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto.Editor
{
    // A comparison on identical meshes and query settings. No geometry or
    // physics parameters are altered by this diagnostic.
    public static class GlazingProbeDiagnostic
    {
        public static void Run()
        {
            var layout=StationLayout.Load();var root=new GameObject("Glazing probe diagnostic");
            StationWorld.Create(root.transform,layout);Physics.SyncTransforms();
            var lines=new List<string>{"panel,sign,old_own_hit,diagonal_center_own_hit,old_hit,new_hit,old_x,old_y,old_z,new_x,new_y,new_z"};
            int count=0,oldFailures=0,newFailures=0,regressions=0,improvements=0;
            foreach(var p in layout.panels)
            {
                if(!p.id.StartsWith("canopy-glazing-west-")||!string.IsNullOrEmpty(p.role)||p.vertices.Length!=8||p.triangles.Length!=36)continue;
                if(p.triangles[0]!=0||p.triangles[1]!=2||p.triangles[2]!=1||p.triangles[3]!=4||p.triangles[4]!=5||p.triangles[5]!=6)continue;
                var normal=Vector3.Cross(p.vertices[1]-p.vertices[0],p.vertices[2]-p.vertices[0]);normal/=normal.magnitude;
                // Both skins share this diagonal. The midpoint lies on the
                // actual broad faces, including a warped quad's common edge.
                var center=(p.vertices[0]+p.vertices[2]+p.vertices[4]+p.vertices[6])*.25f;
                var oldNormal=p.contactProbeNormal.normalized;
                foreach(float sign in new[]{-1f,1f})
                {
                    bool oldHit=Physics.SphereCast(p.contactProbePoint+oldNormal*(sign*.25f),.025f,-oldNormal*sign,out var oldContact,.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    bool newHit=Physics.SphereCast(center+normal*(sign*.25f),.025f,-normal*sign,out var newContact,.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                    bool oldOwn=oldHit&&oldContact.collider.name==p.id,newOwn=newHit&&newContact.collider.name==p.id;
                    count++;if(!oldOwn)oldFailures++;if(!newOwn)newFailures++;if(oldOwn&&!newOwn)regressions++;if(!oldOwn&&newOwn)improvements++;
                    var q=p.contactProbePoint;
                    lines.Add(FormattableString.Invariant($"{p.id},{sign},{oldOwn},{newOwn},{(oldHit?oldContact.collider.name:"none")},{(newHit?newContact.collider.name:"none")},{q.x:R},{q.y:R},{q.z:R},{center.x:R},{center.y:R},{center.z:R}"));
                }
            }
            const string output="../artifacts/phase2/west-flare-grid/probe-diagnostic-03-normalized";Directory.CreateDirectory(output);
            var raw=Resources.Load<TextAsset>("StationLayout").text;File.WriteAllText(output+"/layout-used.json",raw);
            string hash;using(var sha=SHA256.Create())hash=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw))).Replace("-","").ToLowerInvariant();
            File.WriteAllLines(output+"/casts.csv",lines);
            string result=$"layout_sha256={hash}\nQueries={count}; triangle-incenter failures={oldFailures}; diagonal-center failures={newFailures}; improvements={improvements}; regressions={regressions}\nIdentical meshes, 25 mm sphere, 250 mm offset, 500 mm travel and first-owner requirement.\nDiagnostic only; full geometry, route and glass suites remain required.";
            File.WriteAllText(output+"/summary.txt",result);Debug.Log(result);
        }
    }
}
