using System;
using UnityEngine;

namespace Kyoto
{
    // This is the runtime representation of art-source/station-layout.json.
    // Coordinates remain in metres; no independent art/collision scale or offsets.
    [Serializable] public sealed class StationLayout
    {
        public int schemaVersion;
        public string status,units,axes,origin,blenderConversion;
        public Measurement[] measurements;
        public Box[] boxes;
        public Flight[] flights;
        public Escalator[] escalators;
        public Beam[] beams;
        public Panel[] panels;
        public Route[] routes;
        public ComparisonCamera[] cameras;
        public ComparisonCamera[] inspectionCameras;
        public Vector3 spawn;
        public Skyway skyway;
        public MunicipalReference municipalGeometry;
        public string[] limitations;
        public AuthoredMaterial[] authoredMaterials;
        public AuthoredLight[] authoredLights;
        [Serializable] public sealed class AuthoredLight
        {
            public string id,source,note;
            public Vector3 position,direction;
            public Color linearColor;
            public float intensity,range,spotAngle,innerSpotAngle;
        }
        [Serializable] public sealed class AuthoredMaterial
        {
            public string id,label,physical,albedo,normal,mask;
            public Color linearColor;
            public Color emissionLinearColor;
            public float metallic,roughness,alpha=1,normalScale=1,worldTextureSpan;
        }
        [Serializable] public sealed class MunicipalReference
        {public string resource,geometrySha256,manifestSha256;}
        [Serializable] public sealed class Measurement {public string id,status,source,note;public float value,min,max;}
        [Serializable] public sealed class Box {public string id,material,role,appearance;public Vector3 center,size;public float yaw;public bool collision;}
        [Serializable] public sealed class Contour {public Vector2[] points;}
        [Serializable] public sealed class Flight
        {
            public string id,label,role,evidence,note,material,appearance,treadAppearance;
            public Contour[] contours;
            public float baseElevation,rise,foundationDepth;
            public Vector2[][] Rows()=>Array.ConvertAll(contours,c=>c.points);
        }
        [Serializable] public sealed class Escalator
        {
            public string id;public Vector3 lowerCenter,uphill;public Vector3[] path;
            public float run,height,width,flatLength,stepHeight,speed,phase;
            public int stepCount,publicPointCount;
        }
        [Serializable] public sealed class Beam {public string id,material,profile,appearance;public Vector3 a,b;public float radius;public bool collision;}
        [Serializable] public sealed class Panel
        {
            public string id,material,role,appearance;
            public Vector3[] vertices;
            public Vector3[] normals;
            public Vector2[] uv;
            public int[] triangles;
            public bool collision,hasContactProbe,playerOnly,ballStairs;
            public Vector3 contactProbePoint,contactProbeNormal;
            public Finish[] finishes;
        }
        [Serializable] public sealed class Finish {public string appearance;public int[] triangles;}
        [Serializable] public sealed class Route {public string id;public Vector3[] points;}
        [Serializable] public sealed class Skyway
        {
            public float floor,centerlineLength,withEastAccessLength,straightLength,westCrossingLength,eastAccessLength;
            public Vector3 westPortal,northTurn,eastPortal;
        }
        [Serializable] public sealed class ComparisonCamera {public string id,source,status;public Vector3 position,lookAt;public float fov,roll;public int captureWidth,captureHeight;public string[] landmarks;}
        public static StationLayout Load(TextAsset source=null)
        {
            var data=source?source:Resources.Load<TextAsset>("StationLayout");
            if(!data)throw new InvalidOperationException("Missing shared StationLayout resource.");
            var layout=JsonUtility.FromJson<StationLayout>(data.text);
            if(layout.schemaVersion!=1||layout.units!="meters")throw new InvalidOperationException("Unsupported station layout schema or units.");
            return layout;
        }
    }
}
