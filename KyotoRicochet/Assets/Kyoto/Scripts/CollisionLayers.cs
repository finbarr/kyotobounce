namespace Kyoto
{
    public static class CollisionLayers
    {
        public const int Player = 8;
        public const int WalkingAssist = 9;
        public const int BallStairs = 10;
        public const int MovingSteps = 11;
        // Walking ramps and the observer capsule can never influence live or predicted balls.
        public const int BallMask = ~((1 << Player) | (1 << WalkingAssist));
        public const int StaticBallMask = BallMask & ~(1 << MovingSteps);
        public const int WalkingMask = ~((1 << Player) | (1 << BallStairs) | (1 << MovingSteps));
        public static void Configure()
        {
            UnityEngine.Physics.IgnoreLayerCollision(Player,BallStairs,true);
            UnityEngine.Physics.IgnoreLayerCollision(Player,MovingSteps,true);
            UnityEngine.Physics.IgnoreLayerCollision(Player,Player,true);
        }
    }
}
