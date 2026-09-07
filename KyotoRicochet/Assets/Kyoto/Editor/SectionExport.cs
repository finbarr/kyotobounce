using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto.Editor
{
    // Cuts the generated Unity render meshes and real collider definitions.
    // Nothing behind the plane is projected into these sections.
    public static class SectionExport
    {
        [Serializable] public class Segment {public float x0,y0,x1,y1;public string kind,id;}
        [Serializable] public class Cut {public string id,title;public int axis;public float coordinate;public List<Segment> segments=new List<Segment>();}
        [Serializable] public class Export {public string layout_sha256,layoutSourcePath,source,status;public float stationTimeSeconds,capsule_max_chord_error_m;public List<Cut> cuts=new List<Cut>();}
        [Serializable] sealed class CutSettings {public List<Cut> cuts;}
        static readonly Vector3[] cube={new Vector3(-.5f,-.5f,-.5f),new Vector3(.5f,-.5f,-.5f),new Vector3(.5f,.5f,-.5f),new Vector3(-.5f,.5f,-.5f),new Vector3(-.5f,-.5f,.5f),new Vector3(.5f,-.5f,.5f),new Vector3(.5f,.5f,.5f),new Vector3(-.5f,.5f,.5f)};
        static readonly int[] cubeTriangles={0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7};
        public static void Run()
        {
            string Argument(string name)
            {
                string prefix="--kyoto-"+name+"=";
                var value=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
                return value==null?null:value.Substring(prefix.Length);
            }
            string path=Argument("layout-candidate")??"../art-source/station-layout.json";
            string directory=Argument("evidence")??"../artifacts/phase2/architecture/sections";
            if(Directory.Exists(directory)&&Directory.GetFileSystemEntries(directory).Length>0)
                throw new InvalidOperationException("Use a fresh section evidence directory.");
            var text=File.ReadAllText(path);var layout=JsonUtility.FromJson<StationLayout>(text);
            var output=new Export {layoutSourcePath=Path.GetFullPath(path),stationTimeSeconds=0,
                source="Actual StationWorld meshes, BoxCollider, MeshCollider and faceted CapsuleCollider definitions",
                status="Unregistered architectural draft; true plane cuts, not projected elevations"};
            using(var sha=SHA256.Create())output.layout_sha256=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant();
            output.cuts.Add(new Cut{id="longitudinal-z-minus16",title="A–A · Great Staircase / atrium",axis=2,coordinate=-16});
            output.cuts.Add(new Cut{id="transverse-x-zero",title="B–B · central atrium / asymmetric canopy",axis=0,coordinate=0});
            output.cuts.Add(new Cut{id="transverse-x-minus90",title="C–C · lower staircase / north escalators",axis=0,coordinate=-90});
            output.cuts.Add(new Cut{id="transverse-x-minus135",title="D–D · upper stairs / paired bank / side route",axis=0,coordinate=-135});
            output.cuts.Add(new Cut{id="plan-y-1p2",title="Ground plan · entrance / northern forecourt",axis=1,coordinate=1.2f});
            string cutsPath=Argument("section-cuts");
            if(cutsPath!=null)output.cuts=JsonUtility.FromJson<CutSettings>(File.ReadAllText(cutsPath)).cuts;
            if(output.cuts==null||output.cuts.Count==0)throw new InvalidOperationException("At least one section is required.");
            var ids=new HashSet<string>();
            foreach(var cut in output.cuts)
            {
                if(string.IsNullOrEmpty(cut.id)||!ids.Add(cut.id)||cut.axis<0||cut.axis>2||float.IsNaN(cut.coordinate)||float.IsInfinity(cut.coordinate))
                    throw new InvalidOperationException("Invalid or duplicated section definition.");
                cut.segments=new List<Segment>();
            }
            var root=new GameObject("Section source");var appearance=new Dictionary<string,Material>();
            var material=new Material(Shader.Find("Universal Render Pipeline/Lit"));
            foreach(var b in layout.boxes)appearance[b.material]=material;
            foreach(var b in layout.beams)appearance[b.material]=material;
            foreach(var p in layout.panels)appearance[p.material]=material;
            StationWorld.Create(root.transform,layout,true,true,appearance);
            foreach(var lane in root.GetComponentsInChildren<MovingEscalator>())lane.SetTime(0);
            Physics.SyncTransforms();
            foreach(var filter in root.GetComponentsInChildren<MeshFilter>())
                AddMesh(output,filter.sharedMesh,filter.transform.localToWorldMatrix,"appearance",filter.name);
            foreach(var collider in root.GetComponentsInChildren<Collider>())
            {
                string kind=collider.gameObject.layer==CollisionLayers.WalkingAssist?"walking-assist":collider.gameObject.layer==CollisionLayers.BallStairs?"ball-stairs":"shared-collision";
                if(collider is MeshCollider mesh)AddMesh(output,mesh.sharedMesh,mesh.transform.localToWorldMatrix,kind,mesh.name);
                else if(collider is BoxCollider box)
                    Add(output,cube,cubeTriangles,box.transform.localToWorldMatrix*Matrix4x4.TRS(box.center,Quaternion.identity,box.size),kind,box.name);
                else if(collider is CapsuleCollider capsule)
                {
                    var verts=new List<Vector3>();var indices=new List<int>();const int around=64,hemisphere=16;
                    float length=Mathf.Max(0,capsule.height*.5f-capsule.radius);
                    for(int ring=0;ring<=2*hemisphere+1;ring++)
                    {
                        bool top=ring>hemisphere;
                        float angle=top?(ring-hemisphere-1)*Mathf.PI/(2*hemisphere):-Mathf.PI*.5f+ring*Mathf.PI/(2*hemisphere);
                        float y=(top?length:-length)+capsule.radius*Mathf.Sin(angle),r=capsule.radius*Mathf.Cos(angle);
                        for(int j=0;j<around;j++)verts.Add(new Vector3(r*Mathf.Cos(j*2*Mathf.PI/around),y,r*Mathf.Sin(j*2*Mathf.PI/around)));
                    }
                    for(int ring=0;ring<2*hemisphere+1;ring++)for(int j=0;j<around;j++)
                    {int a=ring*around+j,b=ring*around+(j+1)%around,c=a+around,d=b+around;indices.AddRange(new[]{a,b,d,a,d,c});}
                    var axis=capsule.direction==0?Quaternion.FromToRotation(Vector3.up,Vector3.right):capsule.direction==2?Quaternion.FromToRotation(Vector3.up,Vector3.forward):Quaternion.identity;
                    Add(output,verts.ToArray(),indices.ToArray(),capsule.transform.localToWorldMatrix*Matrix4x4.TRS(capsule.center,axis,Vector3.one),kind,capsule.name);
                    float scale=Mathf.Max(capsule.transform.lossyScale.x,capsule.transform.lossyScale.y,capsule.transform.lossyScale.z);
                    // Sum the azimuth and latitude chord deficits, conservatively
                    // covering the triangulated two-dimensional spherical grid.
                    output.capsule_max_chord_error_m=Mathf.Max(output.capsule_max_chord_error_m,2*scale*capsule.radius*(1-Mathf.Cos(Mathf.PI/around)));
                }
                else throw new InvalidOperationException("Unsupported section collider "+collider.GetType().Name);
            }
            Directory.CreateDirectory(directory);
            File.WriteAllText(Path.Combine(directory,"unity-plane-cuts.json"),JsonUtility.ToJson(output,true));
            File.WriteAllText(Path.Combine(directory,"layout-used.json"),text);
            foreach(var cut in output.cuts)
            {if(cut.segments.Count==0)throw new Exception("Empty section "+cut.id);Debug.Log("KYOTO_SECTION "+cut.id+" "+cut.segments.Count+" segments");}
            UnityEngine.Object.DestroyImmediate(root);UnityEngine.Object.DestroyImmediate(material);
        }
        static void AddMesh(Export output,Mesh mesh,Matrix4x4 transform,string kind,string id)
        {if(mesh)Add(output,mesh.vertices,mesh.triangles,transform,kind,id);}
        static void Add(Export output,Vector3[] local,int[] triangles,Matrix4x4 matrix,string kind,string id)
        {
            var vertices=new Vector3[local.Length];var bounds=new Bounds(matrix.MultiplyPoint3x4(local[0]),Vector3.zero);
            for(int i=0;i<local.Length;i++){vertices[i]=matrix.MultiplyPoint3x4(local[i]);bounds.Encapsulate(vertices[i]);}
            foreach(var cut in output.cuts)
            {
                if(bounds.min[cut.axis]>cut.coordinate||bounds.max[cut.axis]<cut.coordinate)continue;
                for(int i=0;i<triangles.Length;i+=3)
                {
                    var a=vertices[triangles[i]];var b=vertices[triangles[i+1]];var c=vertices[triangles[i+2]];
                    float da=a[cut.axis]-cut.coordinate,db=b[cut.axis]-cut.coordinate,dc=c[cut.axis]-cut.coordinate;
                    const float eps=.000001f;
                    if((da>eps&&db>eps&&dc>eps)||(da<-eps&&db<-eps&&dc<-eps))continue;
                    if(Mathf.Abs(da)<eps&&Mathf.Abs(db)<eps&&Mathf.Abs(dc)<eps)continue;
                    Vector3 p=default,q=default;int count=0;
                    void Point(Vector3 v)
                    {if(count==0){p=v;count=1;}else if(count==1&&(v-p).sqrMagnitude>1e-12f){q=v;count=2;}}
                    void Edge(Vector3 v,Vector3 w,float dv,float dw)
                    {if(Mathf.Abs(dv)<eps)Point(v);if(dv*dw<0)Point(Vector3.LerpUnclamped(v,w,dv/(dv-dw)));}
                    Edge(a,b,da,db);Edge(b,c,db,dc);Edge(c,a,dc,da);
                    if(count==2){int horizontal=cut.axis==0?2:0,vertical=cut.axis==1?2:1;cut.segments.Add(new Segment {x0=p[horizontal],y0=p[vertical],x1=q[horizontal],y1=q[vertical],kind=kind,id=id});}
                }
            }
        }
    }
}
