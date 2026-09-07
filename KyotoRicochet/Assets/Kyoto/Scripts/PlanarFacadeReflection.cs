using System;
using System.Diagnostics;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Unity.Profiling;

namespace Kyoto
{
    // Updates after FlightCamera, outside an active SRP render callback. The
    // reflected camera is visual only and never advances any gameplay clock.
    [DefaultExecutionOrder(10000)]
    public sealed class PlanarFacadeReflection : MonoBehaviour
    {
        public const int VisualLayer=12;
        public Camera sourceCamera;
        public Renderer[] panels;
        public Material materialTemplate;
        public Vector3 planePoint,planeNormal;
        public Bounds facadeBounds;
        [Range(.2f,1)] public float resolutionScale=.5f;
        public int maximumWidth=1024;
        [Range(0,2)] public float blurMip=.45f;
        public float maximumPlaneDeviation;
        public int RenderCount {get;private set;}
        public int SkipCount {get;private set;}
        public double LastSubmissionMilliseconds {get;private set;}
        public Vector2Int TextureSize=>target?new Vector2Int(target.width,target.height):Vector2Int.zero;
        public bool ReflectionValid {get;private set;}
        public Camera ReflectedCamera=>mirror;
        public RenderTexture ReflectionTexture=>target;
        static readonly ProfilerMarker marker=new("Kyoto.PlanarFacadeReflection");
        readonly Plane[] frustum=new Plane[6];
        Camera mirror;RenderTexture target;Material instance;bool rendering;float appliedBlurMip;

        public static void FacadePlane(StationLayout.Box[] boxes,out Vector3 point,out Vector3 normal,out float deviation)
        {
            if(boxes==null||boxes.Length==0)throw new ArgumentException("Glazed facade boxes are required.");
            point=Vector3.zero;normal=Vector3.zero;
            foreach(var box in boxes)
            {
                var n=Quaternion.Euler(0,box.yaw,0)*Vector3.forward;
                point+=box.center+n*(box.size.z*.5f);normal+=n;
            }
            point/=boxes.Length;point.y=0;normal.Normalize();deviation=0;
            foreach(var box in boxes)
            {
                var rotation=Quaternion.Euler(0,box.yaw,0);
                foreach(float side in new[]{-1f,1f})
                {
                    var corner=box.center+rotation*new Vector3(side*box.size.x*.5f,0,box.size.z*.5f);
                    deviation=Mathf.Max(deviation,Mathf.Abs(Vector3.Dot(corner-point,normal)));
                }
            }
        }

