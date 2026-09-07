using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Kyoto.Editor
{
    public static class Phase2Builder
    {
        const string Root="Assets/Kyoto/Phase2/";
        [System.Serializable] sealed class FacadeCoating
        {
            public Vector3 tint;public float normalReflectance,resolutionScale,blurMip;public int maximumWidth;
        }
        public const string ScenePath="Assets/Kyoto/Scenes/KyotoPhase2.unity";
        public static void CreateAndBuild(){Create();PrototypeBuilder.BuildPhase2Candidate();}
        [MenuItem("Kyoto/Phase 2/Create shared-layout scene")]
        public static void Create()
        {
            Directory.CreateDirectory(Root+"Materials");Directory.CreateDirectory(Root+"Geometry");
            AssetDatabase.Refresh();
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var layout=StationLayout.Load();
            var materials=new Dictionary<string,Material>
            {
                {"stone",Mat("Stone",new Color(.50f,.50f,.47f),.0f,.30f)},
                {"granite",Mat("Granite",new Color(.19f,.20f,.20f),.05f,.55f)},
                {"stair-stone",StairMaterial("Stair stone","StairStone")},
                {"stair-tread",StairMaterial("Stair nosing finish","StairTread")},
                {"facade",Mat("Facade",new Color(.22f,.25f,.26f),.12f,.35f)},
                {"steel",Mat("Steel",new Color(.55f,.58f,.59f),.7f,.5f)},
                {"silver",Mat("Silver cladding",new Color(.55f,.57f,.58f),.65f,.38f)},
                {"dark-metal",Mat("Dark facade frame",new Color(.06f,.07f,.075f),.7f,.45f)},
                {"bronze",Mat("Bell bronze",new Color(.58f,.39f,.10f),.8f,.5f)},
                {"roof",Mat("Canopy steel",new Color(.42f,.46f,.47f),.6f,.4f)},
                {"glass",Mat("Glass placeholder",new Color(.43f,.58f,.62f,.16f),.1f,.8f,true)},
                {"window",Mat("Reflective facade glazing",new Color(.23f,.31f,.36f,.85f),.4f,.85f,true)},
                {"limestone",Mat("Pale cladding",new Color(.68f,.66f,.61f),.05f,.3f)},
                {"rose",Mat("Rose facade band",new Color(.47f,.28f,.23f),.06f,.32f)},
                {"rubber",Mat("Rubber handrail",new Color(.035f,.04f,.044f),0,.35f)},
                {"escalator",StairMaterial("Escalator treads","EscalatorTread")},
                {"escalator-casing",Mat("Escalator stainless casing",new Color(.7f,.72f,.73f),.95f,.6f)},
                {"escalator-edge",NosingMaterial("Escalator yellow edge",new Color(.72f,.50f,.035f),.05f,.3f)},
                {"escalator-silver-edge",NosingMaterial("Escalator silver edge",new Color(.55f,.58f,.59f),.7f,.5f)},
                {"grass",Mat("Garden turf",new Color(0.220f,0.340f,0.105f),0.000f,0.120f)},
                {"soil",Mat("Planting soil",new Color(0.140f,0.105f,0.065f),0.000f,0.060f)},
                {"leaves",Mat("Bamboo foliage",new Color(0.180f,0.360f,0.075f),0.000f,0.150f)},
                {"bamboo",Mat("Bamboo culm",new Color(0.460f,0.500f,0.130f),0.000f,0.300f)},
                {"wood",Mat("Timber bench",new Color(0.470f,0.270f,0.120f),0.000f,0.220f)},
                {"garden-paving",Mat("Garden paving",new Color(0.670f,0.490f,0.440f),0.000f,0.240f)},
                {"garden-court",GardenCourtMaterial()},
                {"garden-yellow",Mat("Yellow painted metal",new Color(0.760f,0.600f,0.070f),0.350f,0.380f)},
                {"garden-blue",Mat("Blue painted metal",new Color(0.100f,0.290f,0.430f),0.350f,0.380f)},
                {"garden-red",Mat("Red painted metal",new Color(0.640f,0.080f,0.055f),0.350f,0.380f)},
                {"tower-white",Mat("Tower white painted steel",new Color(.83f,.84f,.81f),.05f,.55f)},
                {"tower-red",Mat("Tower vermilion painted steel",new Color(.62f,.12f,.055f),.35f,.58f)},
                {"tower-window",Mat("Tower dark glazing",new Color(.14f,.22f,.26f),.25f,.75f)},
                {"asphalt",Mat("Forecourt asphalt",new Color(.105f,.118f,.125f),0,.1f)},
                {"road-paint",Mat("Road crossing paint",new Color(.82f,.82f,.77f),0,.2f)},
                {"planting",Mat("Planter stone",new Color(.34f,.35f,.28f),0,.2f)}
            };
            var station=new GameObject("Station · shared metric layout");StationWorld.Create(station.transform,layout,false,false,materials);
            var filters=station.GetComponentsInChildren<MeshFilter>();
            // Preserve every reference before Save replaces a shared generated
            // mesh. Rebuilding an existing nosing asset must not destroy the
            // transient mesh while other steps still reference it.
            var generated=new Dictionary<Mesh,List<MeshFilter>>();
            foreach(var filter in filters)
            {
                var mesh=filter.sharedMesh;
                if(!mesh)throw new System.InvalidOperationException("Missing generated mesh: "+filter.name);
                if(AssetDatabase.Contains(mesh))continue;
                if(!generated.TryGetValue(mesh,out var users)){users=new List<MeshFilter>();generated.Add(mesh,users);}
                users.Add(filter);
            }
            foreach(var item in generated)
            {
                var saved=Save(item.Key,Root+"Geometry/"+item.Value[0].gameObject.name+".asset");
                foreach(var filter in item.Value)filter.sharedMesh=saved;
            }
            foreach(var filter in filters)
            {
                var renderer=filter.GetComponent<MeshRenderer>();
                if(renderer.sharedMaterial==materials["glass"])renderer.shadowCastingMode=ShadowCastingMode.Off;
                GameObjectUtility.SetStaticEditorFlags(filter.gameObject,filter.gameObject.layer==CollisionLayers.MovingSteps?0:
                    StaticEditorFlags.BatchingStatic|StaticEditorFlags.OccludeeStatic|StaticEditorFlags.OccluderStatic);
            }
            var sky=new Material(Shader.Find("Skybox/Procedural"));sky.SetFloat("_SunSize",.025f);sky.SetFloat("_AtmosphereThickness",1);
            sky.SetColor("_SkyTint",new Color(.55f,.62f,.70f));sky.SetColor("_GroundColor",new Color(.33f,.34f,.32f));sky.SetFloat("_Exposure",1.25f);
            sky=Save(sky,Root+"Materials/Daylight.mat");RenderSettings.skybox=sky;RenderSettings.fog=false;
            RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=new Color(.70f,.76f,.80f);
            RenderSettings.ambientEquatorColor=new Color(.46f,.49f,.5f);RenderSettings.ambientGroundColor=new Color(.25f,.26f,.27f);
            var sun=new GameObject("Daylight").AddComponent<Light>();sun.type=LightType.Directional;sun.color=new Color(1,.96f,.88f);sun.intensity=2;
            sun.shadows=LightShadows.Soft;sun.transform.rotation=Quaternion.Euler(48,-135,0);sun.shadowBias=.04f;sun.shadowNormalBias=.1f;RenderSettings.sun=sun;
            var camera=new GameObject("Main Camera").AddComponent<Camera>();camera.tag="MainCamera";camera.fieldOfView=65;camera.nearClipPlane=.008f;camera.farClipPlane=650;
            camera.transform.SetPositionAndRotation(layout.cameras[0].position,Quaternion.LookRotation(layout.cameras[0].lookAt-layout.cameras[0].position));
            camera.gameObject.AddComponent<AudioListener>();var data=camera.GetUniversalAdditionalCameraData();
            // SMAA executes in URP's post-processing pass. Selecting the mode
            // alone leaves thin tread edges and structural members unfiltered.
            data.renderPostProcessing=true;data.antialiasing=AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            data.antialiasingQuality=AntialiasingQuality.High;
            var glazing=layout.boxes.Where(b=>b.id.StartsWith("west-north-panel-")&&b.material=="window").ToArray();
            var glazingIds=new HashSet<string>(glazing.Select(b=>b.id));
            var facadeObjects=station.GetComponentsInChildren<Transform>().Where(t=>glazingIds.Contains(t.name)).ToDictionary(t=>t.name,t=>t);
            var glazingRenderers=glazing.Select(b=>facadeObjects[b.id].GetComponentInChildren<Renderer>()).ToArray();
            PlanarFacadeReflection.FacadePlane(glazing,out var planePoint,out var planeNormal,out float deviation);
            if(deviation>.1f)throw new System.InvalidOperationException("North glazing exceeds the single-plane reflection tolerance.");
            var coating=JsonUtility.FromJson<FacadeCoating>(File.ReadAllText("../art-source/materials/facade/reflection-spec.json"));
            var glassShader=Shader.Find("Kyoto/Planar Facade Glass");if(!glassShader)throw new System.InvalidOperationException("Missing north facade shader.");
            var glass=new Material(glassShader){name="North courtyard coated glazing",enableInstancing=true};
            glass.SetColor("_Tint",new Color(coating.tint.x,coating.tint.y,coating.tint.z,1));glass.SetFloat("_Reflectance",coating.normalReflectance);
            glass.SetFloat("_ReflectionValid",0);glass=Save(glass,Root+"Materials/North courtyard coated glazing.mat");
            var reflection=station.AddComponent<PlanarFacadeReflection>();
            reflection.Configure(camera,glazingRenderers,glass,planePoint,planeNormal,deviation);
            reflection.resolutionScale=coating.resolutionScale;reflection.maximumWidth=coating.maximumWidth;reflection.blurMip=coating.blurMip;
            var course=AssetDatabase.LoadAssetAtPath<Course>(Root+"Course.asset");
            if(!course)
            {
                course=ScriptableObject.CreateInstance<Course>();
                course.challenges=new[]{new Challenge{title="Explore the station",subtitle="Walk · climb · throw from your hand",origin=layout.spawn+Vector3.up*1.5f,cup=new Vector3(-6,0,12),cupRadius=.14f,witnessVelocity=new Vector3(0,1,-2)}};
                Save(course,Root+"Course.asset");
            }
            var game=new GameObject("Kyoto Ricochet Phase 2").AddComponent<GameController>();game.course=course;game.view=camera;game.phase2Layout=true;game.FreeExploration=true;
            game.ballMaterial=Mat("Ball",new Color(1,.27f,.055f),0,.3f);game.ceramicMaterial=Mat("Ceramic",new Color(.91f,.89f,.82f),0,.7f);
            game.accentMaterial=Mat("Cobalt",new Color(.04f,.13f,.20f),.1f,.5f);
            var line=new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit"));game.lineMaterial=Save(line,Root+"Materials/Trajectory.mat");
            game.gameObject.AddComponent<GameHUD>().game=game;game.gameObject.AddComponent<PhysicsLab>().game=game;
            var tags=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);var layers=tags.FindProperty("layers");
            layers.GetArrayElementAtIndex(CollisionLayers.Player).stringValue="Player";
            layers.GetArrayElementAtIndex(CollisionLayers.WalkingAssist).stringValue="WalkingAssist";
            layers.GetArrayElementAtIndex(CollisionLayers.BallStairs).stringValue="BallStairs";
            layers.GetArrayElementAtIndex(CollisionLayers.MovingSteps).stringValue="MovingSteps";tags.ApplyModifiedPropertiesWithoutUndo();
            layers.GetArrayElementAtIndex(PlanarFacadeReflection.VisualLayer).stringValue="FacadeGlazingVisual";tags.ApplyModifiedPropertiesWithoutUndo();
            EditorSceneManager.SaveScene(scene,ScenePath);AssetDatabase.SaveAssets();
            Debug.Log("KYOTO_PHASE2_SCENE_CREATED · circulation draft, photo registration pending");
        }
        static Material NosingMaterial(string name,Color color,float metallic,float smoothness)
        {
            var mat=Mat(name,color,metallic,smoothness);
            var shader=Shader.Find("Kyoto/Flush Nosing");if(!shader)throw new System.InvalidOperationException("Missing flush nosing shader");
            mat.shader=shader;mat.SetFloat("_ZWrite",0);mat.renderQueue=2001;EditorUtility.SetDirty(mat);return mat;
        }
        static Material StairMaterial(string name,string prefix)
        {
            Texture2D Texture(string suffix)
            {
                string path="Assets/Kyoto/Art/Stairs/"+prefix+suffix+".png";
                var source=File.ReadAllBytes("../art-source/materials/stairs/"+prefix+suffix+".png");
                if(!File.Exists(path)||!source.SequenceEqual(File.ReadAllBytes(path)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(path));File.WriteAllBytes(path,source);
                    AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
                }
                var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                if(!importer)throw new FileNotFoundException("Generate stair material maps first",path);
                importer.textureType=suffix=="Normal"?TextureImporterType.NormalMap:TextureImporterType.Default;
                importer.sRGBTexture=suffix=="Color";importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;
                importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=8;importer.maxTextureSize=1024;
                importer.textureCompression=TextureImporterCompression.CompressedHQ;importer.SaveAndReimport();
                return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            }
            var mat=Mat(name,Color.white,0,1);
            mat.SetTexture("_BaseMap",Texture("Color"));mat.SetTexture("_BumpMap",Texture("Normal"));
            mat.SetTexture("_MetallicGlossMap",Texture("Mask"));mat.SetFloat("_BumpScale",1);
            mat.SetFloat("_SmoothnessTextureChannel",0);mat.EnableKeyword("_NORMALMAP");mat.EnableKeyword("_METALLICSPECGLOSSMAP");
            EditorUtility.SetDirty(mat);return mat;
        }
        static Material GardenCourtMaterial()
        {
            Texture2D Texture(string name,bool normal)
            {
                string path="Assets/Kyoto/Art/Garden/"+name+".png";
                var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                if(!importer)throw new System.IO.FileNotFoundException("Generate the garden material with tools/build_garden_material.py",path);
                importer.textureType=normal?TextureImporterType.NormalMap:TextureImporterType.Default;
                importer.sRGBTexture=!normal;importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;
                importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=8;importer.maxTextureSize=1024;
                importer.textureCompression=TextureImporterCompression.Uncompressed;importer.SaveAndReimport();
                return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            }
            var color=Texture("CourtColor",false);var normal=Texture("CourtNormal",true);
            var mat=Mat("Garden court stone",Color.white,0,.22f);
            mat.SetTexture("_BaseMap",color);mat.SetTexture("_BumpMap",normal);mat.SetFloat("_BumpScale",.7f);mat.EnableKeyword("_NORMALMAP");
            EditorUtility.SetDirty(mat);return mat;
        }
        static Material Mat(string name,Color color,float metal,float smooth,bool glass=false)
        {
            var mat=new Material(Shader.Find("Universal Render Pipeline/Lit")){name=name};mat.SetColor("_BaseColor",color);mat.SetFloat("_Metallic",metal);mat.SetFloat("_Smoothness",smooth);mat.enableInstancing=true;
            if(glass)
            {
                mat.SetFloat("_Surface",1);mat.SetFloat("_Blend",0);mat.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);mat.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
                mat.SetFloat("_ZWrite",0);mat.SetFloat("_Cull",0);mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");mat.renderQueue=(int)RenderQueue.Transparent;
                mat.SetOverrideTag("RenderType","Transparent");
            }
            return Save(mat,Root+"Materials/"+name+".mat");
        }
        static T Save<T>(T obj,string path) where T:Object
        {
            var existing=AssetDatabase.LoadAssetAtPath<T>(path);
            if(existing){EditorUtility.CopySerialized(obj,existing);Object.DestroyImmediate(obj);return existing;}
            else AssetDatabase.CreateAsset(obj,path);
            return obj;
        }
    }
}
