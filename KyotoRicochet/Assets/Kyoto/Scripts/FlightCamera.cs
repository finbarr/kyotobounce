using UnityEngine;
using UnityEngine.InputSystem;

namespace Kyoto
{
    public class FlightCamera : MonoBehaviour
    {
        public GameController game;
        public Camera view;
        Vector3 lastDirection=Vector3.forward;
        Quaternion throwOrientation;
        float lookX,lookY;
        public void OnLaunch(){lastDirection=game.LaunchVelocity.normalized;throwOrientation=Quaternion.Euler(-game.Pitch,game.Yaw,0);lookX=lookY=0;}
        void LateUpdate()
        {
            if(!game.Ball)return;
            var phase=game.Phase;var ball=game.Ball.transform;
            Vector3 ballPosition=game.Ball.RenderPosition;
            Quaternion ballRotation=game.Ball.RenderRotation;
            Vector3 pos;Quaternion rot;
            if(phase==GamePhase.Title||phase==GamePhase.Complete)
            {pos=game.phase2Layout?new Vector3(0,1.65f,20):new Vector3(-8+Mathf.Sin(Time.time*.08f)*2,3.5f,-12);rot=Quaternion.LookRotation((game.phase2Layout?new Vector3(-32,25,-8):new Vector3(1,16,42))-pos);}
            else if(phase==GamePhase.Aim)
            {
                // Keep the landing area and the preview in view while adjusting launch elevation.
                pos=game.ObserverPosition+(game.phase2Layout?Vector3.zero:Quaternion.Euler(0,game.Yaw,0)*Vector3.right*.22f);
                rot=Quaternion.Euler(game.phase2Layout?-game.Pitch:8-game.Pitch*.1f,game.Yaw,0);
            }
            else if(phase==GamePhase.Replay)
            {pos=game.phase2Layout?game.ObserverPosition:Vector3.Lerp(game.Level.origin,game.CupPosition,.5f)+new Vector3(5,5,-5);rot=Quaternion.LookRotation(ballPosition-pos);}
            else if(phase==GamePhase.Success&&game.Mode!=ViewMode.Observer)
            {pos=game.CupPosition+new Vector3(.48f,.40f,-.48f);rot=Quaternion.LookRotation(game.CupPosition+Vector3.up*.1f-pos);}
            else if(game.Mode==ViewMode.Observer)
            {pos=game.ObserverPosition;rot=Quaternion.LookRotation(ballPosition-pos);}
            else
            {
                if(game.Ball.Velocity.sqrMagnitude>.1f)lastDirection=game.Ball.Velocity.normalized;
                var m=Mouse.current;if(m!=null&&m.rightButton.isPressed){Vector2 d=m.delta.ReadValue();lookX+=d.x*.08f;lookY=Mathf.Clamp(lookY-d.y*.08f,-80,80);}
                if(game.Mode==ViewMode.Tumble)
                {pos=ballPosition;rot=ballRotation*throwOrientation*Quaternion.Euler(lookY,lookX,0);}
                else
                {
                    Vector3 flat=Vector3.ProjectOnPlane(lastDirection,Vector3.up);
                    if(flat.sqrMagnitude<.001f)flat=Vector3.forward;
                    Vector3 desired=ballPosition-flat.normalized*.38f+Vector3.up*.10f;
                    Vector3 delta=desired-ballPosition;
                    if(Physics.SphereCast(ballPosition,.018f,delta.normalized,out var hit,delta.magnitude,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore))desired=ballPosition+delta.normalized*Mathf.Max(.01f,hit.distance-.02f);
                    pos=desired;
                    rot=Quaternion.LookRotation(flat.normalized+Vector3.up*Mathf.Clamp(lastDirection.y*.32f,-.3f,.3f))*Quaternion.Euler(lookY,lookX,0);
                }
            }
            view.transform.SetPositionAndRotation(pos,rot);view.nearClipPlane=.008f;
            game.SetBallVisible(!(phase==GamePhase.Flight&&game.Mode==ViewMode.Tumble));
        }
    }
}
