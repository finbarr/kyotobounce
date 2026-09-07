using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object=UnityEngine.Object;

namespace Kyoto.Editor
{
    public static class AtriumSceneBuilder
    {
        [Serializable] sealed class Pose {public string id;public Vector3 position,lookAt;public float fov,roll,principalPointOffsetY;public int captureWidth,captureHeight;}
        [Serializable] sealed class Poses {public Pose[] cameras;}
        static string root,scenePath,output;static double started,lastProgress;
        static string Arg(string key)
        {
            string prefix="--kyoto-"+key+"=";
            return Environment.GetCommandLineArgs().First(a=>a.StartsWith(prefix)).Substring(prefix.Length);
        }
        static string Hash(string text){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant();}

        // The prior scene remains intact. The new scene references its own layout
        // and course; the same reference drives live collision and prediction.
        public static void CreateAndBake()
        {
            root=Arg("scene-root");output=Arg("evidence")+"-baked";scenePath=root+"/KyotoAtrium.unity";
            if(!root.StartsWith("Assets/Kyoto/Atrium/")||Directory.Exists(root))throw new InvalidOperationException("Use a fresh Assets/Kyoto/Atrium/ scene-root.");
            Directory.CreateDirectory(root+"/Materials");Directory.CreateDirectory(root+"/Geometry");Directory.CreateDirectory(output);
            AtriumTextureImport.Run();
            string layoutText=File.ReadAllText(Arg("layout-candidate"));
            File.WriteAllText(root+"/Layout.json",layoutText);AssetDatabase.ImportAsset(root+"/Layout.json",ImportAssetOptions.ForceSynchronousImport);
            var course=ScriptableObject.CreateInstance<Course>();
            JsonUtility.FromJsonOverwrite(File.ReadAllText(Path.Combine(Arg("export"),"course-candidate.json")),course);
            if(course.challenges.Length!=8||course.layoutSha256!=Hash(layoutText))throw new InvalidOperationException("The complete eight-challenge course must match the exported layout.");
            AssetDatabase.CreateAsset(course,root+"/Course.asset");
            StationCandidatePreview.Run();
            var game=Object.FindFirstObjectByType<GameController>();
            game.layoutOverride=AssetDatabase.LoadAssetAtPath<TextAsset>(root+"/Layout.json");game.course=course;
            var station=GameObject.Find("Temporary complete station candidate");station.name="Station · shared metric layout";
            var reflection=station.GetComponent<PlanarFacadeReflection>();
            foreach(var panel in reflection.panels)panel.sharedMaterial=reflection.materialTemplate;
            int materials=PersistMaterials(station);
            int previousLightingRoots=ClearPreviousAtriumLighting(game);
            ConfigureLighting(game.view);
            AddAuthoredLights(StationLayout.Load(game.layoutOverride));
            int lightmapped=PrepareGeometry(station);
            AddProbes();
            game.view.ResetProjectionMatrix();game.view.fieldOfView=65;
            EditorSceneManager.SaveScene(game.gameObject.scene,scenePath);AssetDatabase.SaveAssets();
            File.WriteAllText(output+"/setup.txt",$"layout_sha256={Hash(layoutText)}\nscene={scenePath}\nnew_material_assets={materials}\nlightmapped_renderers={lightmapped}\nprevious_owned_lighting_roots_removed={previousLightingRoots}\nLightmaps and native play acceptance are pending.\n");
            BeginBake();
        }
        public static void RebakeOvercast()
        {
            root=Arg("scene-root");scenePath=root+"/KyotoAtrium.unity";output=Arg("evidence")+"-baked";
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(scenePath);
            RenderSettings.skybox=OvercastSky();
            RenderSettings.ambientMode=AmbientMode.Skybox;RenderSettings.ambientIntensity=1;RenderSettings.sun.intensity=.04f;
            var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>(root+"/Daylight.asset");
            profile.TryGet<ColorAdjustments>(out var color);color.postExposure.Override(.85f);EditorUtility.SetDirty(color);
            var game=Object.FindFirstObjectByType<GameController>();game.view.ResetProjectionMatrix();game.view.fieldOfView=65;
            RefreshAuthoredEmission(StationLayout.Load(game.layoutOverride));
            EditorSceneManager.SaveScene(game.gameObject.scene,scenePath);AssetDatabase.SaveAssets();
            File.WriteAllText(output+"/setup.txt","Overcast environment study: constant linear radiance RGB 0.70,0.72,0.74; sun intensity 0.04; post exposure 0.85. Inferred lighting, not measured station illumination.\n");
            BeginBake();
        }
        public static void UpdateAuthoredLightingAndBake()
        {
            root=Arg("scene-root");scenePath=root+"/KyotoAtrium.unity";output=Arg("evidence")+"-baked";
            Directory.CreateDirectory(output);EditorSceneManager.OpenScene(scenePath);
            var game=Object.FindFirstObjectByType<GameController>();
            var before=StationLayout.Load(game.layoutOverride);string text=File.ReadAllText(Arg("layout-candidate"));
            var after=JsonUtility.FromJson<StationLayout>(text);var lights=after.authoredLights;
            before.authoredLights=null;after.authoredLights=null;
            if(JsonUtility.ToJson(before)!=JsonUtility.ToJson(after))throw new InvalidOperationException("Lighting-only update changed the runtime layout.");
            var objects=Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Where(l=>l.transform.parent&&l.transform.parent.name=="Atrium authored light fixtures").ToDictionary(l=>l.name);
            if(objects.Count!=lights.Length||lights.Any(l=>!objects.ContainsKey(l.id)))throw new InvalidOperationException("Authored fixture set changed; create a fresh scene.");
            foreach(var row in lights)
            {
                var light=objects[row.id];light.transform.position=row.position;light.transform.rotation=Quaternion.LookRotation(row.direction);
                light.color=row.linearColor.gamma;light.intensity=row.intensity;light.range=row.range;
                light.spotAngle=row.spotAngle;light.innerSpotAngle=row.innerSpotAngle;
            }
            File.WriteAllText(root+"/Layout.json",text);AssetDatabase.ImportAsset(root+"/Layout.json",ImportAssetOptions.ForceSynchronousImport);
            game.course.layoutSha256=Hash(text);EditorUtility.SetDirty(game.course);
            EditorSceneManager.SaveScene(game.gameObject.scene,scenePath);AssetDatabase.SaveAssets();
            File.WriteAllText(output+"/setup.txt","Only authored light settings and layout hash updated. All runtime geometry, materials, motion, routes and camera records compare identically.\n");
            BeginBake();
        }
        static void BeginBake()
        {
            started=lastProgress=EditorApplication.timeSinceStartup;
            Lightmapping.bakeCompleted+=OnBaked;Lightmapping.bakeCancelled+=OnCancelled;EditorApplication.update+=Progress;
            Debug.Log("ATRIUM_BAKE_START "+scenePath);
            if(!Lightmapping.BakeAsync())throw new InvalidOperationException("Unity rejected the lightmap bake.");
        }
        static int PersistMaterials(GameObject station)
        {
            int count=0;var saved=new Dictionary<Material,Material>();
            foreach(var renderer in station.GetComponentsInChildren<Renderer>())
            {
                var list=renderer.sharedMaterials;
                for(int i=0;i<list.Length;i++)
                {
                    var m=list[i];if(!m)throw new InvalidOperationException("Missing material on "+renderer.name);
                    if(AssetDatabase.Contains(m))continue;
                    if((m.hideFlags&HideFlags.DontSave)!=0)throw new InvalidOperationException("Unexpected transient material on "+renderer.name);
                    if(!saved.TryGetValue(m,out var asset))
                    {
                        AssetDatabase.CreateAsset(m,root+"/Materials/"+Hash(m.name).Substring(0,16)+".mat");asset=m;saved.Add(m,m);count++;
                    }
                    list[i]=asset;
                }
                renderer.sharedMaterials=list;
            }
            return count;
        }
        static int PrepareGeometry(GameObject station)
        {
            int lightmapped=0;var groups=new Dictionary<Mesh,List<MeshFilter>>();
            foreach(var filter in station.GetComponentsInChildren<MeshFilter>())
            {
                var renderer=filter.GetComponent<MeshRenderer>();var mesh=filter.sharedMesh;
                bool moving=filter.gameObject.layer==CollisionLayers.MovingSteps;
                bool transparent=renderer.sharedMaterials.Any(m=>m.renderQueue>=3000);
                var size=renderer.bounds.size;
                bool receive=!moving&&!transparent&&renderer.bounds.min.y<22&&Mathf.Max(size.x,size.y,size.z)>2
                    &&(mesh.vertexCount<5000||renderer.bounds.max.y<22);
                var serialized=new SerializedObject(renderer);serialized.FindProperty("m_ScaleInLightmap").floatValue=1;serialized.ApplyModifiedPropertiesWithoutUndo();
                renderer.lightProbeUsage=LightProbeUsage.BlendProbes;
                var flags=moving?0:StaticEditorFlags.BatchingStatic|StaticEditorFlags.ReflectionProbeStatic;
                if(!moving&&!transparent)flags|=StaticEditorFlags.ContributeGI;
                GameObjectUtility.SetStaticEditorFlags(filter.gameObject,flags);
                renderer.receiveGI=receive?ReceiveGI.Lightmaps:ReceiveGI.LightProbes;
                if(receive)lightmapped++;
                if(!groups.TryGetValue(mesh,out var list)){list=new List<MeshFilter>();groups.Add(mesh,list);}list.Add(filter);
            }
            int index=0;
            foreach(var pair in groups)
            {
                var mesh=pair.Key;bool uv=pair.Value.Any(f=>GameObjectUtility.AreStaticEditorFlagsSet(f.gameObject,StaticEditorFlags.ContributeGI));
                if(AssetDatabase.Contains(mesh)&&!uv)continue;
                if(AssetDatabase.Contains(mesh))mesh=Object.Instantiate(mesh);
                if(uv&&(mesh.uv2==null||mesh.uv2.Length!=mesh.vertexCount))
                    if(!Unwrapping.GenerateSecondaryUVSet(mesh))throw new InvalidOperationException("Lightmap UV generation failed: "+mesh.name);
                AssetDatabase.CreateAsset(mesh,root+"/Geometry/mesh-"+(index++).ToString("D5")+".asset");
                foreach(var filter in pair.Value)filter.sharedMesh=mesh;
            }
            return lightmapped;
        }
        static int ClearPreviousAtriumLighting(GameController game)
        {
            // A saved atrium is a useful preview base, but its authored lighting
            // must be replaced when constructing a fresh scene and lightmap set.
            // These objects are removed only from the in-memory candidate scene.
            var names=new HashSet<string>{"Atrium authored light fixtures","Atrium indirect light probes","Atrium daylight grade","Atrium interior reflection"};
            var previous=game.gameObject.scene.GetRootGameObjects().Where(o=>names.Contains(o.name)).ToArray();
            foreach(var obj in previous)Object.DestroyImmediate(obj);
            return previous.Length;
        }
        static void ConfigureLighting(Camera view)
        {
            RenderSettings.skybox=OvercastSky();
            RenderSettings.ambientMode=AmbientMode.Skybox;RenderSettings.ambientIntensity=1;RenderSettings.reflectionIntensity=.8f;
            var sun=RenderSettings.sun;sun.intensity=.04f;sun.color=new Color(1,.97f,.94f);sun.lightmapBakeType=LightmapBakeType.Mixed;
            sun.shadowStrength=.8f;sun.shadowBias=.015f;sun.shadowNormalBias=.025f;
            sun.transform.rotation=Quaternion.LookRotation(new Vector3(.207472f,-.769751f,-.603687f));
            var volume=new GameObject("Atrium daylight grade").AddComponent<Volume>();volume.isGlobal=true;volume.priority=100;
            var profile=ScriptableObject.CreateInstance<VolumeProfile>();profile.name="Atrium daylight";
            profile.Add<Tonemapping>().mode.Override(TonemappingMode.ACES);
            var color=profile.Add<ColorAdjustments>();color.postExposure.Override(.85f);color.contrast.Override(6);color.saturation.Override(-4);
            AssetDatabase.CreateAsset(profile,root+"/Daylight.asset");foreach(var c in profile.components)AssetDatabase.AddObjectToAsset(c,profile);volume.sharedProfile=profile;
            view.clearFlags=CameraClearFlags.Skybox;view.GetUniversalAdditionalCameraData().renderPostProcessing=true;
            var settings=new LightingSettings {name="Atrium ground-floor GI",bakedGI=true,realtimeGI=false,
                lightmapper=LightingSettings.Lightmapper.ProgressiveGPU,lightmapResolution=4,lightmapMaxSize=2048,
                lightmapPadding=4,directSampleCount=32,indirectSampleCount=128,environmentSampleCount=128,maxBounces=3,
                mixedBakeMode=MixedLightingMode.IndirectOnly,directionalityMode=LightmapsMode.NonDirectional};
            AssetDatabase.CreateAsset(settings,root+"/Lighting.asset");Lightmapping.lightingSettings=settings;
            foreach(var position in new[]{new Vector3(-8,5,0),new Vector3(-95,30,-8)})
            {
                var probe=new GameObject("Atrium interior reflection").AddComponent<ReflectionProbe>();probe.transform.position=position;
                probe.mode=ReflectionProbeMode.Baked;probe.resolution=128;probe.hdr=true;probe.boxProjection=true;probe.blendDistance=5;
                probe.size=position.y<10?new Vector3(80,24,55):new Vector3(140,50,60);
            }
        }
        static Material OvercastSky()
        {
            string cubePath=root+"/Materials/OvercastRadiance.asset",skyPath=root+"/Materials/OvercastSky.mat";
            var cube=AssetDatabase.LoadAssetAtPath<Cubemap>(cubePath);
            if(!cube)
            {
                cube=new Cubemap(16,TextureFormat.RGBAHalf,false){name="Atrium overcast radiance"};
                var colors=Enumerable.Repeat(new Color(.70f,.72f,.74f,1),256).ToArray();
                foreach(CubemapFace face in new[]{CubemapFace.PositiveX,CubemapFace.NegativeX,CubemapFace.PositiveY,CubemapFace.NegativeY,CubemapFace.PositiveZ,CubemapFace.NegativeZ})cube.SetPixels(colors,face);
                cube.Apply();AssetDatabase.CreateAsset(cube,cubePath);
            }
            var sky=AssetDatabase.LoadAssetAtPath<Material>(skyPath);
            if(!sky){sky=new Material(Shader.Find("Skybox/Cubemap")){name="Atrium overcast sky"};AssetDatabase.CreateAsset(sky,skyPath);}
            sky.SetTexture("_Tex",cube);sky.SetColor("_Tint",new Color(.5f,.5f,.5f,1));sky.SetFloat("_Exposure",1);EditorUtility.SetDirty(sky);
            return sky;
        }
        static void AddProbes()
        {
            var points=new List<Vector3>();
            for(float x=-165;x<=115;x+=10)for(float z=-32;z<=32;z+=8)for(float y=2;y<=58;y+=8)points.Add(new Vector3(x,y,z));
            for(float x=-45;x<=30;x+=5)for(float z=-28;z<=24;z+=4)foreach(float y in new[]{1.5f,5f,10f,16f})points.Add(new Vector3(x,y,z));
            new GameObject("Atrium indirect light probes").AddComponent<LightProbeGroup>().probePositions=points.ToArray();
        }
        static void AddAuthoredLights(StationLayout layout)
        {
            if(layout.authoredLights==null)return;
            var parent=new GameObject("Atrium authored light fixtures");
            foreach(var row in layout.authoredLights)
            {
                if(row.direction.sqrMagnitude<.99f||row.intensity<=0||row.range<=0||row.spotAngle<=0||row.spotAngle>=180)
                    throw new InvalidOperationException("Invalid authored fixture: "+row.id);
                var light=new GameObject(row.id).AddComponent<Light>();light.transform.SetParent(parent.transform,false);
                light.transform.position=row.position;light.transform.rotation=Quaternion.LookRotation(row.direction);
                light.type=LightType.Spot;light.lightmapBakeType=LightmapBakeType.Baked;
                light.color=row.linearColor.gamma;light.intensity=row.intensity;light.range=row.range;
                light.spotAngle=row.spotAngle;light.innerSpotAngle=row.innerSpotAngle;
                light.shadows=LightShadows.Soft;light.shadowBias=.01f;light.shadowNormalBias=.01f;
            }
        }
        static void RefreshAuthoredEmission(StationLayout layout)
        {
            if(layout.authoredMaterials==null)return;
            foreach(var row in layout.authoredMaterials.Where(m=>m.emissionLinearColor.maxColorComponent>0))
            {
                string path=root+"/Materials/"+Hash(row.label).Substring(0,16)+".mat";
                var material=AssetDatabase.LoadAssetAtPath<Material>(path);
                if(!material)throw new InvalidOperationException("Missing saved emitting material: "+row.label);
                material.SetColor("_EmissionColor",row.emissionLinearColor.gamma);
                material.globalIlluminationFlags=MaterialGlobalIlluminationFlags.RealtimeEmissive;
                material.EnableKeyword("_EMISSION");EditorUtility.SetDirty(material);
            }
        }
        public static void InspectSavedLighting()
        {
            root=Arg("scene-root");output=Arg("evidence");Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(root+"/KyotoAtrium.unity");
            var game=Object.FindFirstObjectByType<GameController>();
            var report=ValidateFixtures(game);
            var warnings=File.ReadAllLines(Arg("bake-log")).Where(l=>l.Contains("Instance using invalid Mesh"))
                .Select(l=>l.Substring(1,l.IndexOf("':",StringComparison.Ordinal)-1)).ToHashSet();
            foreach(var renderer in Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>warnings.Contains(r.name)))
            {
                var mesh=renderer.GetComponent<MeshFilter>().sharedMesh;
                report.Add($"BAKE_EXCLUSION {renderer.name}: vertices={mesh.vertexCount}; triangles={mesh.triangles.Length/3}; uv2={mesh.uv2.Length}; static={GameObjectUtility.GetStaticEditorFlags(renderer.gameObject)}; receiveGI={renderer.receiveGI}; queues={string.Join(",",renderer.sharedMaterials.Select(m=>m.renderQueue))}");
            }
            File.WriteAllLines(output+"/saved-lighting.txt",report);
        }
        public static void RepairBakeInputs()
        {
            root=Arg("scene-root");scenePath=root+"/KyotoAtrium.unity";output=Arg("evidence")+"-baked";Directory.CreateDirectory(output);
            EditorSceneManager.OpenScene(scenePath);
            var names=File.ReadAllLines(Arg("bake-log")).Where(l=>l.Contains("Instance using invalid Mesh"))
                .Select(l=>l.Substring(1,l.IndexOf("':",StringComparison.Ordinal)-1)).ToHashSet();
            var filters=Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None);
            var groups=filters.Where(f=>names.Contains(f.name)).GroupBy(f=>f.sharedMesh).ToArray();
            var report=new List<string>{"Repairing meshes explicitly rejected by the preceding bake; collision layout unchanged."};
            int index=0;
            foreach(var group in groups)
            {
                var old=group.Key;var mesh=Object.Instantiate(old);mesh.name=old.name+" lighting UVs";
                // Unwrapping may split vertices; verify every oriented triangle
                // still has the identical positions before replacing render meshes.
                Vector3[] positions=old.vertices;int[] triangles=old.triangles;
                if(!Unwrapping.GenerateSecondaryUVSet(mesh))throw new InvalidOperationException("Failed to unwrap "+old.name);
                var after=mesh.vertices;var indices=mesh.triangles;
                if(indices.Length!=triangles.Length)throw new InvalidOperationException("Unwrap changed triangle count: "+old.name);
                for(int i=0;i<indices.Length;i++)if(after[indices[i]]!=positions[triangles[i]])
                    throw new InvalidOperationException("Unwrap changed triangle positions: "+old.name);
                string path=root+"/Geometry/lighting-uv-"+(index++).ToString("D3")+".asset";
                if(File.Exists(path))throw new InvalidOperationException("Use a fresh repair output; asset exists: "+path);
                AssetDatabase.CreateAsset(mesh,path);
                foreach(var filter in filters.Where(f=>f.sharedMesh==old))filter.sharedMesh=mesh;
                report.Add($"PASS {old.name}: instances={group.Count()}, vertices={old.vertexCount}->{mesh.vertexCount}, uv0={old.uv.Length}, uv2={old.uv2.Length}->{mesh.uv2.Length}, oriented triangle positions unchanged");
            }
            File.WriteAllLines(output+"/uv-repair.txt",report);
            EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene(),scenePath);AssetDatabase.SaveAssets();
            BeginBake();
        }
        static List<string> ValidateFixtures(GameController game)
        {
            var layout=StationLayout.Load(game.layoutOverride);
            var report=new List<string>{"layout_sha256="+Hash(game.layoutOverride.text),"Saved scene inspected after reopening."};
            var roots=game.gameObject.scene.GetRootGameObjects();
            foreach(var expected in new[]{("Atrium authored light fixtures",1),("Atrium indirect light probes",1),("Atrium daylight grade",1),("Atrium interior reflection",2)})
                if(roots.Count(o=>o.name==expected.Item1)!=expected.Item2)
                    throw new InvalidOperationException("Duplicate or missing owned lighting roots: "+expected.Item1);
            report.Add("PASS One authored fixture group, one light-probe group, one daylight grade and two reflection probes");
            var lights=Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
            int count=0;
            if(layout.authoredLights!=null)foreach(var row in layout.authoredLights)
            {
                var light=lights.Single(l=>l.name==row.id);
                if(light.lightmapBakeType!=LightmapBakeType.Baked||Vector3.Distance(light.transform.position,row.position)>.0001f
                    ||Vector3.Dot(light.transform.forward,row.direction)<.99999f||Mathf.Abs(light.intensity-row.intensity)>.0001f)
                    throw new InvalidOperationException("Saved fixture differs from authored source: "+row.id);
                count++;
            }
            int emitting=0;
            if(layout.authoredMaterials!=null)foreach(var row in layout.authoredMaterials.Where(m=>m.emissionLinearColor.maxColorComponent>0))
            {
                var material=AssetDatabase.LoadAssetAtPath<Material>(root+"/Materials/"+Hash(row.label).Substring(0,16)+".mat");
                // Dim authored emitters are valid too. Verify the saved colour
                // against its source instead of imposing an arbitrary intensity.
                if(!material||!material.IsKeywordEnabled("_EMISSION")
                    ||Vector4.Distance(material.GetColor("_EmissionColor"),row.emissionLinearColor.gamma)>.0001f
                    ||(material.globalIlluminationFlags&MaterialGlobalIlluminationFlags.BakedEmissive)!=0)
                    throw new InvalidOperationException("Saved emission differs from its source or is double-counted in baked GI: "+row.label);
                emitting++;
            }
            if(Lightmapping.lightingSettings.realtimeGI)throw new InvalidOperationException("Paired fixture lights require realtime GI disabled.");
            report.Add($"PASS Saved fixture transforms, output and bake mode: {count}");
            report.Add($"PASS Saved emitting materials retain their shader keyword and exclude a second baked contribution: {emitting}");
            report.Add($"PASS Realtime GI disabled; lightmaps={LightmapSettings.lightmaps.Length}; probes={LightmapSettings.lightProbes.count}");
            return report;
        }
        static void Progress()
        {
            if(EditorApplication.timeSinceStartup-lastProgress<30)return;lastProgress=EditorApplication.timeSinceStartup;
            Debug.Log($"ATRIUM_BAKE_WAIT running={Lightmapping.isRunning} elapsed={lastProgress-started:F0}s");
        }
        static void Cleanup(){Lightmapping.bakeCompleted-=OnBaked;Lightmapping.bakeCancelled-=OnCancelled;EditorApplication.update-=Progress;}
        static void OnCancelled(){Cleanup();File.WriteAllText(output+"/failure.txt","Unity cancelled the lightmap bake.\n");EditorApplication.Exit(1);}
        static void OnBaked(){Cleanup();EditorApplication.delayCall+=Finish;}
        static void Finish()
        {
            try
            {
                if(LightmapSettings.lightmaps.Length==0)throw new InvalidOperationException("Bake completed without any lightmaps.");
                EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene(),scenePath);AssetDatabase.SaveAssets();
                EditorSceneManager.OpenScene(scenePath);
                var game=Object.FindFirstObjectByType<GameController>();var view=game.view;var reflection=Object.FindFirstObjectByType<PlanarFacadeReflection>();
                File.WriteAllLines(output+"/saved-fixtures.txt",ValidateFixtures(game));
                var probeReport=new List<string>{"x,y,z,up_r,up_g,up_b"};
                foreach(var position in new[]{new Vector3(0,2,0),new Vector3(-30,5,0),new Vector3(0,58,0)})
                {
                    LightProbes.GetInterpolatedProbe(position,null,out var sh);var values=new Color[1];sh.Evaluate(new[]{Vector3.up},values);
                    probeReport.Add(FormattableString.Invariant($"{position.x},{position.y},{position.z},{values[0].r:R},{values[0].g:R},{values[0].b:R}"));
                }
                File.WriteAllLines(output+"/probe-irradiance.csv",probeReport);
                var poses=JsonUtility.FromJson<Poses>(File.ReadAllText(Arg("poses"))).cameras;
                foreach(var pose in poses)
                {
                    view.transform.SetPositionAndRotation(pose.position,Quaternion.LookRotation(pose.lookAt-pose.position)*Quaternion.AngleAxis(pose.roll,Vector3.forward));
                    view.fieldOfView=pose.fov;view.aspect=(float)pose.captureWidth/pose.captureHeight;view.ResetProjectionMatrix();
                    var matrix=view.projectionMatrix;matrix.m12=2*pose.principalPointOffsetY;view.projectionMatrix=matrix;
                    reflection.RenderForCamera(view,pose.captureWidth,pose.captureHeight);
                    MunicipalMaterialPreview.Capture(view,pose.captureWidth,pose.captureHeight,output+"/"+pose.id+".png");
                }
                File.WriteAllText(output+"/bake.txt",$"Saved scene reopened before capture.\nscene={scenePath}\nlayout_sha256={Hash(game.layoutOverride.text)}\nlightmaps={LightmapSettings.lightmaps.Length}\nprobes={LightmapSettings.lightProbes.count}\nelapsed_seconds={EditorApplication.timeSinceStartup-started:F2}\nWorking daylight study; visual and native acceptance remain pending.\n");
                Debug.Log("ATRIUM_BAKE_COMPLETE "+scenePath);EditorApplication.Exit(0);
            }
            catch(Exception e){File.WriteAllText(output+"/failure.txt",e.ToString());Debug.LogException(e);EditorApplication.Exit(1);}
        }
    }
}
