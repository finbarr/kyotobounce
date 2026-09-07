using UnityEngine;

namespace Kyoto
{
    public static class SpinControls
    {
        public const float MaximumSpin = 200f;
        // Positive top = forward roll; positive kick = rightward floor rebound.
        // These are horizontal aim axes, independent of the follow camera and launch pitch.
        public static Vector3 Compose(float yaw, float top, float kickRight, float vertical = 0)
        {
            return Quaternion.Euler(0,yaw,0) * Vector3.ClampMagnitude(
                new Vector3(top,vertical,-kickRight),MaximumSpin);
        }
        public static Vector3 Decompose(float yaw,Vector3 worldSpin)
        {
            var local=Quaternion.Inverse(Quaternion.Euler(0,yaw,0))*worldSpin;
            return new Vector3(local.x,-local.z,local.y);
        }
    }
}
