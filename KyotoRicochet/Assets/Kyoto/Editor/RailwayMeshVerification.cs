using System;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class RailwayMeshVerification
    {
        [Serializable] public class Report
        {
            public int meshes,sourceTriangles,collisionTriangles;
            public float maximumEdge;
            public double sourceArea,collisionArea;
        }
        static double Dot(Vector3 a,Vector3 b)=>(double)a.x*b.x+(double)a.y*b.y+(double)a.z*b.z;
        static bool Contains(Vector3 p,Vector3 a,Vector3 b,Vector3 c,Vector3 normal)
        {
            var u=b-a;var v=c-a;var q=p-a;
            if(Math.Abs(Dot(q,normal))>.0001)return false;
            double uu=Dot(u,u),uv=Dot(u,v),vv=Dot(v,v),qu=Dot(q,u),qv=Dot(q,v),den=uu*vv-uv*uv;
            if(den<=1e-16)return false;
            double s=(qu*vv-qv*uv)/den,t=(qv*uu-qu*uv)/den;
            return s>=-.00002&&t>=-.00002&&s+t<=1.00002;
        }
        public static Report Check(Transform root,StationLayout layout,string idFragment="railway-subgrade",string role=null)
        {
            var report=new Report();
            foreach(var source in layout.panels)
            {
                if(!source.collision||!source.id.Contains(idFragment)||(role!=null&&source.role!=role))continue;
                var child=root.Find(source.id);var collider=child?child.GetComponent<MeshCollider>():null;
                if(!collider)throw new Exception("Missing railway collider: "+source.id);
                var mesh=collider.sharedMesh;var points=mesh.vertices;var indices=mesh.triangles;
                for(int i=0;i<points.Length;i++)points[i]=child.TransformPoint(points[i]);
                report.meshes++;report.sourceTriangles+=source.triangles.Length/3;report.collisionTriangles+=indices.Length/3;
                double sourceArea=0,collisionArea=0;
                for(int i=0;i<source.triangles.Length;i+=3)
                {
                    var a=source.vertices[source.triangles[i]];var b=source.vertices[source.triangles[i+1]];var c=source.vertices[source.triangles[i+2]];
                    sourceArea+=Vector3.Cross(b-a,c-a).magnitude*.5;
                }
                for(int i=0;i<indices.Length;i+=3)
                {
                    var a=points[indices[i]];var b=points[indices[i+1]];var c=points[indices[i+2]];
                    var cross=Vector3.Cross(b-a,c-a);collisionArea+=cross.magnitude*.5;
                    report.maximumEdge=Mathf.Max(report.maximumEdge,Mathf.Max((b-a).magnitude,Mathf.Max((c-b).magnitude,(a-c).magnitude)));
                    bool contained=false;
                    for(int j=0;j<source.triangles.Length&&!contained;j+=3)
                    {
                        var sa=source.vertices[source.triangles[j]];var sb=source.vertices[source.triangles[j+1]];var sc=source.vertices[source.triangles[j+2]];
                        var normal=Vector3.Cross(sb-sa,sc-sa).normalized;
                        contained=Vector3.Dot(normal,cross.normalized)>.9999f
                            &&Contains(a,sa,sb,sc,normal)&&Contains(b,sa,sb,sc,normal)&&Contains(c,sa,sb,sc,normal);
                    }
                    if(!contained)throw new Exception("Refined collision leaves an authored face or reverses its winding: "+source.id);
                }
                if(Math.Abs(sourceArea-collisionArea)>sourceArea*.00001)throw new Exception("Railway surface area changed");
                report.sourceArea+=sourceArea;report.collisionArea+=collisionArea;
            }
            if(report.meshes==0||report.maximumEdge>8.0001f)throw new Exception("Railway refinement is missing");
            return report;
        }
    }
}
