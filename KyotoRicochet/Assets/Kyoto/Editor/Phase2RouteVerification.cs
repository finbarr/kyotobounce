using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2RouteVerification
    {
        [Serializable] sealed class RetainedProbe { public string id,surfaceId; public Vector3 point,normal; }
        [Serializable] sealed class RetainedProbes { public string sourceSha256; public RetainedProbe[] probes; }
        // Exercise actual CharacterController.Move against the complete shared world.
        // Place is used once at each independent route's start, never at a waypoint.
        public static void Run()=>RunCandidate(null);
        public static void RunCandidate(string candidatePath)
        {
            string layoutText=candidatePath==null?Resources.Load<TextAsset>("StationLayout").text:File.ReadAllText(candidatePath);
            var layout=JsonUtility.FromJson<StationLayout>(layoutText);
            if(layout.schemaVersion!=1||layout.units!="meters")throw new InvalidOperationException("Unsupported candidate layout schema or units.");
            var root=new GameObject("Complete layout verification");StationWorld.Create(root.transform,layout);
            var walker=new GameObject("Route walker").AddComponent<FirstPersonWalker>();
            Physics.SyncTransforms();
            bool glassContactsOnly=Array.IndexOf(Environment.GetCommandLineArgs(),"--kyoto-glass-contacts-only")>=0;
            bool panelContactsOnly=glassContactsOnly||Array.IndexOf(Environment.GetCommandLineArgs(),"--kyoto-panel-contacts-only")>=0;
            bool walkingOnly=Array.IndexOf(Environment.GetCommandLineArgs(),"--kyoto-walking-only")>=0;
            bool releasesOnly=Array.IndexOf(Environment.GetCommandLineArgs(),"--kyoto-releases-only")>=0;
            string routeArgument=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-route-prefix="));
            if(walkingOnly&&panelContactsOnly)throw new InvalidOperationException("Walking-only and panel-only checks are mutually exclusive.");
            if(releasesOnly&&(walkingOnly||panelContactsOnly))throw new InvalidOperationException("Release-only verification cannot be combined with other scoped checks.");
            var selectedRoutes=panelContactsOnly||releasesOnly?Array.Empty<StationLayout.Route>():layout.routes;
            if(routeArgument!=null)
            {
                if(!walkingOnly)throw new InvalidOperationException("A route prefix requires explicitly scoped walking-only verification.");
                string prefix=routeArgument.Substring("--kyoto-route-prefix=".Length);
                if(prefix.Length==0)throw new InvalidOperationException("Empty route prefix.");
                selectedRoutes=Array.FindAll(selectedRoutes,r=>r.id.StartsWith(prefix,StringComparison.Ordinal));
                if(selectedRoutes.Length==0)throw new InvalidOperationException("No walking routes match "+prefix);
            }
            var report=new List<string>{glassContactsOnly
                ?"Glass sphere contacts only; solid-face probes, walking routes and releases are not rerun. Geometry remains a draft pending photo registration."
                :panelContactsOnly
                ?"Panel contact verification only; walking routes and releases are not rerun. Geometry remains a draft pending photo registration."
                :"Complete-layout traversal; geometry remains a draft pending photo registration."};
            using(var sha=SHA256.Create())report.Add("layout_sha256="+BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(layoutText))).Replace("-","").ToLowerInvariant());
            if(walkingOnly)report[0]="SCOPED walking-only verification: "+selectedRoutes.Length+" routes; release, solid-face and glass probes are not run.";
            if(releasesOnly)report[0]="SCOPED release/live-prediction verification; walking, solid-face and glass probes are not rerun.";
            var trace=new List<string>{"route,waypoint,seconds,x,y,z,expected_y,grounded"};
            int failed=0;const float dt=1f/90;
            foreach(var route in selectedRoutes)
            {
                walker.Place(route.points[0]+Vector3.up*.03f);float clock=0,distance=0;bool passed=true;
                for(int j=1;j<route.points.Length;j++)
                {
                    Vector3 target=route.points[j];float elapsed=0,stuck=0;
                    float allowance=Vector3.Distance(walker.transform.position,target)/walker.WalkSpeed*3+5;
                    while(true)
                    {
                        Vector3 before=walker.transform.position,delta=target-before;delta.y=0;
                        if(delta.magnitude<.035f)break;
                        float yaw=Mathf.Atan2(delta.x,delta.z)*Mathf.Rad2Deg;
                        StationMotion.Advance(root.scene,dt);Physics.SyncTransforms();
                        walker.Move(Vector2.up*Mathf.Min(1,delta.magnitude/(walker.WalkSpeed*dt)),yaw,false,dt);
                        Vector3 eyeDelta=walker.transform.position-before;
                        // The walking capsule ignores stair treads for smoothing. Its
                        // camera still must never cross a tread, riser or underside.
                        if(eyeDelta.sqrMagnitude>1e-10f&&Physics.SphereCast(before+Vector3.up*walker.EyeHeight,.09f,eyeDelta.normalized,
                            out var headHit,eyeDelta.magnitude,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore))
                        {
                            report.Add($"FAIL {route.id} waypoint={j} camera intersects {headHit.collider.name} at {headHit.point:F4}");passed=false;break;
                        }
                        float moved=Vector3.Distance(before,walker.transform.position);distance+=moved;
                        stuck=moved<.001f?stuck+dt:0;elapsed+=dt;clock+=dt;
                        if((int)(clock/dt)%18==0)
                        {var p=walker.transform.position;trace.Add(FormattableString.Invariant($"{route.id},{j},{clock:R},{p.x:R},{p.y:R},{p.z:R},{target.y:R},{walker.Grounded}"));}
                        if(stuck>1.2f||elapsed>allowance||walker.transform.position.y<target.y-8)
                        {
                            passed=false;
                            var nearby=Physics.OverlapCapsule(walker.transform.position+Vector3.up*.25f,walker.transform.position+Vector3.up*1.55f,.30f,CollisionLayers.WalkingMask);
                            report.Add($"FAIL {route.id} waypoint={j} target={target:F4} actual={walker.transform.position:F4} stalled={stuck:F2}s nearby="+string.Join(";",Array.ConvertAll(nearby,c=>c.name)));
                            break;
                        }
                    }
                    if(!passed)break;
                    // Stop at every sampled location, including every landing transition.
                    for(int pause=0;pause<18;pause++){StationMotion.Advance(root.scene,dt);Physics.SyncTransforms();walker.Move(Vector2.zero,j*45,false,dt);clock+=dt;}
                    if(Mathf.Abs(walker.transform.position.y-target.y)>.28f)
                    {report.Add($"FAIL {route.id} waypoint={j} wrong elevation expected={target.y:F4} actual={walker.transform.position:F4}");passed=false;break;}
                }
                if(passed)report.Add($"PASS {route.id} {route.points.Length} waypoints, {distance:F2}m continuous capsule motion, {clock:F2}s simulated, final={walker.transform.position:F4}");
                else failed++;
            }
            if(walkingOnly)
            {
                string argument=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-evidence="));
                if(argument==null)throw new InvalidOperationException("Walking-only verification requires an explicit evidence directory.");
                string directory=argument.Substring("--kyoto-evidence=".Length);
                if(Directory.Exists(directory)&&Directory.GetFileSystemEntries(directory).Length>0)throw new InvalidOperationException("Use a fresh walking evidence directory.");
                Directory.CreateDirectory(directory);
                File.WriteAllLines(directory+"/walking-verification.txt",report);
                File.WriteAllLines(directory+"/walking-trace.csv",trace);
                File.WriteAllText(directory+"/layout-used.json",layoutText);
                foreach(var line in report)Debug.Log(line);
                UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(root);
                if(failed>0)throw new Exception(failed+" selected walking routes failed.");
                return;
            }
            var releaseReport=new List<string>{"area,release_x,release_y,release_z,clear,max_position_error_m,max_rotation_error_degrees,live_contact_budget,prediction_contact_budget"};
            var locations=new Dictionary<string,Vector3>();
            foreach(string id in new[]{"daikaidan-flight-01","daikaidan-flight-06","daikaidan-flight-12"})
            {
                var f=Array.Find(layout.flights,x=>x.id==id);var c=f.contours[f.contours.Length-1].points;var p=c[21];
                locations[id+" landing"]=new Vector3(p.x-.55f,f.baseElevation+(f.contours.Length-1)*f.rise+.03f,p.y);
            }
            // Named centerline anchors remain valid when slabs are merged and
            // the bridge is oblique; an axis-aligned box is not its route.
            locations["skyway west"]=layout.skyway.northTurn+new Vector3(3,.03f,0);
            locations["skyway east"]=layout.skyway.northTurn+new Vector3(layout.skyway.straightLength-3,.03f,0);
            locations["skyway transverse bridge"]=(layout.skyway.westPortal+layout.skyway.northTurn)*.5f+Vector3.up*.03f;
            var rooftopRoute=Array.Find(layout.routes,r=>r.id=="full-stair-ascent");
            if(rooftopRoute==null)throw new InvalidOperationException("Missing named full-stair-ascent route for rooftop release");
            bool atriumOnly=Array.IndexOf(Environment.GetCommandLineArgs(),"--kyoto-atrium-only")>=0;
            if(atriumOnly)
            {
                report.Add("Scope: user-directed atrium interior; exterior garden releases are deferred, not passed.");
                locations["upper atrium stair landing"]=rooftopRoute.points[rooftopRoute.points.Length-1]+Vector3.up*.03f;
            }
            else
            {
                locations["roof garden"]=rooftopRoute.points[rooftopRoute.points.Length-1]+Vector3.up*.03f;
                float gardenY=rooftopRoute.points[rooftopRoute.points.Length-1].y+.03f;
                locations["roof west promenade"]=new Vector3(-224,gardenY,-16);
                locations["roof planted court"]=new Vector3(-185,gardenY,-24.6f);
                locations["roof south perimeter"]=new Vector3(-179,gardenY,-35);
            }
            locations["concourse"]=layout.spawn+Vector3.up*.03f;
            var sideLanding=Array.Find(layout.flights,f=>f.id=="north-side-landing-02");
            if(sideLanding!=null)
            {
                var a=sideLanding.contours[0].points[2];var b=sideLanding.contours[1].points[2];
                locations["north side middle landing"]=new Vector3((a.x+b.x)*.5f,sideLanding.baseElevation+.03f,(a.y+b.y)*.5f);
                var sideRoute=Array.Find(layout.routes,r=>r.id=="north-side-stairs-up");
                locations["north side upper crossing"]=sideRoute.points[sideRoute.points.Length-3]+Vector3.up*.03f;
            }
            foreach(string id in new[]{"north-escalator-middle-2-up","north-escalator-upper-2-up","north-side-stairs-complete-up"})
            {
                var route=Array.Find(layout.routes,r=>r.id==id);
                if(route!=null)locations[id+" crossing"]=route.points[route.points.Length-1]+Vector3.up*.03f;
            }
            foreach(string id in new[]{"east-skyway-escalator-1-down","east-skyway-escalator-2-down",
                "east-court-lower-escalator-1-down","east-court-lower-escalator-2-down"})
            {
                var route=Array.Find(layout.routes,r=>r.id==id);
                if(route==null)continue;
                locations[id+" upper landing"]=route.points[1]+Vector3.up*.03f;
                locations[id+" lower landing"]=route.points[route.points.Length-2]+Vector3.up*.03f;
                if(id.StartsWith("east-court-lower-"))
                    locations[id+" incline"]=route.points[route.points.Length/2]+Vector3.up*.03f;
            }
            var eastLowerStair=Array.Find(layout.routes,r=>r.id=="east-lower-stair-up");
            if(eastLowerStair!=null)
                locations["east lower stair incline"]=eastLowerStair.points[eastLowerStair.points.Length/2]+Vector3.up*.03f;
            foreach(var route in layout.routes)
            {
                if(!route.id.StartsWith("east-court-") || !route.id.EndsWith("-up") ||
                    !(route.id.Contains("-stair-") || route.id=="east-court-ramp-up"))continue;
                locations[route.id+" lower landing"]=route.points[0]+Vector3.up*.03f;
                locations[route.id+" incline"]=route.points[route.points.Length/2]+Vector3.up*.03f;
                locations[route.id+" upper landing"]=route.points[route.points.Length-1]+Vector3.up*.03f;
            }
            var eastCrossing=Array.Find(layout.routes,r=>r.id=="east-crossing-out");
            var bellRoute=Array.Find(layout.routes,r=>r.id=="east-bell-terrace-out");
            if(bellRoute!=null)
            {
                locations["east bell terrace entry"]=bellRoute.points[1]+Vector3.up*.03f;
                locations["east bell plinth approach"]=bellRoute.points[2]+Vector3.up*.03f;
                locations["east bell plinth"]=bellRoute.points[bellRoute.points.Length-1]+Vector3.up*.03f;
            }
            var frontage=Array.Find(layout.routes,r=>r.id=="east-court-frontage-out");
            if(frontage!=null)
            {
                locations["east court colonnade"]=frontage.points[0]+Vector3.up*.03f;
                locations["east court curved frontage"]=frontage.points[2]+Vector3.up*.03f;
                locations["east court recessed entry"]=frontage.points[frontage.points.Length-1]+Vector3.up*.03f;
            }
            if(eastCrossing!=null)
                locations["east transverse crossing"]=(eastCrossing.points[1]+eastCrossing.points[2])*.5f+Vector3.up*.03f;
            foreach(string id in new[]{"east-4f-terrace","east-3f-terrace","east-2f-terrace"})
            {
                var terrace=Array.Find(layout.boxes,b=>b.id==id);
                if(terrace!=null)locations[id]=terrace.center+Vector3.up*(terrace.size.y*.5f+.03f);
                else if(id=="east-4f-terrace")
                {
                    var entry=Array.Find(layout.flights,f=>f.id=="east-4f-7f");
                    if(entry!=null){var p=entry.contours[0].points[2];locations[id]=new Vector3(p.x,entry.baseElevation+.03f,p.y);}
                }
            }
            // Authored stair meshes replace the old compact flights and terrace
            // boxes. Use their actual heights and the connected walking route
            // so release coverage survives that representation change.
            foreach(string id in new[]{"east-1f-2f","east-2f-3f"})
            {
                var stair=Array.Find(layout.panels,p=>p.id==id&&p.ballStairs);
                if(stair==null)continue;
                var route=Array.Find(layout.routes,r=>r.id=="east-ground-to-fourth-up");
                if(route==null)throw new InvalidOperationException("Authored eastern stair has no connected release route: "+id);
                float lowestTread=float.PositiveInfinity,top=float.NegativeInfinity;
                for(int i=0;i<stair.vertices.Length;i++)if(stair.normals[i].y>.999f)
                {lowestTread=Mathf.Min(lowestTread,stair.vertices[i].y);top=Mathf.Max(top,stair.vertices[i].y);}
                if(!float.IsFinite(top)||!float.IsFinite(lowestTread))throw new InvalidOperationException("Authored stair has no upward tread faces: "+id);
                float bestDistance=float.PositiveInfinity,bestLanding=-1;Vector3 incline=default,landing=default;
                foreach(var point in route.points)
                {
                    float delta=Mathf.Abs(point.y-(lowestTread+top)*.5f);
                    if(delta<bestDistance){bestDistance=delta;incline=point;}
                }
                for(int i=1;i<route.points.Length;i++)
                {
                    var a=route.points[i-1];var b=route.points[i];
                    if(Mathf.Abs(a.y-top)>.001f||Mathf.Abs(b.y-top)>.001f)continue;
                    float length=Vector3.Distance(a,b);
                    if(length>bestLanding){bestLanding=length;landing=(a+b)*.5f;}
                }
                if(bestLanding<.5f||bestDistance>.5f)throw new InvalidOperationException("Authored stair lacks usable incline/landing release coverage: "+id);
                locations[id+" authored incline"]=incline+Vector3.up*.03f;
                locations[id+" authored landing"]=landing+Vector3.up*.03f;
            }
            foreach(var route in layout.routes)
            {
                if(!route.id.StartsWith("east-concourse-")||!route.id.Contains("-escalator-")||!route.id.EndsWith("-up"))continue;
                locations[route.id+" lower approach"]=route.points[0]+Vector3.up*.03f;
                locations[route.id+" incline"]=route.points[route.points.Length/2]+Vector3.up*.03f;
                locations[route.id+" upper approach"]=route.points[route.points.Length-1]+Vector3.up*.03f;
            }
            var live=new GameObject("Live-world ball query").AddComponent<BallBody>();
            live.SetProfile(BallProfile.Phase2Default);
            report.Add($"Phase 2 release ball: {live.Profile.id}; radius={live.Profile.radius_m:R}m mass={live.Profile.mass_kg:R}kg");
            if(!panelContactsOnly)
            using(var prediction=new ShotSimulation(true,layout))
            foreach(var area in locations)
            {
                walker.Place(area.Value);bool clear=walker.TryRelease(90,10,out var release,live.Profile.radius_m);float maxPosition=0,maxAngle=0;
                if(clear)
                {
                    Vector3 velocity=Quaternion.Euler(-10,90,0)*Vector3.forward*2,spin=SpinControls.Compose(90,-120,60);
                    StationMotion.SetTime(prediction.Scene,StationMotion.Time(root.scene));
                    live.Launch(release,velocity,spin);prediction.Ball.Launch(release,velocity,spin);Physics.SyncTransforms();
                    for(int i=0;i<360;i++)
                    {
                        live.BeforeStep(BallBody.Step);prediction.Ball.BeforeStep(BallBody.Step);
                        maxPosition=Mathf.Max(maxPosition,Vector3.Distance(live.Body.position,prediction.Ball.Body.position));
                        maxAngle=Mathf.Max(maxAngle,Quaternion.Angle(live.Body.rotation,prediction.Ball.Body.rotation));
                    }
                }
                bool pass=clear&&maxPosition<.001f&&maxAngle<.1f&&live.ContactBudgetExhaustions==0&&prediction.Ball.ContactBudgetExhaustions==0;
                if(!pass)failed++;
                report.Add($"{(pass?"PASS":"FAIL")} release and live/prediction {area.Key}: clear={clear}, position={maxPosition:R}m, rotation={maxAngle:R}deg, budgets={live.ContactBudgetExhaustions}/{prediction.Ball.ContactBudgetExhaustions}");
                releaseReport.Add(FormattableString.Invariant($"{area.Key},{release.x:R},{release.y:R},{release.z:R},{clear},{maxPosition:R},{maxAngle:R},{live.ContactBudgetExhaustions},{prediction.Ball.ContactBudgetExhaustions}"));
            }
            if(layout.panels!=null&&!releasesOnly)
            {
                int hits=0,glassCount=0,slabHits=0,slabProbes=0,shortenedFaceRays=0,visualMeshes=0,unexpectedVisualColliders=0;
                var colliders=new Dictionary<string,MeshCollider>();
                foreach(var collider in root.GetComponentsInChildren<MeshCollider>())colliders[collider.name]=collider;
                var probeArgument=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-retained-face-probes="));
                if(probeArgument!=null)
                {
                    string probeText=File.ReadAllText(probeArgument.Substring("--kyoto-retained-face-probes=".Length));
                    var retained=JsonUtility.FromJson<RetainedProbes>(probeText);
                    if(retained.probes==null||retained.probes.Length==0)throw new InvalidOperationException("Retained face probes are empty.");
                    using(var hash=SHA256.Create())report.Add("retained_face_probe_sha256="+BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(probeText))).Replace("-","").ToLowerInvariant()+"; original_layout="+retained.sourceSha256);
                    foreach(var probe in retained.probes)
                    {
                        var n=probe.normal.normalized;
                        bool found=colliders[probe.surfaceId].Raycast(new Ray(probe.point+n*.1f,-n),out var contact,.2f);
                        float distance=found?Vector3.Distance(contact.point,probe.point):-1f;
                        bool ok=found&&distance<.002f&&Vector3.Dot(contact.normal,n)>.99f;
                        if(!ok)failed++;
                        report.Add($"{(ok?"PASS":"FAIL")} retained solid-face location {probe.id}: found={found}, distance={distance:R}m; surface={probe.surfaceId}");
                    }
                }
                foreach(var panel in layout.panels)
                {
                    if(glassContactsOnly&&panel.material!="glass")continue;
                    if(!panel.collision)
                    {
                        visualMeshes++;
                        if(colliders.ContainsKey(panel.id))
                        {
                            unexpectedVisualColliders++;failed++;
                            report.Add($"FAIL visual mesh has rigid collider: {panel.id}");
                        }
                        continue;
                    }
                    if(!string.IsNullOrEmpty(panel.role)&&!glassContactsOnly)
                    {
                        // Floors and solid guards have arbitrary triangulations.
                        // Probe every face directly on its actual collider, including
                        // edge faces and wall portions embedded in foundations.
                        var collider=colliders[panel.id];
                        var panelBounds=new Bounds(panel.vertices[0],Vector3.zero);
                        foreach(var vertex in panel.vertices)panelBounds.Encapsulate(vertex);
                        for(int i=0;i<panel.triangles.Length;i+=3)
                        {
                            var a=panel.vertices[panel.triangles[i]];var b=panel.vertices[panel.triangles[i+1]];var c=panel.vertices[panel.triangles[i+2]];
                            var cross=Vector3.Cross(b-a,c-a);
                            // Vector3.normalized returns zero below magnitude 1e-5.
                            // A valid small triangle can fall below that area threshold.
                            if(cross.magnitude<=1e-12f){failed++;report.Add($"FAIL degenerate solid face {panel.id} triangle={i/3}");continue;}
                            var n=cross/cross.magnitude;
                            slabProbes++;
                            var point=a+((b-a)+(c-a))/3;
                            // Start before any other face of this concave solid.
                            // The former fixed 10 cm origin could lie beyond an
                            // intervening lip and test that lip instead of this face.
                            // A face at the solid's global upper/lower bound has
                            // no geometry beyond it. Keep the identical 10 cm ray
                            // without a quadratic search through its own floor.
                            bool exteriorHorizontal=(n.y==1f&&point.y==panelBounds.max.y)
                                ||(n.y==-1f&&point.y==panelBounds.min.y);
                            float offset=exteriorHorizontal?.1f:FaceRayOffset(panel,i,point,n);
                            if(offset<.0999f)shortenedFaceRays++;
                            bool found=collider.Raycast(new Ray(point+n*offset,-n),out var contact,offset*2);
                            if(found&&Vector3.Distance(contact.point,point)<.002f&&Vector3.Dot(contact.normal,n)>.99f)slabHits++;
                            else{failed++;report.Add($"FAIL solid face {panel.id} triangle={i/3}: found={found}, distance={(found?Vector3.Distance(contact.point,point):-1):R}, normalDot={(found?Vector3.Dot(contact.normal,n):-1):R}, area={Vector3.Cross(b-a,c-a).magnitude*.5f:R}");}
                        }
                        // Blender-authored glazing has a role too. Keep its
                        // face checks and also exercise both sides through the
                        // world's ball query, rather than skipping that coverage.
                        if(panel.material!="glass")continue;
                    }
                    glassCount++;
                    // Boolean-trimmed glazing no longer has a rectangular first
                    // four vertices. Its probe is on a real broad-face triangle.
                    Vector3 center=panel.hasContactProbe?panel.contactProbePoint:
                        (panel.vertices[0]+panel.vertices[1]+panel.vertices[2]+panel.vertices[3])*.25f;
                    Vector3 normal=panel.hasContactProbe?panel.contactProbeNormal.normalized:
                        Vector3.Cross(panel.vertices[1]-panel.vertices[0],panel.vertices[2]-panel.vertices[0]).normalized;
                    if(!panel.hasContactProbe&&(panel.id.StartsWith("central-")||panel.id.StartsWith("first-landing-frontage-glass-")))
                    {
                        // These authored box meshes export per-corner triangles,
                        // starting at the bottom face. Their first four vertices
                        // are not the broad-face quad used by the older records.
                        var bounds=new Bounds(panel.vertices[0],Vector3.zero);
                        foreach(var vertex in panel.vertices)bounds.Encapsulate(vertex);
                        center=bounds.center;normal=bounds.size.x<bounds.size.z?Vector3.right:Vector3.forward;
                        string frame=null;
                        if(panel.id=="central-hall-upper-glass")frame="central-hall-upper-transom-1";
                        else if(panel.id=="central-hall-information-glazing")frame="central-hall-information-mullion-2";
                        else if(panel.id=="central-hall-tickets-glazing")frame="central-hall-tickets-mullion-2";
                        if(frame!=null)
                        {
                            // The upper pane's exact center is also the crossing
                            // of a mullion and transom with coplanar front faces.
                            // Log that ambiguous query, then test the transom away
                            // from the junction so collider insertion order cannot
                            // decide which equally near steel member is returned.
                            if(panel.id=="central-hall-upper-glass")
                            {
                                foreach(float sign in new[]{-1f,1f})
                                {
                                    bool found=Physics.SphereCast(center+normal*(sign*.25f),.025f,-normal*sign,out var observed,.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                                    report.Add($"Central Gate frame junction sign={sign}: hit={(found?observed.collider.name:"none")}, distance={(found?observed.distance:-1):R}");
                                }
                                center.x+=.4f;
                            }
                            // Retain the broad-face center as an intentional
                            // framing contact, then use the first pane's center
                            // for glass. The divisions come from the authored
                            // four-window / twelve-column, two-row assemblies.
                            int frameHits=0;
                            foreach(float sign in new[]{-1f,1f})
                                if(Physics.SphereCast(center+normal*(sign*.25f),.025f,-normal*sign,out var h,.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)
                                    // The current frame protrudes toward the
                                    // hall; the glass extends farther rearward.
                                    &&h.collider.name==(sign>0?frame:panel.id))frameHits++;
                            if(frameHits!=2)failed++;
                            report.Add($"{(frameHits==2?"PASS":"FAIL")} Central Gate framing probe has front frame and rear glass {frame}: {frameHits}/2 sphere contacts");
                            center.x=bounds.min.x+bounds.size.x*(panel.id=="central-hall-upper-glass"?1f/24:1f/8);
                            if(panel.id=="central-hall-upper-glass")center.y=bounds.min.y+bounds.size.y*.25f;
                        }
                        report.Add($"Authored broad-face glass probe {panel.id}: point={center:F5}, normal={normal:F2}");
                    }
                    if(!panel.hasContactProbe&&panel.role=="bridge-glazing")
                    {
                        // These panes have diagonal steel crossing the quad center.
                        // Retain that center as a brace regression, and probe the
                        // glass at quarter width and mid-height. A triangle
                        // centroid lies on the brace when its diagonal reverses.
                        if(panel.id.StartsWith("east-hotel-high-glass-"))
                        {
                            string braceId=panel.id.Replace("-glass-","-web-");
                            int braceHits=0;
                            foreach(float sign in new[]{-1f,1f})
                            {
                                bool hit=Physics.SphereCast(center+normal*(sign*.25f),.025f,-normal*sign,out var h,.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                                if(hit&&h.collider.GetComponent<Surface>()?.surfaceId==braceId)braceHits++;
                            }
                            if(braceHits!=2)failed++;
                            report.Add($"{(braceHits==2?"PASS":"FAIL")} glass center intersects its diagonal brace {braceId}: {braceHits}/2 sphere contacts");
                        }
                        center=(panel.vertices[0]+panel.vertices[3])*.375f
                            +(panel.vertices[1]+panel.vertices[2])*.125f;
                    }
                    foreach(float sign in new[]{-1f,1f})
                    {
                        bool hit=Physics.SphereCast(center+normal*(sign*.25f),.025f,-normal*sign,out var h,.5f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore);
                        if(hit&&h.collider.name==panel.id)hits++;
                        else{failed++;report.Add($"FAIL two-sided glass contact {panel.id} sign={sign}: hit={(hit?h.collider.name:"none")}");}
                    }
                }
                if(glassCount==0)failed++;
                report.Add($"{(glassCount>0&&hits==glassCount*2?"PASS":"FAIL")} two-sided closed glass panels: {hits}/{glassCount*2} sphere contacts");
                if(!glassContactsOnly)
                {
                report.Add($"{(visualMeshes==0?"N/A":unexpectedVisualColliders==0?"PASS":"FAIL")} decorative meshes excluded from rigid collision: {visualMeshes-unexpectedVisualColliders}/{visualMeshes}");
                report.Add($"{(slabHits==slabProbes&&slabProbes>0?"PASS":"FAIL")} closed floors/guards: {slabHits}/{slabProbes} triangle-centroid collider probes, all face orientations");
                report.Add($"Solid-face probes use explicit unit normals; {shortenedFaceRays} origins shortened below 0.1 m to remain before another face in the source mesh. Distance/normal tolerances remain 2 mm and dot > 0.99; no faces exempted.");
                var camera=Array.Find(layout.cameras,c=>c.id=="02-great-stair");
                bool plazaFloor=Physics.Raycast(camera.position,Vector3.down,out var floor,3,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)&&floor.collider.name=="muromachi-square";
                if(!plazaFloor)failed++;
                report.Add($"{(plazaFloor?"PASS":"FAIL")} reference camera 02 stands over connected plaza: {floor.collider?.name} y={floor.point.y:R}");
                }
            }
            string path="../artifacts/phase2/walking";
            foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))path=arg.Substring("--kyoto-evidence=".Length);
            Directory.CreateDirectory(path);File.WriteAllLines(path+"/full-layout-verification.txt",report);File.WriteAllLines(path+"/full-layout-trace.csv",trace);File.WriteAllLines(path+"/release-prediction.csv",releaseReport);
            File.WriteAllText(path+"/layout-used.json",layoutText);
            foreach(var line in report)Debug.Log(line);
            UnityEngine.Object.DestroyImmediate(walker.gameObject);UnityEngine.Object.DestroyImmediate(live.gameObject);UnityEngine.Object.DestroyImmediate(root);
            if(failed>0)throw new Exception(failed+" full-layout routes failed.");
        }

        static float FaceRayOffset(StationLayout.Panel panel,int target,Vector3 point,Vector3 normal)
        {
            float result=.1f;
            for(int i=0;i<panel.triangles.Length;i+=3)
            {
                if(i==target)continue;
                var a=panel.vertices[panel.triangles[i]];var b=panel.vertices[panel.triangles[i+1]];var c=panel.vertices[panel.triangles[i+2]];
                var e1=b-a;var e2=c-a;var p=Vector3.Cross(normal,e2);float det=Vector3.Dot(e1,p);
                if(Mathf.Abs(det)<1e-12f)continue;
                var s=point-a;float u=Vector3.Dot(s,p)/det;if(u<0||u>1)continue;
                var q=Vector3.Cross(s,e1);float v=Vector3.Dot(normal,q)/det;if(v<0||u+v>1)continue;
                float distance=Vector3.Dot(e2,q)/det;
                if(distance>1e-5f)result=Mathf.Min(result,distance*.5f);
            }
            return result;
        }
    }
}
