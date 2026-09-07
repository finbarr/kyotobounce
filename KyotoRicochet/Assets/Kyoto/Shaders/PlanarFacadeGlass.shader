Shader "Kyoto/Planar Facade Glass"
{
    Properties
    {
        _Reflection("Reflected courtyard",2D)="black"{}
        _Tint("Coated glass tint",Color)=(0.88,0.94,1,1)
        _Reflectance("Normal reflectance",Range(0,1))=0.55
        _ReflectionMip("Reflection blur",Range(0,2))=0.45
        _ReflectionValid("Reflection available",Float)=0
        _Fallback("Back face tint",Color)=(0.12,0.18,0.22,1)
    }
    SubShader
    {
        Tags {"RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry"}
        Pass
        {
            Tags {"LightMode"="UniversalForward"}
            Cull Back ZWrite On
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #include_with_pragmas "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DOTS.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_Reflection);SAMPLER(sampler_Reflection);
            CBUFFER_START(UnityPerMaterial)
                half4 _Tint,_Fallback;half _Reflectance,_ReflectionMip,_ReflectionValid;
            CBUFFER_END
            struct Attributes {float4 positionOS:POSITION;float3 normalOS:NORMAL;UNITY_VERTEX_INPUT_INSTANCE_ID};
            struct Varyings {float4 positionCS:SV_POSITION;float4 screen:TEXCOORD0;float3 normalWS:TEXCOORD1;float3 positionWS:TEXCOORD2;};
            Varyings Vert(Attributes input)
            {
                UNITY_SETUP_INSTANCE_ID(input);Varyings o;
                o.positionWS=TransformObjectToWorld(input.positionOS.xyz);
                o.positionCS=TransformWorldToHClip(o.positionWS);o.screen=ComputeScreenPos(o.positionCS);
                o.normalWS=TransformObjectToWorldNormal(input.normalOS);return o;
            }
            half4 Frag(Varyings i):SV_Target
            {
                if(_ReflectionValid<.5)return _Fallback;
                float2 uv=i.screen.xy/i.screen.w;
                half3 reflected=SAMPLE_TEXTURE2D_LOD(_Reflection,sampler_Reflection,uv,_ReflectionMip).rgb;
                half facing=saturate(abs(dot(normalize(i.normalWS),GetWorldSpaceNormalizeViewDir(i.positionWS))));
                half fresnel=_Reflectance+(1-_Reflectance)*pow(1-facing,5);
                return half4(reflected*_Tint.rgb*fresnel+half3(.025,.032,.04)*(1-fresnel),1);
            }
            ENDHLSL
        }
    }
}
