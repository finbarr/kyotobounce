#if !UNITY_WEBGL || UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Kyoto
{
    public sealed partial class BrowserSession
    {
        [Serializable] public class DesignCapture
        {
            public BrowserDisk start,goal;
            public BrowserWaypoint[] waypoints;
            public Vector3[] path;
            public string error,note;
            public float[] waypointTimes;
            public float duration;
        }
        bool designArmed;
        readonly List<ContactSample> designContacts=new List<ContactSample>();

        void RecordDesignContact(ContactSample contact)
        {
            if(!designArmed||state.phase!="Flight"||contact.incomingVelocity.sqrMagnitude<1f||designContacts.Count>=512)return;
            if(Vector3.Angle(contact.incomingVelocity,contact.outgoingVelocity)<18&&Mathf.Abs(Vector3.Dot(contact.incomingVelocity,contact.normal))<1)return;
            // Keep spatially separate banks, including repeated visits to one wall.
            foreach(var old in designContacts)
                if(old.surfaceId==contact.surfaceId&&Vector3.Dot(old.normal,contact.normal)>.995f&&Vector3.Distance(old.point,contact.point)<2)return;
            designContacts.Add(contact);
        }
        DesignCapture CaptureDesign()
        {
            var capture=new DesignCapture{duration=ball.Clock};
            var points=new List<Vector3>();float routeLength=0;
            foreach(var pose in replayPoses)
                if(points.Count==0||Vector3.Distance(points[points.Count-1],pose.p)>.3f)points.Add(pose.p);
            points.Add(ball.Body.position);
            for(int i=1;i<points.Count;i++)routeLength+=Vector3.Distance(points[i-1],points[i]);
            // Bound the preview even for exceptionally long shots.
            var path=new List<Vector3>();int stride=Math.Max(1,(int)Math.Ceiling(points.Count/2000.0));
            for(int i=0;i<points.Count;i+=stride)path.Add(points[i]);path.Add(ball.Body.position);capture.path=path.ToArray();
            if(!FloorAt(thrower.feet,out var floor)){capture.error="Throw from a fixed horizontal floor to create a start zone.";return capture;}
            capture.start=new BrowserDisk{center=floor.point,normal=floor.normal,surface=SurfaceId(floor.collider),radius=.25f};
            if(!ValidateDisk(capture.start,true,out capture.error))return capture;
            var resting=ball.Body.position;
            if(Physics.Raycast(resting,Vector3.down,out var end,ball.Profile.radius_m+.004f,CollisionLayers.StaticBallMask,QueryTriggerInteraction.Ignore)&&end.normal.y>.995f)
            foreach(float radius in new[]{.75f,.5f,.25f,.1f})
            {
                var goal=new BrowserDisk{center=end.point,normal=end.normal,surface=SurfaceId(end.collider),radius=radius};
                if(ValidateDisk(goal,false,out _)){capture.goal=goal;break;}
            }
            if(capture.goal==null)capture.note="This landing is too cramped or uneven for a finish zone. The course scores its waypoint chain instead.";
            // Prefer hard direction changes and walls/ceilings to a row of floor patches.
            var candidates=new List<ContactSample>(designContacts);
            float Merit(ContactSample c)=>Vector3.Angle(c.incomingVelocity,c.outgoingVelocity)+(c.normal.y<.5f?90:0);
            candidates.Sort((a,b)=>Merit(b).CompareTo(Merit(a)));
            var targets=new List<(ContactSample contact,BrowserWaypoint target)>();
            float separation=Mathf.Clamp(routeLength/24,3,8);
            foreach(var contact in candidates)
            {
                if(targets.Count>=8)break;
                if(capture.goal!=null&&Vector3.Distance(contact.point,capture.goal.center)<capture.goal.radius+1)continue;
                bool crowded=false;foreach(var old in targets)if(Vector3.Distance(old.target.center,contact.point)<separation||Mathf.Abs(old.contact.time-contact.time)<.45f){crowded=true;break;}
                if(crowded)continue;
                foreach(float radius in new[]{.65f,.4f,.2f,.1f})
                {
                    var target=new BrowserWaypoint{center=contact.point,normal=contact.normal,radius=radius,surface=contact.surfaceId};
                    if(!ValidateWaypoint(target,out _))continue;
                    targets.Add((contact,target));break;
                }
            }
            targets.Sort((a,b)=>a.contact.time.CompareTo(b.contact.time));
            capture.waypoints=new BrowserWaypoint[targets.Count];capture.waypointTimes=new float[targets.Count];
            for(int i=0;i<targets.Count;i++){var target=targets[i].target;target.id="bank-"+(i+1);capture.waypoints[i]=target;capture.waypointTimes[i]=targets[i].contact.time;}
            capture.error=targets.Count==0&&capture.goal==null?"No useful banks or clear landing were found. Try a longer shot with a distinct rebound.":"";return capture;
        }
    }
}
#endif
