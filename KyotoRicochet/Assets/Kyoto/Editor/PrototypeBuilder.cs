using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Kyoto.Editor
{
    public static class PrototypeBuilder
    {
        const string Root="Assets/Kyoto/";
        static readonly Dictionary<string,Material> materials=new Dictionary<string,Material>();
        [MenuItem("Kyoto/Build prototype scene")]
        public static void Create()
        {
            Directory.CreateDirectory(Root+"Materials");
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            PlayerSettings.companyName="Kyoto Ricochet";PlayerSettings.productName="Kyoto Ricochet";
            PlayerSettings.bundleVersion="0.1.0";PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone,"dev.kyotoricochet.prototype");
            PlayerSettings.defaultScreenWidth=1440;PlayerSettings.defaultScreenHeight=900;
            PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;
            PlayerSettings.runInBackground=true;PlayerSettings.colorSpace=ColorSpace.Linear;
            PlayerSettings.macOS.buildNumber="1";
            Time.fixedDeltaTime=BallBody.Step;Physics.bounceThreshold=.15f;Physics.defaultContactOffset=.001f;
            var rp=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/Settings/PC_RPAsset.asset");
            if(rp){GraphicsSettings.defaultRenderPipeline=rp;QualitySettings.renderPipeline=rp;rp.renderScale=1;rp.msaaSampleCount=4;rp.shadowDistance=90;}
            materials.Clear();
            Mat("Basalt",new Color(.11f,.145f,.16f),.15f,.65f,true);
            Mat("Grout",new Color(.08f,.105f,.115f),0,.2f);
            Mat("StairStone",new Color(.29f,.34f,.37f),.1f,.45f,true);
            Mat("StairEdge",new Color(.46f,.49f,.49f),.4f,.65f);
            Mat("RoofSteel",new Color(.34f,.40f,.44f),.75f,.6f);
            Mat("BrushedSteel",new Color(.48f,.52f,.53f),.8f,.62f);
            Mat("Window",new Color(.08f,.16f,.22f),.55f,.92f);
            Mat("WarmWindow",new Color(.6f,.4f,.19f),.2f,.7f,false,new Color(.75f,.40f,.14f)*1.2f);
            Mat("RoofGlass",new Color(.29f,.43f,.54f),.25f,.8f,false,new Color(.13f,.23f,.35f)*.35f);
            Mat("RoofGlassLight",new Color(.36f,.48f,.60f),.25f,.8f,false,new Color(.14f,.26f,.40f)*.5f);
            Mat("StepLight",new Color(.05f,.65f,.72f),.1f,.8f,false,new Color(.09f,.7f,.8f)*2);
            Mat("WarmLight",new Color(1,.7f,.34f),0,.6f,false,new Color(1,.60f,.22f)*3);
            Mat("Rubber",new Color(.025f,.03f,.04f),0,.28f);
            Mat("Escalator",new Color(.25f,.29f,.33f),.7f,.45f);
            Mat("Wood",new Color(.26f,.12f,.05f),0,.3f,true);
            Mat("Ball",new Color(1,.32f,.085f),.04f,.28f,true);
            Mat("Ceramic",new Color(.89f,.88f,.79f),.03f,.78f);
            Mat("Cobalt",new Color(.045f,.16f,.23f),.2f,.65f);
            var importer=AssetImporter.GetAtPath(Root+"Art/KyotoStation.fbx") as ModelImporter;
            if(importer){importer.materialImportMode=ModelImporterMaterialImportMode.None;importer.generateSecondaryUV=true;importer.SaveAndReimport();}
            var model=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"Art/KyotoStation.fbx");
            var station=(GameObject)PrefabUtility.InstantiatePrefab(model);station.name="Kyoto Station · original Blender model";
            foreach(var r in station.GetComponentsInChildren<MeshRenderer>())
            {
                if(materials.TryGetValue(r.name,out var mat))r.sharedMaterial=mat;
                if(r.name.StartsWith("RoofGlass"))r.shadowCastingMode=ShadowCastingMode.Off;
                GameObjectUtility.SetStaticEditorFlags(r.gameObject,StaticEditorFlags.BatchingStatic|StaticEditorFlags.ContributeGI|StaticEditorFlags.OccludeeStatic|StaticEditorFlags.OccluderStatic);
            }
            var sky=new Material(Shader.Find("Skybox/Procedural"));sky.SetFloat("_SunSize",.015f);sky.SetFloat("_AtmosphereThickness",.8f);
            sky.SetColor("_SkyTint",new Color(.33f,.45f,.62f));sky.SetColor("_GroundColor",new Color(.09f,.12f,.15f));sky.SetFloat("_Exposure",1.2f);
            Save(sky,Root+"Materials/BlueHour.mat");RenderSettings.skybox=sky;
            RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=new Color(.48f,.61f,.74f);
            RenderSettings.ambientEquatorColor=new Color(.27f,.33f,.39f);RenderSettings.ambientGroundColor=new Color(.12f,.15f,.18f);
            RenderSettings.fog=true;RenderSettings.fogColor=new Color(.18f,.26f,.33f);RenderSettings.fogMode=FogMode.ExponentialSquared;RenderSettings.fogDensity=.0045f;
            var sun=new GameObject("Evening light").AddComponent<Light>();sun.type=LightType.Directional;sun.color=new Color(1,.81f,.60f);sun.intensity=1.4f;sun.shadows=LightShadows.Soft;sun.transform.rotation=Quaternion.Euler(38,-35,0);RenderSettings.sun=sun;
            sun.shadowBias=.12f;sun.shadowNormalBias=.3f;
            var fill=new GameObject("Atrium skylight fill").AddComponent<Light>();fill.type=LightType.Directional;fill.color=new Color(.55f,.72f,1);fill.intensity=.45f;fill.transform.rotation=Quaternion.Euler(60,145,0);
            for(int side=-1;side<=1;side+=2)for(int z=-15;z<=65;z+=16)
            {var light=new GameObject("Gallery wash").AddComponent<Light>();light.transform.position=new Vector3(side*16,5,z);light.type=LightType.Point;light.range=19;light.intensity=4;light.color=new Color(1,.67f,.34f);}
            var volume=new GameObject("Blue-hour grading").AddComponent<Volume>();volume.isGlobal=true;
            var profile=ScriptableObject.CreateInstance<VolumeProfile>();
            var tone=profile.Add<Tonemapping>();tone.mode.Override(TonemappingMode.ACES);
            var color=profile.Add<ColorAdjustments>();color.postExposure.Override(.35f);color.contrast.Override(10);color.saturation.Override(-8);
            var bloom=profile.Add<Bloom>();bloom.intensity.Override(.22f);bloom.threshold.Override(1.1f);
            Save(profile,Root+"Materials/BlueHourProfile.asset");
            AssetDatabase.AddObjectToAsset(tone,profile);AssetDatabase.AddObjectToAsset(color,profile);AssetDatabase.AddObjectToAsset(bloom,profile);volume.sharedProfile=profile;
            var camera=new GameObject("Main Camera").AddComponent<Camera>();camera.tag="MainCamera";camera.fieldOfView=65;camera.farClipPlane=250;camera.nearClipPlane=.008f;camera.allowHDR=true;
            camera.transform.SetPositionAndRotation(new Vector3(-8,3.5f,-12),Quaternion.Euler(-12,8,0));camera.gameObject.AddComponent<AudioListener>();
            var cameraData=camera.GetUniversalAdditionalCameraData();cameraData.renderPostProcessing=true;
            cameraData.antialiasing=AntialiasingMode.SubpixelMorphologicalAntiAliasing;cameraData.antialiasingQuality=AntialiasingQuality.High;
            var line=new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit"));line.SetColor("_BaseColor",Color.white);Save(line,Root+"Materials/Trajectory.mat");
            var course=AssetDatabase.LoadAssetAtPath<Course>(Root+"Course.asset");
            if(!course){course=ScriptableObject.CreateInstance<Course>();Save(course,Root+"Course.asset");}
            var game=new GameObject("Kyoto Ricochet").AddComponent<GameController>();game.course=course;game.view=camera;
            game.ballMaterial=materials["Ball"];game.ceramicMaterial=materials["Ceramic"];game.accentMaterial=materials["Cobalt"];game.lineMaterial=line;
            game.gameObject.AddComponent<GameHUD>().game=game;
            game.gameObject.AddComponent<PhysicsLab>().game=game;
            Sign("KYOTO STATION",new Vector3(0,4.7f,18),.10f,Color.white);
            Sign("G R E A T   S T A I R C A S E    /    1 7 1",new Vector3(0,4.05f,18),.036f,new Color(.5f,.75f,.78f));
            Sign("SKYWAY   /   10F",new Vector3(0,30.2f,4.55f),.045f,Color.white);
            Sign("CENTRAL CONCOURSE",new Vector3(-21.75f,3,-5),.055f,Color.white,-90);
            var signPanel=GameObject.CreatePrimitive(PrimitiveType.Cube);signPanel.name="Hanging wayfinding sign";signPanel.transform.position=new Vector3(0,4.45f,18.12f);signPanel.transform.localScale=new Vector3(9,1.55f,.14f);signPanel.GetComponent<Renderer>().sharedMaterial=materials["Cobalt"];UnityEngine.Object.DestroyImmediate(signPanel.GetComponent<Collider>());
            var probe=new GameObject("Concourse reflections").AddComponent<ReflectionProbe>();probe.transform.position=new Vector3(0,5,8);probe.size=new Vector3(48,25,90);probe.mode=ReflectionProbeMode.Realtime;probe.refreshMode=ReflectionProbeRefreshMode.OnAwake;probe.resolution=128;probe.boxProjection=true;
            EditorSceneManager.SaveScene(scene,Root+"Scenes/Kyoto.unity");
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(Root+"Scenes/Kyoto.unity",true)};
            AssetDatabase.SaveAssets();
            Debug.Log("KYOTO_SCENE_CREATED");
        }
        static void Sign(string words,Vector3 position,float size,Color color,float yaw=0)
        {
            var text=new GameObject(words).AddComponent<TextMesh>();text.text=words;text.characterSize=size;text.fontSize=90;text.anchor=TextAnchor.MiddleCenter;text.alignment=TextAlignment.Center;text.color=color;
            text.transform.position=position;text.transform.rotation=Quaternion.Euler(0,yaw,0);
        }
        static Material Mat(string name,Color color,float metal,float smooth,bool grain=false,Color? emission=null)
        {
            var m=new Material(Shader.Find("Universal Render Pipeline/Lit"));m.name=name;m.SetColor("_BaseColor",color);m.SetFloat("_Metallic",metal);m.SetFloat("_Smoothness",smooth);
            if(grain)
            {
                var texture=new Texture2D(128,128,TextureFormat.RGBA32,true);var random=new System.Random(24);
                for(int y=0;y<128;y++)for(int x=0;x<128;x++){float n=.88f+(float)random.NextDouble()*.12f;if(name=="Basalt"&&(x==0||y==0))n=.35f;texture.SetPixel(x,y,new Color(n,n,n,1));}texture.Apply();
                string p=Root+"Materials/"+name+"Grain.png";File.WriteAllBytes(p,texture.EncodeToPNG());AssetDatabase.ImportAsset(p);UnityEngine.Object.DestroyImmediate(texture);
                m.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(p));m.SetTextureScale("_BaseMap",name=="Basalt"?Vector2.one:new Vector2(3,3));
            }
            if(emission.HasValue){m.EnableKeyword("_EMISSION");m.SetColor("_EmissionColor",emission.Value);m.globalIlluminationFlags=MaterialGlobalIlluminationFlags.BakedEmissive;}
            Save(m,Root+"Materials/"+name+".mat");materials[name]=m;return m;
        }
        static void Save(UnityEngine.Object obj,string path)
        {if(AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(path))AssetDatabase.DeleteAsset(path);AssetDatabase.CreateAsset(obj,path);}

        [MenuItem("Kyoto/Find and validate five routes")]
        public static void GenerateCourse()
        {
            Physics.gravity=Vector3.down*9.81f;Physics.bounceThreshold=.15f;Physics.defaultContactOffset=.001f;
            var course=AssetDatabase.LoadAssetAtPath<Course>(Root+"Course.asset");
            if(!course)throw new Exception("Create the scene first.");
            var levels=new[]{
                new Challenge{title="The first bounce",subtitle="Polished stone / a little lift",origin=new Vector3(-3,1.5f,-8),cupRadius=.14f,requiredBounces=1,requiredSurfaces=1,witnessVelocity=new Vector3(0,2.4f,3.4f)},
                new Challenge{title="The west bank",subtitle="Borrow an angle from the wall",origin=new Vector3(-18,1.5f,-8),cupRadius=.12f,requiredBounces=2,requiredSurfaces=2,witnessVelocity=new Vector3(-5,2.7f,3.3f)},
                new Challenge{title="Across the grain",subtitle="Spin meets stone and steel",origin=new Vector3(18,1.5f,-14),cupRadius=.10f,requiredBounces=3,requiredSurfaces=2,witnessVelocity=new Vector3(5,3.5f,2),witnessSpin=new Vector3(20,0,0)},
                new Challenge{title="Step into the air",subtitle="A falling line from the great stairs",origin=new Vector3(6,5.9f,27),cupRadius=.085f,requiredBounces=3,requiredSurfaces=2,witnessVelocity=new Vector3(0,2,-5)},
                new Challenge{title="The long way home",subtitle="Four banks. A 100 mm opening.",origin=new Vector3(-18,1.5f,4),cupRadius=.05f,requiredBounces=4,requiredSurfaces=2,witnessVelocity=new Vector3(-6,4.5f,5.4f)}
            };
            using(var sim=new ShotSimulation())
            {
                for(int i=0;i<levels.Length;i++)
                {
                    Challenge c=levels[i];bool solved=false;
                    for(int variant=0;variant<30&&!solved;variant++)
                    {
                        Vector3 velocity=c.witnessVelocity*(1+(variant/3)*.035f)+Vector3.up*((variant%3)-1)*.12f;
                        // The authored spin must be expressible by the player's top/side controls.
                        Vector3 axis=Vector3.Cross(Vector3.up,new Vector3(velocity.x,0,velocity.z)).normalized;
                        Vector3 spin=axis*c.witnessSpin.magnitude;
                        sim.RemoveCup();var score=new ShotScore();Action<Surface,Vector3,float> hit=(s,p,v)=>score.Register(s,v,sim.Ball.Clock);sim.Ball.Impact+=hit;
                        Vector3 previous=c.origin;var candidates=new List<Vector3>();
                        sim.Run(c.origin,velocity,spin,15,sample:b=>
                        {
                            var p=b.Body.position;
                            if(previous.y>=CupCapture.Height&&p.y<CupCapture.Height&&b.Velocity.y<0&&score.Bounces>=c.requiredBounces&&score.Unique>=c.requiredSurfaces)
                            {float t=(previous.y-CupCapture.Height)/(previous.y-p.y);var cup=Vector3.Lerp(previous,p,t);cup.y=0;if(Mathf.Abs(cup.x)<21.5f&&cup.z<19.5f)candidates.Add(cup);}
                            previous=p;
                        });
                        sim.Ball.Impact-=hit;
                        // Prefer earlier qualifying landings; later candidates offer gentler capture.
                        foreach(var target in candidates)
                        {
                            sim.SetCup(target,c.cupRadius);score.Clear();sim.Ball.Impact+=hit;
                            var capture=new CupCapture{Base=target,InnerRadius=c.cupRadius};capture.Reset(c.origin);
                            var path=sim.Run(c.origin,velocity,spin,18,sample:b=>capture.Step(b.Body.position,b.Velocity,BallBody.Step));
                            sim.Ball.Impact-=hit;
                            if(capture.Captured&&score.Bounces>=c.requiredBounces&&score.Unique>=c.requiredSurfaces)
                            {c.cup=target;c.witnessVelocity=velocity;c.witnessSpin=spin;c.preview=path.ConvertAll(p=>p.position).ToArray();solved=true;Debug.Log($"KYOTO_ROUTE_SOLVED {i+1} cup={target:F6} v={velocity:F6} bounces={score.Bounces} surfaces={score.Unique}");break;}
                        }
                    }
                    if(!solved)throw new Exception("No valid physical solution for route "+(i+1));
                }
            }
            course.challenges=levels;EditorUtility.SetDirty(course);AssetDatabase.SaveAssets();
            Directory.CreateDirectory("../artifacts");File.WriteAllText("../artifacts/course.json",JsonUtility.ToJson(course,true));
        }

        public static void BuildMac()
        {
            string path=Path.GetFullPath("../Builds/Kyoto Ricochet.app");Directory.CreateDirectory(Path.GetDirectoryName(path));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{Root+"Scenes/Kyoto.unity"},locationPathName=path,target=BuildTarget.StandaloneOSX,options=BuildOptions.Development});
            if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Mac build failed: "+report.summary.result);
            Debug.Log($"KYOTO_BUILD_SUCCESS {path} {report.summary.totalSize} bytes");
        }

        // Keep the shipped Phase 1 app intact for the before/after comparison.
        public static void BuildPhase2Candidate()
        {
            string path="../Builds/Phase2-Development/Kyoto Ricochet Phase 2.app";
            foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-build-path="))path=arg.Substring("--kyoto-build-path=".Length);
            BuildPhase2At(path);
        }
        public static void BuildPhase2ContactAssessment()
        {
            BuildPhase2At("../Builds/Phase2-ContactAssessment/Kyoto Ricochet Phase 2.app");
        }
        static void BuildPhase2At(string relativePath)
        {
            string path=Path.GetFullPath(relativePath);
            string scenePath=Phase2Builder.ScenePath;
            foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-scene-path="))scenePath=arg.Substring("--kyoto-scene-path=".Length);
            if(!scenePath.StartsWith("Assets/")||!File.Exists(scenePath))throw new Exception("Missing requested scene: "+scenePath);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string oldName=PlayerSettings.productName,oldVersion=PlayerSettings.bundleVersion;
            string oldId=PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.Standalone);
            try
            {
                PlayerSettings.productName="Kyoto Ricochet Phase 2";PlayerSettings.bundleVersion="0.2.0-dev";
                PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone,"dev.kyotoricochet.phase2");
                var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions {scenes=new[]{scenePath},
                    locationPathName=path,target=BuildTarget.StandaloneOSX,options=BuildOptions.Development});
                if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Phase 2 candidate build failed: "+report.summary.result);
                Debug.Log($"KYOTO_PHASE2_CANDIDATE {path} {report.summary.totalSize} bytes");
            }
            finally
            {PlayerSettings.productName=oldName;PlayerSettings.bundleVersion=oldVersion;PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone,oldId);}
        }
    }
}
