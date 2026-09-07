using System;
using UnityEngine;

namespace Kyoto
{
    [Serializable]
    public sealed class BallProfile
    {
        public string id, display_name, status;
        public float mass_kg, radius_m, inertia_factor=.4f, maximum_launch_spin_rad_s=200;
        public Response response;
        [Serializable] public class Response
        {
            public float normal_restitution, sliding_friction, grip_restitution, normal_offset_fraction_of_radius;
        }
        public float Inertia => inertia_factor*mass_kg*radius_m*radius_m;
        // Selected Phase 2 specimen. Other surface pairs remain provisional;
        // the P5 fitted response applies only to reference granite contacts.
        public static BallProfile Phase2Default => Cross2014();
        public static BallProfile Prototype => new BallProfile {id="phase2-provisional-50mm",display_name="Provisional 50 mm rubber",
            status="Uncalibrated station prototype",mass_kg=.06f,radius_m=.025f,response=new Response {
                normal_restitution=.76f,sliding_friction=.24f,grip_restitution=.12f}};
        public static BallProfile Cross2014()
        {
            var asset=Resources.Load<TextAsset>("Cross2014Ball");
            if(!asset)throw new InvalidOperationException("Missing measured-ball candidate resource.");
            var profile=JsonUtility.FromJson<BallProfile>(asset.text);
            if(profile.mass_kg<=0||profile.radius_m<=0||profile.inertia_factor<=0||profile.response==null)
                throw new InvalidOperationException("Invalid measured-ball candidate profile.");
            return profile;
        }
    }
}
