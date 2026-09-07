using System;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Kyoto.Editor
{
    // A working URP approximation of the Blender look-development rig.
    public static class BlenderLightingPreview
    {
        [Serializable] sealed class Rig {public Color ambientLinear;public float exposure;public Sun[] suns;}
        [Serializable] sealed class Sun {public Vector3 direction;public Color linearColor;public float strength;}
        public static VolumeProfile Apply(string path,Camera view)
        {
            var rig=JsonUtility.FromJson<Rig>(File.ReadAllText(path));
            RenderSettings.ambientMode=AmbientMode.Trilight;
            RenderSettings.ambientSkyColor=rig.ambientLinear.gamma;
            RenderSettings.ambientEquatorColor=(rig.ambientLinear*.6f).gamma;
            RenderSettings.ambientGroundColor=(rig.ambientLinear*.25f).gamma;
            view.clearFlags=CameraClearFlags.SolidColor;view.backgroundColor=rig.ambientLinear.gamma;
            var lights=UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
            foreach(var l in lights)if(l.type==LightType.Directional)l.enabled=false;
            foreach(var source in rig.suns)
            {
                var l=new GameObject("Blender authored daylight").AddComponent<Light>();l.type=LightType.Directional;
                l.color=source.linearColor.gamma;l.intensity=source.strength;l.shadows=LightShadows.Soft;
                l.transform.rotation=Quaternion.LookRotation(source.direction);l.shadowBias=.015f;l.shadowNormalBias=.025f;RenderSettings.sun=l;
            }
            var volume=new GameObject("Blender daylight look").AddComponent<Volume>();volume.isGlobal=true;volume.priority=100;
            var profile=ScriptableObject.CreateInstance<VolumeProfile>();profile.name="Blender atrium daylight";volume.sharedProfile=profile;
            profile.Add<ColorAdjustments>().postExposure.Override(rig.exposure);
            profile.Add<Tonemapping>().mode.Override(TonemappingMode.ACES);
            return profile;
        }
    }
}
