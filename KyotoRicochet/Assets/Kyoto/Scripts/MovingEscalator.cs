using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    // One shared closed rail controls real horizontal step solids. The rail is
    // piecewise linear, so each CCD interval has an exact translating-box sweep.
    public sealed class MovingEscalator : MonoBehaviour
    {
        public StationLayout.Escalator specification;
        public bool collision;
        public Transform[] steps;
        public BoxCollider[] colliders;
        public Surface surface;
        double[] distance;
        double length,pitch;
        Bounds envelope;
        Vector3 half;
        struct ArcSpan {public double low,high;}
        List<ArcSpan>[] buckets;
        int firstBucket,stamp;
        int[] visited;
        readonly List<int> candidates=new List<int>(24);
        void OnEnable(){if(specification!=null&&specification.path!=null){Prepare();StationMotion.Register(this);}}
        void OnDisable(){StationMotion.Remove(this);}
        void Prepare()
        {
            if(distance!=null)return;
            var points=specification.path;distance=new double[points.Length];
            envelope=new Bounds(points[0],Vector3.zero);
            for(int i=1;i<points.Length;i++){distance[i]=distance[i-1]+Vector3.Distance(points[i-1],points[i]);envelope.Encapsulate(points[i]);}
            length=distance[distance.Length-1];pitch=length/specification.stepCount;
            half=new Vector3(specification.width*.5f,specification.stepHeight*.5f,(float)pitch*.5f);
            firstBucket=Mathf.FloorToInt(envelope.min.z);
            buckets=new List<ArcSpan>[Mathf.FloorToInt(envelope.max.z)-firstBucket+1];
            for(int i=0;i<buckets.Length;i++)buckets[i]=new List<ArcSpan>(3);
            for(int i=1;i<points.Length;i++)
            {
                int low=Mathf.FloorToInt(Mathf.Min(points[i-1].z,points[i].z))-firstBucket;
                int high=Mathf.FloorToInt(Mathf.Max(points[i-1].z,points[i].z))-firstBucket;
                for(int bin=low;bin<=high;bin++)
                {
                    var spans=buckets[bin];int last=spans.Count-1;
                    if(last>=0&&spans[last].high>=distance[i-1]-1e-9)
                        spans[last]=new ArcSpan{low=spans[last].low,high=distance[i]};
                    else spans.Add(new ArcSpan{low=distance[i-1],high=distance[i]});
                }
            }
            visited=new int[specification.stepCount];
            envelope.Expand(new Vector3(specification.width+1,2*specification.stepHeight+1,(float)pitch+1));
        }
        public static MovingEscalator Create(Transform parent,StationLayout.Escalator spec,
            PhysicsMaterial physical,Material material,bool collision,bool walking,Material edgeMaterial=null,Material casingMaterial=null)
        {
            var root=new GameObject(spec.id);SceneManager.MoveGameObjectToScene(root,parent.gameObject.scene);
            root.transform.SetParent(parent,false);root.transform.localPosition=spec.lowerCenter;
            root.transform.localRotation=Quaternion.LookRotation(spec.uphill,Vector3.up);
            var lane=root.AddComponent<MovingEscalator>();lane.specification=spec;lane.collision=collision;lane.Prepare();
            lane.surface=root.AddComponent<Surface>();lane.surface.surfaceId=spec.id;lane.surface.displayName="MOVING ESCALATOR";
            lane.surface.rollingResistance=.024f;
            lane.steps=new Transform[spec.stepCount];lane.colliders=new BoxCollider[spec.stepCount];
            Mesh edgeMesh=null;
            if(edgeMaterial)
            {
                edgeMesh=new Mesh{name=spec.id+" flush tread nosing"};
                // The observed edge wraps over the leading lip. A top-only film
                // disappears when looking up the bank from below its treads.
                float lip=.5f-.015f/spec.stepHeight;
                edgeMesh.vertices=new[]{new Vector3(-.5f,.50001f,-.5f),new Vector3(-.5f,.50001f,-.45f),new Vector3(.5f,.50001f,-.45f),new Vector3(.5f,.50001f,-.5f),
                    new Vector3(-.5f,lip,-.50001f),new Vector3(-.5f,.50001f,-.50001f),new Vector3(.5f,.50001f,-.50001f),new Vector3(.5f,lip,-.50001f)};
                edgeMesh.triangles=new[]{0,1,2,0,2,3,4,5,6,4,6,7};edgeMesh.RecalculateNormals();edgeMesh.RecalculateBounds();
            }
            Mesh treadMesh=null;
            for(int i=0;i<spec.stepCount;i++)
            {
                var step=material?GameObject.CreatePrimitive(PrimitiveType.Cube):new GameObject();
                step.name=spec.id+" step "+i;SceneManager.MoveGameObjectToScene(step,root.scene);step.transform.SetParent(root.transform,false);
                step.layer=CollisionLayers.MovingSteps;step.transform.localScale=lane.half*2;
                var collider=step.GetComponent<BoxCollider>();
                if(collision){if(!collider)collider=step.AddComponent<BoxCollider>();collider.sharedMaterial=physical;collider.contactOffset=.001f;}
                else if(collider)DestroyImmediate(collider);
                if(material)
                {
                    if(!treadMesh)
                    {
                        treadMesh=UnityEngine.Object.Instantiate(step.GetComponent<MeshFilter>().sharedMesh);
                        treadMesh.name=spec.id+" metric tread";
                        var points=treadMesh.vertices;var normals=treadMesh.normals;var uv=new Vector2[points.Length];
                        for(int j=0;j<points.Length;j++)
                        {
                            var metric=Vector3.Scale(points[j],lane.half*2);var n=normals[j];
                            uv[j]=(Mathf.Abs(n.y)>.5f?new Vector2(metric.x,metric.z):
                                Mathf.Abs(n.z)>.5f?new Vector2(metric.x,metric.y):new Vector2(metric.z,metric.y))/2.4f;
                        }
                        treadMesh.uv=uv;treadMesh.RecalculateTangents();
                    }
                    step.GetComponent<MeshFilter>().sharedMesh=treadMesh;
                    step.GetComponent<MeshRenderer>().sharedMaterial=material;
                }
                if(edgeMesh)
                {
                    var edge=new GameObject(spec.id+" nosing "+i);SceneManager.MoveGameObjectToScene(edge,root.scene);edge.transform.SetParent(step.transform,false);
                    edge.layer=CollisionLayers.MovingSteps;edge.AddComponent<MeshFilter>().sharedMesh=edgeMesh;edge.AddComponent<MeshRenderer>().sharedMaterial=edgeMaterial;
                }
                lane.steps[i]=step.transform;lane.colliders[i]=collision?collider:null;
            }
            lane.BuildDeck(physical,casingMaterial?casingMaterial:material,walking);
            StationMotion.Register(lane);return lane;
        }
        public void SetTime(double time)
        {
            if(steps==null)return;Prepare();
            for(int i=0;i<steps.Length;i++){Pose(i,time,out var p,out _,out _);steps[i].localPosition=p;}
        }
        public void Pose(int step,double time,out Vector3 center,out Vector3 velocity,out double nextBoundary)
        {
            Prepare();double speed=specification.speed;
            double at=(step*pitch+specification.phase*pitch+speed*time)%length;if(at<0)at+=length;
            int index=Array.BinarySearch(distance,at);
            if(index<0)index=~index-1;
            if(speed<0&&Math.Abs(at-distance[index])<1e-10){if(index==0){at=length;index=distance.Length-2;}else index--;}
            index=Math.Min(index,distance.Length-2);
            double segment=distance[index+1]-distance[index];
            Vector3 tangent=(specification.path[index+1]-specification.path[index])/(float)segment;
            center=specification.path[index]+tangent*(float)(at-distance[index])-Vector3.up*half.y;
            velocity=tangent*(float)speed;
            nextBoundary=speed>0?(distance[index+1]-at)/speed:speed<0?(distance[index]-at)/speed:double.PositiveInfinity;
        }
        public bool Near(Vector3 point,float radius)
        {Prepare();return envelope.SqrDistance(transform.InverseTransformPoint(point))<=radius*radius;}
        public bool WalkingVelocity(Vector3 feet,out Vector3 velocity)
        {
            velocity=Vector3.zero;Vector3 q=transform.InverseTransformPoint(feet);
            if(Mathf.Abs(q.x)>specification.width*.5f||q.z < -specification.flatLength||q.z>specification.run+specification.flatLength)return false;
            int n=specification.publicPointCount;
            int index=Mathf.Clamp(Mathf.FloorToInt((q.z+specification.flatLength)/(specification.run+2*specification.flatLength)*(n-1)),0,n-2);
            Vector3 a=specification.path[index],b=specification.path[index+1];
            float y=Mathf.Lerp(a.y,b.y,Mathf.InverseLerp(a.z,b.z,q.z));
            if(q.y-y<-.08f||q.y-y>.35f)return false;
            velocity=transform.TransformDirection((b-a).normalized*specification.speed);return true;
        }
        public bool Sweep(Vector3 origin,Vector3 displacement,float radius,double time,float duration,out MovingContact hit,bool freeze=false,bool exhaustive=false)
        {
            hit=default;hit.time=duration;
            if(!Near(origin,displacement.magnitude+radius))return false;
            Vector3 p=transform.InverseTransformPoint(origin),d=transform.InverseTransformDirection(displacement);
            bool found=false;Vector3 travel=duration>0?d/duration:Vector3.zero;
            SelectCandidates(p,d,radius,time,freeze?0:duration,exhaustive);
            foreach(int step in candidates)
            {
                Pose(step,time,out var initial,out _,out _);
                if(freeze)
                {
                    if(SweptSphereBox.Cast(p-initial,d,half,radius,out float f,out var n,out var q)&&(!found||f<hit.time))
                    {Pose(step,time,out _,out var speed,out _);hit=new MovingContact{time=f,point=transform.TransformPoint(initial+q),normal=transform.TransformDirection(n),velocity=transform.TransformDirection(speed),collider=colliders[step],surface=surface};found=true;}
                    continue;
                }
                Vector3 extra=half+Vector3.one*(radius+Mathf.Abs(specification.speed)*duration);
                bool separate=false;
                for(int axis=0;axis<3;axis++)if(Mathf.Max(p[axis],p[axis]+d[axis])<initial[axis]-extra[axis]
                    ||Mathf.Min(p[axis],p[axis]+d[axis])>initial[axis]+extra[axis]){separate=true;break;}
                if(separate)continue;
                double elapsed=0;
                while(elapsed<duration-1e-10&&elapsed<=hit.time)
                {
                    Pose(step,time+elapsed,out var center,out var velocity,out var until);
                    float span=(float)Math.Min(duration-elapsed,Math.Max(1e-9,until));
                    Vector3 relative=(travel-velocity)*span;
                    if(SweptSphereBox.Cast(p+travel*(float)elapsed-center,relative,half,radius,out float fraction,out var normal,out var contact))
                    {
                        float at=(float)elapsed+fraction*span;
                        if(!found||at<hit.time)
                        {
                            hit=new MovingContact{time=at,point=transform.TransformPoint(center+velocity*(span*fraction)+contact),
                                normal=transform.TransformDirection(normal),velocity=transform.TransformDirection(velocity),
                                collider=colliders[step],surface=surface};found=true;
                        }
                        break;
                    }
                    elapsed+=span;
                }
            }
            return found;
        }
        void SelectCandidates(Vector3 p,Vector3 d,float radius,double time,float duration,bool exhaustive)
        {
            candidates.Clear();
            if(exhaustive){for(int i=0;i<steps.Length;i++)candidates.Add(i);return;}
            if(++stamp==int.MaxValue){Array.Clear(visited,0,visited.Length);stamp=1;}
            double travel=Math.Abs(specification.speed)*duration;
            float margin=half.z+radius+(float)travel;
            int low=Mathf.Max(0,Mathf.FloorToInt(Mathf.Min(p.z,p.z+d.z)-margin)-firstBucket);
            int high=Mathf.Min(buckets.Length-1,Mathf.FloorToInt(Mathf.Max(p.z,p.z+d.z)+margin)-firstBucket);
            double offset=(specification.phase*pitch+specification.speed*time)%length;if(offset<0)offset+=length;
            for(int bin=low;bin<=high;bin++)foreach(var span in buckets[bin])
            {
                int start=(int)Math.Ceiling((span.low-travel-offset)/pitch-1e-6);
                int end=(int)Math.Floor((span.high+travel-offset)/pitch+1e-6);
                for(int index=start;index<=end;index++)
                {
                    int step=index%steps.Length;if(step<0)step+=steps.Length;
                    if(visited[step]==stamp)continue;visited[step]=stamp;candidates.Add(step);
                }
            }
        }
        void BuildDeck(PhysicsMaterial physical,Material material,bool walking)
        {
            var vertices=new List<Vector3>();var triangles=new List<int>();
            void Face(Vector3 a,Vector3 b,Vector3 c,Vector3 d)
            {int i=vertices.Count;vertices.AddRange(new[]{a,b,c,d});triangles.AddRange(new[]{i,i+1,i+2,i,i+2,i+3});}
            void MeshObject(string name,int layer,bool collider,Material appearance)
            {
                var obj=new GameObject(specification.id+name);SceneManager.MoveGameObjectToScene(obj,gameObject.scene);obj.transform.SetParent(transform,false);obj.layer=layer;
                var mesh=new Mesh{name=obj.name};mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();
                if(collider){var c=obj.AddComponent<MeshCollider>();c.sharedMesh=mesh;c.sharedMaterial=physical;c.contactOffset=.001f;}
                if(appearance){obj.AddComponent<MeshFilter>().sharedMesh=mesh;obj.AddComponent<MeshRenderer>().sharedMaterial=appearance;}
                var s=obj.AddComponent<Surface>();s.surfaceId=specification.id+"-chassis";s.displayName="ESCALATOR CASING";
                vertices.Clear();triangles.Clear();
            }
            Vector3 Side(Vector3 p,float x,float y)=>p+new Vector3(x,y,0);
            float width=specification.width*.5f;
            if(walking&&collision)
            {
                for(int i=0;i<specification.publicPointCount-1;i++)
                {var a=specification.path[i];var b=specification.path[i+1];Face(Side(a,-width,0),Side(b,-width,0),Side(b,width,0),Side(a,width,0));}
                MeshObject(" walking surface",CollisionLayers.WalkingAssist,true,null);
            }
            // Closed undertray and side casings conceal the return chain. Their
            // solid collision faces stop a ball entering the mechanism from below.
            for(int part=0;part<3;part++)
            {
                float x0=part==0?-width-.05f:part==1?-width-.05f:width+.004f;
                float x1=part==0?width+.05f:part==1?-width-.004f:width+.05f;
                float top=part==0?-.30f:.04f,bottom=-1.08f;
                for(int i=0;i<specification.publicPointCount-1;i++)
                {
                    var a=specification.path[i];var b=specification.path[i+1];
                    Face(Side(a,x0,top),Side(b,x0,top),Side(b,x1,top),Side(a,x1,top));
                    Face(Side(a,x1,bottom),Side(b,x1,bottom),Side(b,x0,bottom),Side(a,x0,bottom));
                    Face(Side(a,x0,bottom),Side(b,x0,bottom),Side(b,x0,top),Side(a,x0,top));
                    Face(Side(a,x1,top),Side(b,x1,top),Side(b,x1,bottom),Side(a,x1,bottom));
                }
                var first=specification.path[0];var last=specification.path[specification.publicPointCount-1];
                Face(Side(first,x0,bottom),Side(first,x0,top),Side(first,x1,top),Side(first,x1,bottom));
                Face(Side(last,x1,bottom),Side(last,x1,top),Side(last,x0,top),Side(last,x0,bottom));
                MeshObject(" casing "+part,0,collision,material);
            }
        }
    }
}
