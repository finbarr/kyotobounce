using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2ForecourtContactDiagnostic
    {
        public static void Run()
        {
            var results = new List<string> { "mode,panel,triangle,found,pointError,distanceError,normalDot,offset" };
            var summary = new List<string>();
            var layout = StationLayout.Load();
            foreach (bool centered in new[] { false, true })
            foreach (bool fast in new[] { true, false })
            {
                string mode = (centered ? "centered" : "world") + (fast ? "-fast" : "-legacy");
                int count = 0, failures = 0;
                float maxPoint = 0, maxDistance = 0;
                foreach (var panel in layout.panels)
                {
                    if (!panel.id.StartsWith("north-forecourt-") || !panel.collision) continue;
                    var obj = new GameObject(panel.id);
                    var mesh = new Mesh();
                    var bounds = new Bounds(panel.vertices[0], Vector3.zero);
                    foreach (var v in panel.vertices) bounds.Encapsulate(v);
                    Vector3 origin = centered ? bounds.center : Vector3.zero;
                    var vertices = new Vector3[panel.vertices.Length];
                    for (int j = 0; j < vertices.Length; j++) vertices[j] = panel.vertices[j] - origin;
                    mesh.vertices = vertices; mesh.triangles = panel.triangles;
                    obj.transform.position = origin;
                    var collider = obj.AddComponent<MeshCollider>();
                    if (!fast) collider.cookingOptions &= ~MeshColliderCookingOptions.UseFastMidphase;
                    collider.sharedMesh = mesh;
                    Physics.SyncTransforms();
                    var sides = new List<int>();
                    for (int i = 0; i < panel.triangles.Length; i += 3)
                    {
                        var a = panel.vertices[panel.triangles[i]];
                        var b = panel.vertices[panel.triangles[i+1]];
                        var c = panel.vertices[panel.triangles[i+2]];
                        if (a.y != b.y || a.y != c.y) sides.Add(i);
                    }
                    for (int i = 0; i < panel.triangles.Length; i += 3)
                    {
                        var a = panel.vertices[panel.triangles[i]];
                        var b = panel.vertices[panel.triangles[i + 1]];
                        var c = panel.vertices[panel.triangles[i + 2]];
                        var cross = Vector3.Cross(b - a, c - a);
                        var normal = cross / cross.magnitude;
                        var point = a + ((b - a) + (c - a)) / 3;
                        float offset = Offset(panel, sides, i, point, normal);
                        var ray = new Ray(point + normal * offset, -normal);
                        bool found = collider.Raycast(ray, out var hit, offset * 2);
                        float pe = found ? Vector3.Distance(hit.point, point) : -1;
                        float de = found ? Mathf.Abs(hit.distance - offset) : -1;
                        float nd = found ? Vector3.Dot(hit.normal, normal) : -1;
                        count++; maxPoint = Mathf.Max(maxPoint, pe); maxDistance = Mathf.Max(maxDistance, de);
                        if (!found || pe >= .002f || nd <= .99f)
                        {
                            failures++;
                            results.Add($"{mode},{panel.id},{i / 3},{found},{pe:R},{de:R},{nd:R},{offset:R}");
                        }
                    }
                    UnityEngine.Object.DestroyImmediate(obj);
                    UnityEngine.Object.DestroyImmediate(mesh);
                }
                summary.Add($"{mode}: {count} faces; failures={failures}; max point error={maxPoint:R}; max distance error={maxDistance:R}");
            }
            string output = null;
            foreach (var arg in Environment.GetCommandLineArgs())
                if (arg.StartsWith("--kyoto-evidence=")) output = arg.Substring("--kyoto-evidence=".Length);
            if (string.IsNullOrEmpty(output)) throw new ArgumentException("An explicit --kyoto-evidence directory is required.");
            Directory.CreateDirectory(output);
            File.WriteAllLines(output + "/collider-modes.csv", results);
            File.WriteAllLines(output + "/collider-modes.txt", summary);
            foreach (var line in summary) Debug.Log(line);
        }

        static float Offset(StationLayout.Panel panel, List<int> sides, int target, Vector3 point, Vector3 normal)
        {
            // These diagnostic inputs are planar extrusions. No part of their
            // own solid can intervene outside an upper/lower horizontal face.
            if (Mathf.Abs(normal.y) > .999999f) return .1f;
            float result = .1f;
            foreach (int i in sides)
            {
                if (i == target) continue;
                var a = panel.vertices[panel.triangles[i]];
                var b = panel.vertices[panel.triangles[i + 1]];
                var c = panel.vertices[panel.triangles[i + 2]];
                if (point.x+.1001f < Mathf.Min(a.x,Mathf.Min(b.x,c.x)) || point.x-.1001f > Mathf.Max(a.x,Mathf.Max(b.x,c.x))
                    || point.z+.1001f < Mathf.Min(a.z,Mathf.Min(b.z,c.z)) || point.z-.1001f > Mathf.Max(a.z,Mathf.Max(b.z,c.z))) continue;
                var e1 = b - a; var e2 = c - a; var p = Vector3.Cross(normal, e2);
                float det = Vector3.Dot(e1, p); if (Mathf.Abs(det) < 1e-12f) continue;
                var s = point - a; float u = Vector3.Dot(s, p) / det; if (u < 0 || u > 1) continue;
                var q = Vector3.Cross(s, e1); float v = Vector3.Dot(normal, q) / det; if (v < 0 || u + v > 1) continue;
                float d = Vector3.Dot(e2, q) / det; if (d > 1e-5f) result = Mathf.Min(result, d * .5f);
            }
            return result;
        }
    }
}
