using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    public static class StairGeometry
    {
        // Every contour runs north edge to south edge in the plan; successive contours
        // proceed uphill. Exact treads and the player's slope share these same boundaries.
        public static GameObject Create(Transform parent,string id,Vector2[][] contours,float baseY,float rise,
            PhysicsMaterial physical,Material appearance=null,bool walking=true,bool collision=true,float depth=.3f,Material treadAppearance=null)
        {
            if(contours.Length<2)throw new ArgumentException("A flight needs front and back contours.");
            int columns=contours[0].Length;
            if(columns<2)throw new ArgumentException("A contour needs both stair edges.");
            foreach(var row in contours)if(row.Length!=columns)throw new ArgumentException("Resample contours to equal point counts.");
            var root=new GameObject(id);
            if(parent&&root.scene!=parent.gameObject.scene)SceneManager.MoveGameObjectToScene(root,parent.gameObject.scene);
            root.transform.SetParent(parent,false);root.layer=rise>0?CollisionLayers.BallStairs:0;
            var vertices=new List<Vector3>();var triangles=new List<int>();
            var uv=new List<Vector2>();var topTriangles=new List<int>();var bodyTriangles=new List<int>();
            bool topFace=false;int faceRow=0,faceColumn=0;
            var contourDistance=new float[contours.Length,columns];
            for(int row=0;row<contours.Length;row++)for(int col=1;col<columns;col++)
                contourDistance[row,col]=contourDistance[row,col-1]+Vector2.Distance(contours[row][col-1],contours[row][col]);
            int steps=contours.Length-1;
            float bottom=baseY-depth;
            Vector3 P(int row,int col,float y)=>new Vector3(contours[row][col].x,y,contours[row][col].y);
            void Quad(Vector3 a,Vector3 b,Vector3 c,Vector3 d)
            {
                int i=vertices.Count;vertices.AddRange(new[]{a,b,c,d});
                triangles.AddRange(new[]{i,i+1,i+2,i,i+2,i+3});
                (topFace?topTriangles:bodyTriangles).AddRange(new[]{i,i+1,i+2,i,i+2,i+3});
                var normal=Vector3.Cross(b-a,c-a).normalized;
                var front=P(faceRow,faceColumn,a.y);var across=(P(faceRow,faceColumn+1,a.y)-front).normalized;
                foreach(var point in new[]{a,b,c,d})
                {
                    Vector2 metric;
                    if(topFace)
                    {
                        var delta=point-front;delta.y=0;
                        metric=new Vector2(contourDistance[faceRow,faceColumn]+Vector3.Dot(delta,across),
                            Mathf.Abs(Vector3.Dot(delta,Vector3.Cross(across,Vector3.up))));
                    }
                    else metric=Mathf.Abs(normal.y)>.75f?new Vector2(point.x,point.z):
                        Mathf.Abs(normal.x)>Mathf.Abs(normal.z)?new Vector2(point.z,point.y):new Vector2(point.x,point.y);
                    uv.Add(metric/2.4f);
                }
            }
            // Orient top faces upward independent of the flight's compass direction.
            bool reversed=Vector3.Cross(P(0,columns-1,0)-P(0,0,0),P(1,0,0)-P(0,0,0)).y<0;
            void Face(Vector3 a,Vector3 b,Vector3 c,Vector3 d)
            {if(reversed)Quad(d,c,b,a);else Quad(a,b,c,d);}
            for(int row=0;row<steps;row++)
            {
                float y=baseY+(row+1)*rise,previous=baseY+row*rise;
                for(int col=0;col<columns-1;col++)
                {
                    faceRow=row;faceColumn=col;topFace=true;
                    Face(P(row,col,y),P(row,col+1,y),P(row+1,col+1,y),P(row+1,col,y));
                    topFace=false;
                    if(rise>0)Face(P(row,col,previous),P(row,col+1,previous),P(row,col+1,y),P(row,col,y));
                    Face(P(row+1,col,bottom),P(row+1,col+1,bottom),P(row,col+1,bottom),P(row,col,bottom));
                }
                Face(P(row,0,bottom),P(row,0,y),P(row+1,0,y),P(row+1,0,bottom));
                Face(P(row+1,columns-1,bottom),P(row+1,columns-1,y),P(row,columns-1,y),P(row,columns-1,bottom));
            }
            for(int col=0;col<columns-1;col++)
            {
                Face(P(steps,col,baseY+steps*rise),P(steps,col+1,baseY+steps*rise),P(steps,col+1,bottom),P(steps,col,bottom));
                Face(P(0,col,bottom),P(0,col+1,bottom),P(0,col+1,baseY),P(0,col,baseY));
            }
            // Both rendered and prediction worlds use the same two triangle groups.
            // Positions, winding and physical material are unchanged; sorting only
            // permits the tread finish to differ from the riser/side finish.
            var mesh=new Mesh{name=id+" individual treads"};mesh.SetVertices(vertices);mesh.subMeshCount=2;
            mesh.SetTriangles(topTriangles,0);mesh.SetTriangles(bodyTriangles,1);mesh.SetUVs(0,uv);
            mesh.RecalculateNormals();mesh.RecalculateTangents();mesh.RecalculateBounds();
            if(collision)
            {
                var collider=root.AddComponent<MeshCollider>();collider.sharedMesh=mesh;collider.sharedMaterial=physical;collider.contactOffset=.001f;
                var surface=root.AddComponent<Surface>();surface.surfaceId=id;surface.displayName=rise>0?"STAIR FLIGHT":"LANDING";surface.rollingResistance=.024f;
            }
            if(appearance){root.AddComponent<MeshFilter>().sharedMesh=mesh;root.AddComponent<MeshRenderer>().sharedMaterials=new[]{treadAppearance?treadAppearance:appearance,appearance};}
            if(walking&&collision&&rise>0)
            {
                var assist=new GameObject(id+" walking surface");SceneManager.MoveGameObjectToScene(assist,root.scene);
                assist.transform.SetParent(root.transform,false);assist.layer=CollisionLayers.WalkingAssist;
                vertices.Clear();triangles.Clear();
                for(int row=0;row<steps;row++)for(int col=0;col<columns-1;col++)
                    Face(P(row,col,baseY+row*rise),P(row,col+1,baseY+row*rise),
                        P(row+1,col+1,baseY+(row+1)*rise),P(row+1,col,baseY+(row+1)*rise));
                var ramp=new Mesh{name=id+" player-only interpolation"};ramp.SetVertices(vertices);ramp.SetTriangles(triangles,0);ramp.RecalculateNormals();ramp.RecalculateBounds();
                assist.AddComponent<MeshCollider>().sharedMesh=ramp;
            }
            return root;
        }
    }
}
