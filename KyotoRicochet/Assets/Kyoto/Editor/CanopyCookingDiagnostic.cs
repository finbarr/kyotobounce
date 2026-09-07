using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Kyoto.Editor
{
    // Isolate thin facade closures from the walking scene to distinguish mesh
    // cooking losses from ray origins occluded by another face of the same solid.
    public static class CanopyCookingDiagnostic
    {
        public static void Run()
        {
            var lines=new List<string>();
            string[] ids={"canopy-glazing-001-02-junction","canopy-glazing-004-37-junction","canopy-glazing-009-48-junction","canopy-glazing-009-49-junction"};
            foreach(var p in StationLayout.Load().panels)
            {
                if(Array.IndexOf(ids,p.id)<0)continue;
                var mesh=new Mesh();mesh.vertices=p.vertices;mesh.triangles=p.triangles;mesh.RecalculateBounds();
                for(int option=0;option<4;option++)
                {
                    var obj=new GameObject(p.id);var collider=obj.AddComponent<MeshCollider>();
                    if((option&1)!=0)collider.cookingOptions&=~MeshColliderCookingOptions.WeldColocatedVertices;
                    if((option&2)!=0)collider.cookingOptions&=~MeshColliderCookingOptions.EnableMeshCleaning;
                    collider.sharedMesh=mesh;Physics.SyncTransforms();
                    foreach(float offset in new[]{.1f,.03f,.01f,.003f,.001f})
                    {
                        int passed=0;var failures=new List<string>();
                        for(int i=0;i<p.triangles.Length;i+=3)
                        {
                            var a=p.vertices[p.triangles[i]];var b=p.vertices[p.triangles[i+1]];var c=p.vertices[p.triangles[i+2]];
                            var cross=Vector3.Cross(b-a,c-a);var n=cross/cross.magnitude;var point=a+((b-a)+(c-a))/3;
                            bool found=collider.Raycast(new Ray(point+n*offset,-n),out var hit,offset*2);
                            bool good=found&&Vector3.Distance(hit.point,point)<.002f&&Vector3.Dot(hit.normal,n)>.99f;
                            if(good)passed++;else failures.Add($"{i/3}:found={found},distance={(found?Vector3.Distance(hit.point,point):-1):R},dot={(found?Vector3.Dot(hit.normal,n):-1):R}");
                        }
                        lines.Add($"{p.id};options={collider.cookingOptions};offset={offset:R};passed={passed}/{p.triangles.Length/3};failures={string.Join("|",failures)}");
                    }
                    UnityEngine.Object.DestroyImmediate(obj);
                }
                UnityEngine.Object.DestroyImmediate(mesh);
            }
            string path=Path.GetFullPath("../artifacts/phase2/open-west-canopy/cooking-diagnostic.txt");
            File.WriteAllLines(path,lines);Debug.Log("CANOPY_COOKING_DIAGNOSTIC_COMPLETE "+path);EditorApplication.Exit(0);
        }
    }
}
