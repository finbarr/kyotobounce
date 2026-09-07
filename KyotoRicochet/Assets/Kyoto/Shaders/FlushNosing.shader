// A lit color film on an existing tread. Bias its raster depth, not the
// physical surface or the mesh position. The underlying tread writes depth.
Shader "Kyoto/Flush Nosing"
{
    Properties
    {
        _BaseMap("Base Map",2D)="white" {}
        _BaseColor("Color",Color)=(1,1,1,1)
        _Metallic("Metallic",Range(0,1))=0
        _Smoothness("Smoothness",Range(0,1))=.5
        _SpecColor("Specular",Color)=(.2,.2,.2,1)
        _MetallicGlossMap("Metallic",2D)="white" {}
        _SpecGlossMap("Specular",2D)="white" {}
        _BumpMap("Normal",2D)="bump" {}
        _BumpScale("Normal Scale",Float)=1
        _ParallaxMap("Height",2D)="black" {}
        _Parallax("Height Scale",Float)=.005
        _OcclusionMap("Occlusion",2D)="white" {}
        _OcclusionStrength("Occlusion Strength",Float)=1
        _EmissionMap("Emission",2D)="white" {}
        _EmissionColor("Emission Color",Color)=(0,0,0,1)
        _DetailMask("Detail Mask",2D)="white" {}
        _DetailAlbedoMap("Detail",2D)="linearGrey" {}
        _DetailNormalMap("Detail Normal",2D)="bump" {}
        _DetailAlbedoMapScale("Detail Scale",Float)=1
        _DetailNormalMapScale("Detail Normal Scale",Float)=1
        [HideInInspector] _Surface("Surface",Float)=0
        [HideInInspector] _Blend("Blend",Float)=0
        [HideInInspector] _SrcBlend("Source Blend",Float)=1
        [HideInInspector] _DstBlend("Destination Blend",Float)=0
        [HideInInspector] _SrcBlendAlpha("Source Alpha",Float)=1
        [HideInInspector] _DstBlendAlpha("Destination Alpha",Float)=0
        [HideInInspector] _ZWrite("Depth Write",Float)=0
        [HideInInspector] _Cull("Cull",Float)=2
        [HideInInspector] _Cutoff("Cutoff",Float)=.5
        [HideInInspector] _AlphaToMask("Alpha Coverage",Float)=0
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry+1" }
        Offset -1,-1
        UsePass "Universal Render Pipeline/Lit/FORWARDLIT"
    }
}
