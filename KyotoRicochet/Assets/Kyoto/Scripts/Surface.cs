using UnityEngine;

namespace Kyoto
{
    public class Surface : MonoBehaviour
    {
        public string surfaceId = "stone";
        public string displayName = "Stone";
        public bool scores = true;
        public float rollingResistance = .012f;
        // Effective spin-friction moment arm = coefficient * ball radius.
        // 0.575 mm for the 23 mm rubber ball: a finite contact patch, not a point.
        // This is a gameplay material estimate, separate from impact calibration.
        public const float DefaultTorsionalResistance = .025f;
        public float torsionalResistance = DefaultTorsionalResistance;
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
