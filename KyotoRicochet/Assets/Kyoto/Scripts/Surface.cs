using UnityEngine;

namespace Kyoto
{
    public class Surface : MonoBehaviour
    {
        public string surfaceId = "stone";
        public string displayName = "Stone";
        public bool scores = true;
        public float rollingResistance = .012f;
        public float torsionalResistance = .002f;
        public bool useBallReferenceResponse;
        public Vector3 contactVelocity; // Continuous belt velocity; rigid moving steps use their swept track.
        public float tone = 420f;
        [Range(0,1)] public float tangentialRestitution = .12f;

        public static PhysicsMaterial Material(string name, float bounce, float friction)
        {
            return new PhysicsMaterial(name) { bounciness = bounce, dynamicFriction = friction,
                staticFriction = friction * 1.15f, bounceCombine = PhysicsMaterialCombine.Minimum,
                frictionCombine = PhysicsMaterialCombine.Minimum };
        }
    }
}
