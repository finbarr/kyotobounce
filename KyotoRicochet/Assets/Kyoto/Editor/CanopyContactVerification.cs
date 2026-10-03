using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;

namespace Kyoto.Editor
{
    // Reproduce the real launch that touched a roof target but reported a
    // contact normal too far from its authored face to collect the waypoint.
    public static class CanopyContactVerification
    {
        [Serializable] class Inputs {public Vector3 origin,velocity,spin;public BrowserDisk target;}
        [Serializable] class Contact {public float time,alignment;public Vector3 point,normal;public bool inside;}
        [Serializable] class Report
        {
            public string status="running";
            public float duration;
            public Vector3 velocity,spin;
            public bool sleeping;
            public int targetContacts;
            public RailwayMeshVerification.Report geometry;
            public List<Contact> contacts=new List<Contact>();
        }
        public static void Run()
        {
            var input=JsonUtility.FromJson<Inputs>(File.ReadAllText(Environment.GetEnvironmentVariable("KYOTO_CANOPY_INPUT")));
            var output=Environment.GetEnvironmentVariable("KYOTO_CANOPY_REPORT");
            var layout=JsonUtility.FromJson<StationLayout>(File.ReadAllText(Environment.GetEnvironmentVariable("KYOTO_LAYOUT")));
            var report=new Report();
            try
            {
                using(var sim=new ShotSimulation(true,layout))
                {
                    report.geometry=RailwayMeshVerification.Check(sim.Root,layout,"railway-2-3-east-roof-","roof");
                    if(report.geometry.meshes!=2)throw new Exception("Expected the two authored platform roof faces");
                    sim.Ball.Contact+=contact=>{
                        if(contact.surfaceId!=input.target.surface)return;
                        var offset=contact.point-input.target.center;
                        bool inside=Mathf.Abs(Vector3.Dot(offset,input.target.normal))<=.01f
                            &&Vector3.ProjectOnPlane(offset,input.target.normal).sqrMagnitude<=input.target.radius*input.target.radius;
                        report.contacts.Add(new Contact{time=contact.time,point=contact.point,normal=contact.normal,
                            alignment=Vector3.Dot(contact.normal,input.target.normal),inside=inside});
                        if(inside)report.targetContacts++;
                    };
                    sim.Run(input.origin,input.velocity,input.spin,80);
                    report.duration=sim.Ball.Clock;report.sleeping=sim.Ball.Sleeping;
                    report.velocity=sim.Ball.Velocity;report.spin=sim.Ball.AngularVelocity;
                }
                if(report.targetContacts==0)throw new Exception("The regression shot never touches its target disk");
                foreach(var contact in report.contacts)
                    if(contact.inside&&contact.alignment<.995f)throw new Exception("A contact inside the roof target has an incorrect normal: "+contact.alignment);
                if(!report.sleeping||report.velocity.sqrMagnitude>0||report.spin.sqrMagnitude>0)
                    throw new Exception("The regression shot did not reach full translation and spin rest");
                report.status="pass";
            }
            catch{report.status="fail";throw;}
            finally{Directory.CreateDirectory(Path.GetDirectoryName(output));File.WriteAllText(output,JsonUtility.ToJson(report,true));}
        }
    }
}
