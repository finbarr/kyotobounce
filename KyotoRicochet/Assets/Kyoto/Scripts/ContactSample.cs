using UnityEngine;

namespace Kyoto
{
    public struct ContactSample
    {
        public float time, normalImpulse, mass, inertia;
        public double worldTime;
        public Vector3 surfaceVelocity;
        public float SurfaceWork => Vector3.Dot(normal*normalImpulse+tangentImpulse,surfaceVelocity);
        public float RelativeEnergyBefore => .5f*mass*(incomingVelocity-surfaceVelocity).sqrMagnitude+.5f*inertia*incomingSpin.sqrMagnitude;
        public float RelativeEnergyAfter => .5f*mass*(outgoingVelocity-surfaceVelocity).sqrMagnitude+.5f*inertia*outgoingSpin.sqrMagnitude;
        public Vector3 point, normal, incomingVelocity, outgoingVelocity;
        public Vector3 incomingSpin, outgoingSpin, slip, tangentImpulse, deformationAngularImpulse;
        public string surfaceId, profileId;
        public float EnergyBefore => .5f*mass*incomingVelocity.sqrMagnitude+.5f*inertia*incomingSpin.sqrMagnitude;
        public float EnergyAfter => .5f*mass*outgoingVelocity.sqrMagnitude+.5f*inertia*outgoingSpin.sqrMagnitude;
    }
}
