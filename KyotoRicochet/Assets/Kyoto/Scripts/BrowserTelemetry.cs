using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace Kyoto
{
    // Read-only page state also allows browser tests to verify real input responses.
    public sealed class BrowserTelemetry : MonoBehaviour
    {
        GameController game;
        float due;
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void KyotoPublishState(string json);
#endif
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Attach()
        {
            if (Application.platform != RuntimePlatform.WebGLPlayer) return;
            var controller = FindFirstObjectByType<GameController>();
            if (controller) controller.gameObject.AddComponent<BrowserTelemetry>().game = controller;
        }
        void LateUpdate()
        {
            if (!game || !game.Ball || Time.unscaledTime < due) return;
            due = Time.unscaledTime + .1f;
            var state = new Snapshot {
                ready = true, phase = game.Phase.ToString(), view = game.Mode.ToString(),
                layout = game.LayoutSha256, time = Time.unscaledTime,
                ball = game.Ball.Body.position, velocity = game.Ball.Velocity,
                angularVelocity = game.Ball.AngularVelocity,
                feet = game.Walker ? game.Walker.transform.position : Vector3.zero,
                yaw = game.Yaw, pitch = game.Pitch, speed = game.Speed, top = game.Spin, kick = game.SideSpin,
                impacts = game.Score.Bounces, surfaces = game.Score.Unique,
                flightTime = game.FlightTime, stationTime = StationMotion.Time(game.gameObject.scene),
                frameMilliseconds = game.FrameMilliseconds, notice = game.Notice
            };
#if UNITY_WEBGL && !UNITY_EDITOR
            KyotoPublishState(JsonUtility.ToJson(state));
#endif
        }
        [Serializable] class Snapshot
        {
            public bool ready;
            public string phase, view, layout, notice;
            public Vector3 ball, velocity, angularVelocity, feet;
            public float time, yaw, pitch, speed, top, kick, flightTime, frameMilliseconds;
            public double stationTime;
            public int impacts, surfaces;
        }
    }
}
