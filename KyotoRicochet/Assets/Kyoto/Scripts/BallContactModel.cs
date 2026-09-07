using UnityEngine;

namespace Kyoto
{
    // An event impulse, independent of the scene timestep. Geometry and prediction
    // call this same response. The optional effective normal-force moment is
    // reported separately; it must never masquerade as a tangential impulse.
    public static class BallContactModel
    {
        public struct Result
        {
            public Vector3 velocity, spin, slip, tangentImpulse, deformationAngularImpulse;
            public float normalImpulse;
        }
        public static Result Resolve(Vector3 velocity,Vector3 spin,Vector3 normal,BallProfile profile,
            float restitution,float friction,float gripRestitution,float offsetFraction=0)
        {
            var result=new Result {velocity=velocity,spin=spin};
            float vn=Vector3.Dot(velocity,normal);
            if(vn>=0)return result;
            float mass=profile.mass_kg,radius=profile.radius_m,inertia=profile.Inertia;
            var arm=-normal*radius;
            result.slip=Vector3.ProjectOnPlane(velocity+Vector3.Cross(spin,arm),normal);
            result.normalImpulse=-(1+Mathf.Clamp01(restitution))*vn*mass;
            var demand=-(1+Mathf.Clamp01(gripRestitution))*result.slip/(1/mass+radius*radius/inertia);
            // One Coulomb cap: no static/dynamic branch with a downward impulse jump.
            result.tangentImpulse=Vector3.ClampMagnitude(demand,Mathf.Max(0,friction)*result.normalImpulse);
            result.velocity+=(normal*result.normalImpulse+result.tangentImpulse)/mass;
            result.spin+=Vector3.Cross(arm,result.tangentImpulse)/inertia;
            if(offsetFraction>0)
            {
                float slip=result.slip.magnitude;
                float offset=radius*Mathf.Clamp(offsetFraction,0,.2f)*slip/Mathf.Max(1e-9f,Mathf.Sqrt(slip*slip+vn*vn));
                var rollingSpin=Vector3.ProjectOnPlane(result.spin,normal);
                result.deformationAngularImpulse=-rollingSpin.normalized*Mathf.Min(inertia*rollingSpin.magnitude,offset*result.normalImpulse);
                result.spin+=result.deformationAngularImpulse/inertia;
            }
            return result;
        }
    }
}
