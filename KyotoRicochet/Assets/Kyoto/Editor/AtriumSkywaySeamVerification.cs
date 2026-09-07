using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    // Probe the occupied strip beside the glass; centroid tests cannot detect missing floor.
    public static class AtriumSkywaySeamVerification
    {
        static string Arg(string name)
        {
            string prefix = "--kyoto-" + name + "=";
            string value = Array.Find(Environment.GetCommandLineArgs(), a => a.StartsWith(prefix));
            return value == null ? throw new ArgumentException("Missing " + prefix) : value.Substring(prefix.Length);
        }

        public static void Run()
        {
            string text = File.ReadAllText(Arg("layout-candidate")), output = Arg("evidence");
            if (Directory.Exists(output) && Directory.GetFileSystemEntries(output).Length > 0)
                throw new InvalidOperationException("Use a fresh seam evidence directory.");
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var root = new GameObject("Skyway floor seam verification");
            var layout = JsonUtility.FromJson<StationLayout>(text);
            StationWorld.Create(root.transform, layout);
            var ball = new GameObject("Production seam drop").AddComponent<BallBody>();
            ball.SetProfile(BallProfile.Phase2Default);
            Physics.SyncTransforms();
            const float floor = 45.2f, center = 2.326107f, glassOffset = 1.28f, glassHalfThickness = .0175f;
            float insideGlass = glassOffset - glassHalfThickness - ball.Profile.radius_m - .004f;
            var report = new List<string> { "Scoped production-ball drops beside Skyway glazing; no normal-input or photographic acceptance." };
            using (var sha = SHA256.Create())
                report.Add("layout_sha256=" + BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-", "").ToLowerInvariant());
            var trace = new List<string> { "case,time,x,y,z,vx,vy,vz" };
            string firstSurface = null;
            bool baseHit = false;
            var barrierContacts = new HashSet<string>();
            ball.Impact += (surface, point, speed) =>
            {
                if (firstSurface == null) firstSurface = surface.surfaceId;
                if (surface.surfaceId.StartsWith("skyway-glazing-base-")) baseHit = true;
                if (surface.surfaceId != "skyway-circulation-floor") barrierContacts.Add(surface.surfaceId);
            };
            int failures = 0;
            var positions = new SortedSet<float> { -60f, -20f, 20f, 55f, 66f };
            if (Array.IndexOf(Environment.GetCommandLineArgs(), "--kyoto-seam-sweep") >= 0)
            {
                for (float x = -74; x <= 62; x += 4) positions.Add(x);
                foreach (var panel in layout.panels)
                {
                    if (!panel.id.StartsWith("skyway-glazing-base-")) continue;
                    var knots = new SortedSet<float>();
                    foreach (var vertex in panel.vertices) knots.Add(vertex.x);
                    var list = new List<float>(knots);
                    for (int i = 1; i < list.Count-1; i += 7)
                        if (list[i] > -74 && list[i] < 62)
                        { positions.Add(list[i]-.001f); positions.Add(list[i]+.001f); }
                }
                report.Add("Dense corridor sweep including both sides of sampled authored channel seams; positions=" + positions.Count);
            }
            string single = Array.Find(Environment.GetCommandLineArgs(), arg => arg.StartsWith("--kyoto-seam-x="));
            if (single != null)
            {
                positions.Clear();
                positions.Add(float.Parse(single.Substring("--kyoto-seam-x=".Length), System.Globalization.CultureInfo.InvariantCulture));
                report.Add("Single-position diagnostic.");
            }
            foreach (float x in positions)
            foreach (int side in new[] { -1, 0, 1 })
            {
                Vector3 start = new Vector3(x, floor + .3f, center + side * insideGlass);
                bool cast = Physics.SphereCast(start, ball.Profile.radius_m, Vector3.down, out var hit, .6f,
                    CollisionLayers.BallMask, QueryTriggerInteraction.Ignore);
                firstSurface = null; baseHit = false;
                ball.Launch(start, Vector3.zero, Vector3.zero);
                Physics.SyncTransforms();
                float minimumY = start.y;
                for (int i = 0; i < 270; i++)
                {
                    ball.BeforeStep(BallBody.Step);
                    minimumY = Mathf.Min(minimumY, ball.Body.position.y);
                    if (i % 9 == 0)
                    {
                        var p = ball.Body.position; var v = ball.Velocity;
                        trace.Add(FormattableString.Invariant($"{x}_{side},{ball.Clock:R},{p.x:R},{p.y:R},{p.z:R},{v.x:R},{v.y:R},{v.z:R}"));
                    }
                }
                string expectedBase = side > 0 ? "skyway-glazing-base-north"
                    : x > 65.9744f ? "skyway-glazing-base-south-east" : "skyway-glazing-base-south-west";
                bool support = cast && (hit.collider.name == "skyway-circulation-floor"
                    || (side != 0 && hit.collider.name == expectedBase));
                bool pass = support && firstSurface == hit.collider.name
                    && Vector3.Dot(hit.normal, Vector3.up) > .99f && hit.point.y >= floor-.002f && hit.point.y <= floor+.2f
                    && minimumY >= floor + ball.Profile.radius_m - .002f
                    && ball.ContactBudgetExhaustions == 0;
                if (!pass) failures++;
                report.Add(FormattableString.Invariant($"{(pass ? "PASS" : "FAIL")} X={x:R} side={side} Z={start.z:R}: cast={(cast ? hit.collider.name : "none")}, point={hit.point:F7}, normal={hit.normal:F7}, distance={hit.distance:R}, first={firstSurface ?? "none"}, minimumY={minimumY:R}, budgets={ball.ContactBudgetExhaustions}"));
                if (side != 0)
                {
                    firstSurface = null; baseHit = false; barrierContacts.Clear();
                    ball.Launch(new Vector3(x, floor+ball.Profile.radius_m+.002f, center), Vector3.forward*(side*2f), Vector3.zero);
                    Physics.SyncTransforms();
                    float maximumOffset = 0; minimumY = ball.Body.position.y;
                    for (int i = 0; i < 270; i++)
                    {
                        ball.BeforeStep(BallBody.Step);
                        minimumY = Mathf.Min(minimumY, ball.Body.position.y);
                        maximumOffset = Mathf.Max(maximumOffset, Mathf.Abs(ball.Body.position.z-center));
                        if (i % 9 == 0)
                        {
                            var p = ball.Body.position; var v = ball.Velocity;
                            trace.Add(FormattableString.Invariant($"lateral_{x}_{side},{ball.Clock:R},{p.x:R},{p.y:R},{p.z:R},{v.x:R},{v.y:R},{v.z:R}"));
                        }
                    }
                    // A visible base channel must stop floor-level travel under the glass.
                    // At the east connection a retained crossing chord can stop the ball
                    // before the new base. Require an actual barrier impact and containment,
                    // rather than falsely failing an already-contained throw there.
                    bool retained = barrierContacts.Count > 0 && minimumY >= floor+ball.Profile.radius_m-.002f
                        && maximumOffset <= glassOffset-.07f-ball.Profile.radius_m+.003f
                        && ball.ContactBudgetExhaustions == 0;
                    if (!retained) failures++;
                    report.Add(FormattableString.Invariant($"{(retained ? "PASS" : "FAIL")} lateral X={x:R} side={side}: baseHit={baseHit}, barriers={string.Join(";",barrierContacts)}, minimumY={minimumY:R}, maximumOffset={maximumOffset:R}, budgets={ball.ContactBudgetExhaustions}"));
                }
            }
            Directory.CreateDirectory(output);
            File.WriteAllLines(Path.Combine(output, "verification.txt"), report);
            File.WriteAllLines(Path.Combine(output, "drops.csv"), trace);
            foreach (string line in report) Debug.Log(line);
            UnityEngine.Object.DestroyImmediate(ball.gameObject);
            UnityEngine.Object.DestroyImmediate(root);
            if (failures > 0) throw new InvalidOperationException(failures + " Skyway seam drops failed.");
        }
    }
}