        public void Configure(Camera camera,Renderer[] renderers,Material template,Vector3 point,Vector3 normal,float deviation)
        {
            if(camera==null||renderers==null||renderers.Length==0||template==null)throw new ArgumentException("Camera, glazing renderers and material are required.");
            sourceCamera=camera;panels=renderers;materialTemplate=template;planePoint=point;planeNormal=normal.normalized;maximumPlaneDeviation=deviation;
            facadeBounds=panels[0].bounds;
            foreach(var panel in panels)
            {
                if(panel.GetComponent<Collider>())throw new InvalidOperationException("Reflection exclusion layer must contain visual geometry only.");
                panel.gameObject.layer=VisualLayer;panel.sharedMaterial=template;facadeBounds.Encapsulate(panel.bounds);
            }
        }
        void Initialize()
        {
            if(instance)return;
            instance=new Material(materialTemplate){name="North facade reflection (runtime)",hideFlags=HideFlags.DontSave};
            instance.SetFloat("_ReflectionValid",0);instance.SetFloat("_ReflectionMip",blurMip);appliedBlurMip=blurMip;ReflectionValid=false;
            foreach(var panel in panels)if(panel)panel.sharedMaterial=instance;
            var obj=new GameObject("Reflected north courtyard"){hideFlags=HideFlags.HideAndDontSave};
            mirror=obj.AddComponent<Camera>();mirror.enabled=false;
            var data=mirror.GetUniversalAdditionalCameraData();data.renderPostProcessing=false;
            data.antialiasing=AntialiasingMode.None;data.requiresColorOption=CameraOverrideOption.Off;data.requiresDepthOption=CameraOverrideOption.Off;
        }
        void LateUpdate()
        {
            if(sourceCamera&&sourceCamera.enabled)RenderForCamera(sourceCamera);
        }
        public static Matrix4x4 ReflectionMatrix(Vector3 point,Vector3 normal)
        {
            normal.Normalize();float d=-Vector3.Dot(normal,point);var matrix=Matrix4x4.identity;
            for(int i=0;i<3;i++){for(int j=0;j<3;j++)matrix[i,j]-=2*normal[i]*normal[j];matrix[i,3]=-2*d*normal[i];}
            return matrix;
        }
        public bool RenderForCamera(Camera source,int width=0,int height=0)
        {
            if(rendering||!enabled||!source||!materialTemplate||panels==null||panels.Length==0||SystemInfo.graphicsDeviceType==GraphicsDeviceType.Null)return false;
            Initialize();
            GeometryUtility.CalculateFrustumPlanes(source,frustum);
            if(Vector3.Dot(source.transform.position-planePoint,planeNormal)<=.003f||!GeometryUtility.TestPlanesAABB(frustum,facadeBounds))
            {
                SetValidity(false);SkipCount++;return false;
            }
            width=width>0?width:source.pixelWidth;height=height>0?height:source.pixelHeight;
            float scale=Mathf.Min(Mathf.Clamp(resolutionScale,.2f,1),Mathf.Max(128,maximumWidth)/(float)Mathf.Max(1,width));
            int w=Mathf.Max(32,Mathf.RoundToInt(width*scale)),h=Mathf.Max(32,Mathf.RoundToInt(height*scale));
            if(!target||target.width!=w||target.height!=h)
            {
                if(target){target.Release();Release(target);}
                target=new RenderTexture(w,h,24,RenderTextureFormat.ARGBHalf){name="North facade reflected view",useMipMap=true,autoGenerateMips=false,filterMode=FilterMode.Trilinear,hideFlags=HideFlags.DontSave};
                target.Create();instance.SetTexture("_Reflection",target);
            }
            var reflection=ReflectionMatrix(planePoint,planeNormal);
            mirror.CopyFrom(source);mirror.enabled=false;mirror.targetTexture=null;
            mirror.cullingMask=source.cullingMask&~(1<<VisualLayer);
            mirror.allowMSAA=false;mirror.allowDynamicResolution=false;
            mirror.transform.SetPositionAndRotation(reflection.MultiplyPoint3x4(source.transform.position),
                Quaternion.LookRotation(reflection.MultiplyVector(source.transform.forward),reflection.MultiplyVector(source.transform.up)));
            mirror.worldToCameraMatrix=source.worldToCameraMatrix*reflection;mirror.projectionMatrix=source.projectionMatrix;
            var p=mirror.worldToCameraMatrix.MultiplyPoint(planePoint+planeNormal*.001f);
            var n=mirror.worldToCameraMatrix.MultiplyVector(planeNormal).normalized;
            mirror.projectionMatrix=mirror.CalculateObliqueMatrix(new Vector4(n.x,n.y,n.z,-Vector3.Dot(p,n)));
            bool previous=GL.invertCulling;rendering=true;long start=Stopwatch.GetTimestamp();
            try
            {
                using(marker.Auto())
                {
                    GL.invertCulling=!previous;
                    var request=new RenderPipeline.StandardRequest{destination=target};
                    if(!RenderPipeline.SupportsRenderRequest(mirror,request))throw new InvalidOperationException("Planar reflection render requests are unavailable.");
                    RenderPipeline.SubmitRenderRequest(mirror,request);target.GenerateMips();
                }
                // The reflected camera excludes this glazing layer. Keeping
                // unchanged uniforms avoids invalidating every instanced pane
                // twice per frame while its texture is being refreshed.
                SetValidity(true);
                if(appliedBlurMip!=blurMip){instance.SetFloat("_ReflectionMip",blurMip);appliedBlurMip=blurMip;}
                RenderCount++;return true;
            }
            catch{SetValidity(false);throw;}
            finally
            {
                GL.invertCulling=previous;rendering=false;
                LastSubmissionMilliseconds=(Stopwatch.GetTimestamp()-start)*1000.0/Stopwatch.Frequency;
            }
        }
        void SetValidity(bool valid)
        {
            if(ReflectionValid!=valid&&instance)instance.SetFloat("_ReflectionValid",valid?1:0);
            ReflectionValid=valid;
        }
        void OnDisable()
        {
            SetValidity(false);
        }
        void OnDestroy()
        {
            if(panels!=null)foreach(var panel in panels)if(panel&&panel.sharedMaterial==instance)panel.sharedMaterial=materialTemplate;
            if(target){target.Release();Release(target);}if(mirror)Release(mirror.gameObject);if(instance)Release(instance);
        }
        static void Release(UnityEngine.Object obj)
        {
            if(Application.isPlaying)Destroy(obj);else DestroyImmediate(obj);
        }
    }
}
