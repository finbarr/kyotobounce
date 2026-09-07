using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    public static class StationGeometry
    {
        public static GameObject Box(Transform parent, string name, Vector3 center, Vector3 size,
            PhysicsMaterial material, string id, string label, float rolling = .012f, float tone = 420)
        {
            var obj = new GameObject(name);
            if(parent && obj.scene!=parent.gameObject.scene)SceneManager.MoveGameObjectToScene(obj,parent.gameObject.scene);
            obj.transform.SetParent(parent, false);
            obj.transform.localPosition = center;
            var collider = obj.AddComponent<BoxCollider>();
            collider.size = size; collider.contactOffset = .001f; collider.sharedMaterial = material;
            var surface = obj.AddComponent<Surface>();
            surface.surfaceId = id; surface.displayName = label; surface.rollingResistance = rolling; surface.tone = tone;
            return obj;
        }
        public static void Create(Transform parent)
        {
            var stone = Surface.Material("Polished stone · prototype", .76f, .24f);
            var concrete = Surface.Material("Stair stone · prototype", .7f, .43f);
            var metal = Surface.Material("Steel · prototype", .64f, .20f);
            var escalator = Surface.Material("Escalator · prototype", .55f, .36f);
            Box(parent, "Concourse", new Vector3(0,-.3f,28), new Vector3(48,.6f,108), stone, "floor", "CONCOURSE");
            Box(parent, "West wall", new Vector3(-22.2f,18,28),new Vector3(.6f,36,108),stone,"west","WEST WALL");
            Box(parent, "East wall", new Vector3(22.2f,18,28),new Vector3(.6f,36,108),stone,"east","EAST WALL");
            Box(parent, "Entrance",new Vector3(0,18,-26),new Vector3(45,36,.5f),stone,"entrance","ENTRANCE");
            Box(parent, "Upper hall",new Vector3(0,18,82),new Vector3(45,36,.5f),stone,"upper","UPPER HALL");
            for(int i=0;i<171;i++)
            {
                float h=(i+1)*30f/171;
                Box(parent,"Stair "+i,new Vector3(0,h*.5f,20+(i+.5f)*.26f),new Vector3(18,h,.26f),concrete,"stairs","GREAT STAIRCASE",.024f);
            }
            Box(parent,"Top landing",new Vector3(0,15,73),new Vector3(18,30,17),concrete,"landing","TOP LANDING");
            Box(parent,"Skyway",new Vector3(0,29.7f,6),new Vector3(43,.6f,2.8f),metal,"skyway","SKYWAY");
            Box(parent,"Wayfinding sign",new Vector3(0,4.45f,18.12f),new Vector3(9,1.55f,.14f),metal,"sign","WAYFINDING SIGN");
            for(int side=-1;side<=1;side+=2)
            {
                foreach(float x in new[]{side*10.6f,side*13.3f})
                for(int step=0;step<171;step++)
                {
                    float y=(step+1)*30f/171;
                    Box(parent,"Escalator tread",new Vector3(x,y-.04f,20+(step+.5f)*.26f),new Vector3(2,.09f,.26f),escalator,"escalator"+side,"ESCALATOR",.02f,1000);
                }
                foreach(float z in new[]{-10f,3f,14f})
                    Box(parent,"Bench",new Vector3(side*15.8f,.46f,z),new Vector3(1.2f,.12f,3),concrete,"bench"+side+z,"BENCH",.03f,280);
                for(int floor=1;floor<=3;floor++)
                    Box(parent,"Gallery",new Vector3(side*19.5f,floor*7-.25f,22),new Vector3(5,.5f,96),concrete,"gallery"+floor,"GALLERY");
                for(int i=0;i<12;i++)
                    Box(parent,"Column",new Vector3(side*20,14,-20+i*8),new Vector3(.65f,28,.65f),metal,"column"+side+i,"STEEL COLUMN",.01f,1200);
                var rail=Box(parent,"Stair handrail",new Vector3(side*9.15f,15.9f,42.2f),new Vector3(.12f,.12f,53.6f),metal,"rail"+side,"HANDRAIL",.01f,1400);
                rail.transform.localRotation=Quaternion.Euler(-34.05f,0,0);
            }
        }

        public static GameObject CreateCup(Transform parent, Vector3 position, float radius, Material ceramic = null, Material accent = null)
        {
            var root = new GameObject("Ceramic cup");
            if(parent && root.scene!=parent.gameObject.scene)SceneManager.MoveGameObjectToScene(root,parent.gameObject.scene);
            root.transform.SetParent(parent,false);root.transform.localPosition=position;
            var pm=Surface.Material("Ceramic · prototype",.24f,.40f);
            var floor=new GameObject("Round cup base");SceneManager.MoveGameObjectToScene(floor,root.scene);floor.transform.SetParent(root.transform,false);
            var baseCollider=floor.AddComponent<MeshCollider>();baseCollider.sharedMesh=DiskMesh(radius+.012f,.012f);baseCollider.convex=true;baseCollider.contactOffset=.001f;baseCollider.sharedMaterial=pm;
            var baseSurface=floor.AddComponent<Surface>();baseSurface.surfaceId="cup";baseSurface.displayName="CUP";baseSurface.scores=false;baseSurface.rollingResistance=.08f;baseSurface.tone=1700;
            const int segments=CupCapture.WallSegments; const float thick=.012f;
            for(int i=0;i<segments;i++)
            {
                float angle=i*Mathf.PI*2/segments;
                float a=(radius+thick*.5f);
                var wall=Box(root.transform,"Cup shell",new Vector3(Mathf.Sin(angle)*a,CupCapture.Height*.5f,Mathf.Cos(angle)*a),
                    new Vector3(2*a*Mathf.Tan(Mathf.PI/segments)+.0003f,CupCapture.Height,thick),pm,"cup","CUP",.08f,1700);
                wall.transform.localRotation=Quaternion.Euler(0,angle*Mathf.Rad2Deg,0);
                wall.GetComponent<Surface>().scores=false;
            }
            if(ceramic)
            {
                var meshObject=new GameObject("Glazed shell");meshObject.transform.SetParent(root.transform,false);
                meshObject.AddComponent<MeshFilter>().sharedMesh=CupMesh(radius,thick);
                meshObject.AddComponent<MeshRenderer>().sharedMaterial=ceramic;
                var band=new GameObject("Cobalt foot");band.transform.SetParent(root.transform,false);
                band.transform.localPosition=Vector3.up*.015f;
                band.AddComponent<MeshFilter>().sharedMesh=RingMesh(radius+.0125f,.009f);
                band.AddComponent<MeshRenderer>().sharedMaterial=accent?accent:ceramic;
            }
            return root;
        }
        static Mesh CupMesh(float r,float thickness)
        {
            var verts=new List<Vector3>(); var tris=new List<int>();var uv=new List<Vector2>();
            // Continuous cross-section: underside -> outer wall -> rounded lip -> inner wall -> bowl floor.
            Vector2[] profile={new Vector2(0,0),new Vector2(r+thickness,0),new Vector2(r+thickness,.165f),
                new Vector2(r+thickness*.8f,.17f),new Vector2(r+thickness*.2f,.17f),new Vector2(r,.165f),new Vector2(r,.012f),new Vector2(0,.012f)};
            for(int j=0;j<profile.Length;j++)for(int i=0;i<=96;i++)
            { float a=i*2*Mathf.PI/96;verts.Add(new Vector3(Mathf.Sin(a)*profile[j].x,profile[j].y,Mathf.Cos(a)*profile[j].x));uv.Add(new Vector2(i/96f,j/7f)); }
            for(int j=0;j<profile.Length-1;j++)for(int i=0;i<96;i++)
            {int a=j*97+i,b=a+97;tris.AddRange(new[]{a,a+1,b,b,a+1,b+1});}
            var mesh=new Mesh{name="Thrown ceramic"};mesh.SetVertices(verts);mesh.SetTriangles(tris,0);mesh.SetUVs(0,uv);mesh.RecalculateNormals();mesh.RecalculateBounds();return mesh;
        }
        static Mesh DiskMesh(float radius,float height)
        {
            var v=new List<Vector3>{Vector3.zero,Vector3.up*height};var t=new List<int>();
            for(int i=0;i<64;i++){float a=i*Mathf.PI*2/64;v.Add(new Vector3(Mathf.Sin(a)*radius,0,Mathf.Cos(a)*radius));v.Add(new Vector3(Mathf.Sin(a)*radius,height,Mathf.Cos(a)*radius));}
            for(int i=0;i<64;i++){int a=2+i*2,b=2+((i+1)%64)*2;t.AddRange(new[]{0,b,a,1,a+1,b+1,a,b,b+1,a,b+1,a+1});}
            var m=new Mesh{name="Round ceramic base"};m.SetVertices(v);m.SetTriangles(t,0);m.RecalculateNormals();return m;
        }
        public static Mesh RingMesh(float radius,float tube)
        {
            var v=new List<Vector3>();var t=new List<int>();
            for(int i=0;i<=64;i++)for(int j=0;j<=8;j++)
            {float a=i*Mathf.PI*2/64,b=j*Mathf.PI*2/8;v.Add(new Vector3(Mathf.Sin(a)*(radius+tube*Mathf.Cos(b)),tube*Mathf.Sin(b),Mathf.Cos(a)*(radius+tube*Mathf.Cos(b))));}
            for(int i=0;i<64;i++)for(int j=0;j<8;j++){int a=i*9+j;t.AddRange(new[]{a,a+9,a+1,a+1,a+9,a+10});}
            var m=new Mesh{name="Ring"};m.SetVertices(v);m.SetTriangles(t,0);m.RecalculateNormals();return m;
        }
    }
}
