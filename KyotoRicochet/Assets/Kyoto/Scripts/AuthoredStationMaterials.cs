using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto
{
    // Imported appearance stays separate from the physical material keys.
    public static class AuthoredStationMaterials
    {
        public static IReadOnlyDictionary<string,Material> Merge(StationLayout layout,IReadOnlyDictionary<string,Material> source)
        {
            if(source==null||layout.authoredMaterials==null||layout.authoredMaterials.Length==0)return source;
            var result=new Dictionary<string,Material>();foreach(var item in source)result.Add(item.Key,item.Value);
            foreach(var row in layout.authoredMaterials)
            {
                var m=new Material(Shader.Find("Universal Render Pipeline/Lit")){name=row.label,enableInstancing=true};
                // Blender stores scene-linear colors; Unity material color properties use sRGB input.
                var color=row.linearColor.gamma;color.a=row.alpha;m.SetColor("_BaseColor",color);
                m.SetFloat("_Metallic",row.metallic);m.SetFloat("_Smoothness",1-Mathf.Clamp01(row.roughness));
                if(row.emissionLinearColor.maxColorComponent>0)
                {
                    m.SetColor("_EmissionColor",row.emissionLinearColor.gamma);m.EnableKeyword("_EMISSION");
                    // URP derives its saved _EMISSION keyword from AnyEmissive.
                    // Keep emission visible but exclude it from the baked GI;
                    // realtime GI is disabled and the paired spot supplies light.
                    m.globalIlluminationFlags=MaterialGlobalIlluminationFlags.RealtimeEmissive;
                }
                Texture2D Texture(string path)
                {
                    var t=Resources.Load<Texture2D>(path);
                    return t?t:throw new InvalidOperationException("Missing Blender-exported texture: "+path);
                }
                if(!string.IsNullOrEmpty(row.albedo))m.SetTexture("_BaseMap",Texture(row.albedo));
                if(!string.IsNullOrEmpty(row.normal))
                {
                    m.SetTexture("_BumpMap",Texture(row.normal));m.SetFloat("_BumpScale",row.normalScale);m.EnableKeyword("_NORMALMAP");
                }
                if(!string.IsNullOrEmpty(row.mask))
                {
                    m.SetTexture("_MetallicGlossMap",Texture(row.mask));m.SetFloat("_Smoothness",1);m.EnableKeyword("_METALLICSPECGLOSSMAP");
                }
                if(row.alpha<.999f)
                {
                    m.SetFloat("_Surface",1);m.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);m.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
                    m.SetFloat("_ZWrite",0);m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");m.renderQueue=(int)RenderQueue.Transparent;
                    m.SetShaderPassEnabled("ShadowCaster",false);
                }
                result.Add(row.id,m);
            }
            return result;
        }
    }
}
