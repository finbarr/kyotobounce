using UnityEngine;

namespace Kyoto
{
    // Exact linear sweep against a box's rounded Minkowski boundary: six faces,
    // twelve edge cylinders and eight corner spheres. No ray-sized approximation.
    public static class SweptSphereBox
    {
        public static bool Cast(Vector3 p,Vector3 d,Vector3 half,float radius,
            out float fraction,out Vector3 normal,out Vector3 point)
        {
            fraction=1;normal=point=Vector3.zero;
            float enter=0,leave=1;
            for(int axis=0;axis<3;axis++)
            {
                float h=half[axis]+radius;
                if(Mathf.Abs(d[axis])<1e-10f){if(Mathf.Abs(p[axis])>h)return false;continue;}
                float a=(-h-p[axis])/d[axis],b=(h-p[axis])/d[axis];
                enter=Mathf.Max(enter,Mathf.Min(a,b));leave=Mathf.Min(leave,Mathf.Max(a,b));
                if(enter>leave)return false;
            }
            Vector3 closest=Clamp(p,half),offset=p-closest;
            if(offset.sqrMagnitude<=radius*radius)
            {
                normal=offset.normalized;
                if(offset.sqrMagnitude<1e-16f)
                {
                    int axis=0;float gap=half.x-Mathf.Abs(p.x);
                    for(int i=1;i<3;i++)if(half[i]-Mathf.Abs(p[i])<gap){axis=i;gap=half[i]-Mathf.Abs(p[i]);}
                    normal[axis]=p[axis]<0?-1:1;closest=p;closest[axis]=normal[axis]*half[axis];
                }
                if(Vector3.Dot(d,normal)>=0)return false;
                fraction=0;point=closest;return true;
            }
            float best=2;
            void Candidate(float t)
            {
                if(t<0||t>1||t>=best)return;
                Vector3 q=p+d*t,delta=q-Clamp(q,half);
                if(Vector3.Dot(d,delta)>=0)return;
                best=t;
            }
            void Root(float a,float b,float c,int freeAxis=-1)
            {
                if(a<1e-20f)return;
                // Double precision avoids losing a small sphere next to a long ray.
                double disc=(double)b*b-4*(double)a*c;if(disc<0)return;
                float t=(float)((-b-System.Math.Sqrt(disc))/(2*a));
                if(freeAxis>=0&&Mathf.Abs(p[freeAxis]+d[freeAxis]*t)>half[freeAxis])return;
                Candidate(t);
            }
            for(int axis=0;axis<3;axis++)
            {
                int j=(axis+1)%3,k=(axis+2)%3;
                if(Mathf.Abs(d[axis])>1e-10f)for(int sign=-1;sign<=1;sign+=2)
                {
                    float t=(sign*(half[axis]+radius)-p[axis])/d[axis];Vector3 q=p+d*t;
                    if(Mathf.Abs(q[j])<=half[j]&&Mathf.Abs(q[k])<=half[k])Candidate(t);
                }
                for(int sj=-1;sj<=1;sj+=2)for(int sk=-1;sk<=1;sk+=2)
                {
                    float a=p[j]-sj*half[j],b=p[k]-sk*half[k];
                    Root(d[j]*d[j]+d[k]*d[k],2*(a*d[j]+b*d[k]),a*a+b*b-radius*radius,axis);
                }
            }
            for(int x=-1;x<=1;x+=2)for(int y=-1;y<=1;y+=2)for(int z=-1;z<=1;z+=2)
            {
                Vector3 q=p-Vector3.Scale(half,new Vector3(x,y,z));
                Root(d.sqrMagnitude,2*Vector3.Dot(q,d),q.sqrMagnitude-radius*radius);
            }
            if(best>1)return false;
            fraction=best;point=Clamp(p+d*best,half);normal=(p+d*best-point).normalized;return true;
        }
        static Vector3 Clamp(Vector3 q,Vector3 h)=>new Vector3(Mathf.Clamp(q.x,-h.x,h.x),Mathf.Clamp(q.y,-h.y,h.y),Mathf.Clamp(q.z,-h.z,h.z));
    }
}
