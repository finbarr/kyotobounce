using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering;

namespace Kyoto
{
    // Visual scene, live collision and prediction all consume the same description.
    public static class StationWorld
    {
        public static void Create(Transform parent,StationLayout layout,bool collision=true,bool walking=true,
            IReadOnlyDictionary<string,Material> appearance=null)
        {
            appearance=AuthoredStationMaterials.Merge(layout,appearance);
            var worldTextureSpans=new Dictionary<string,float>();
            if(layout.authoredMaterials!=null)foreach(var m in layout.authoredMaterials)
                if(m.worldTextureSpan>0)worldTextureSpans[m.id]=m.worldTextureSpan;
            var physical=new Dictionary<string,PhysicsMaterial>
            {
                {"stone",Surface.Material("Stone · provisional",.70f,.43f)},
                {"granite",Surface.Material("Granite · provisional",.76f,.24f)},
                {"granite-cladding",Surface.Material("Granite cladding · provisional",.76f,.24f)},
                {"facade",Surface.Material("Cladding · provisional",.70f,.32f)},
                {"steel",Surface.Material("Steel · provisional",.64f,.20f)},
                {"silver",Surface.Material("Metal cladding · provisional",.64f,.20f)},
                {"dark-metal",Surface.Material("Facade frame · provisional",.64f,.20f)},
                {"bronze",Surface.Material("Bell bronze · provisional",.64f,.20f)},
                {"roof",Surface.Material("Canopy steel · provisional",.64f,.20f)},
                {"glass",Surface.Material("Glass · provisional",.72f,.18f)},
                {"window",Surface.Material("Facade glass · provisional",.72f,.18f)},
                {"limestone",Surface.Material("Limestone · provisional",.70f,.43f)},
                {"rose",Surface.Material("Facade stone · provisional",.70f,.43f)},
                {"rubber",Surface.Material("Rubber handrail · provisional",.60f,.50f)},
                {"escalator",Surface.Material("Escalator tread · provisional",.64f,.24f)},
                {"grass",Surface.Material("Garden turf · provisional",0.320f,0.650f)},
                {"soil",Surface.Material("Planting soil · provisional",0.220f,0.700f)},
                {"leaves",Surface.Material("Bamboo foliage · provisional",0.220f,0.700f)},
                {"bamboo",Surface.Material("Bamboo culm · provisional",0.400f,0.500f)},
                {"wood",Surface.Material("Timber bench · provisional",0.500f,0.430f)},
                {"garden-paving",Surface.Material("Garden paving · provisional",0.700f,0.430f)},
                {"garden-court",Surface.Material("Garden court · provisional",0.700f,0.430f)},
                {"garden-yellow",Surface.Material("Yellow painted metal · provisional",0.640f,0.200f)},
                {"garden-blue",Surface.Material("Blue painted metal · provisional",0.640f,0.200f)},
                {"garden-red",Surface.Material("Red painted metal · provisional",0.640f,0.200f)},
                {"tower-white",Surface.Material("Tower painted steel · provisional",.64f,.20f)},
                {"tower-red",Surface.Material("Tower painted steel · provisional",.64f,.20f)},
                {"tower-window",Surface.Material("Tower glazing · provisional",.72f,.18f)},
                {"asphalt",Surface.Material("Asphalt · provisional",.68f,.50f)},
                {"road-paint",Surface.Material("Road marking · visual only",.68f,.50f)},
                {"planting",Surface.Material("Planter · provisional",.48f,.50f)}
            };
            Material Visual(string key)=>appearance!=null&&appearance.TryGetValue(key,out var m)?m:null;
            PhysicsMaterial Physical(string key)=>physical.TryGetValue(key,out var m)?m:physical["stone"];
            void AssociateResponse(GameObject obj,string key)
            {
                var surface=obj.GetComponent<Surface>();
                // Appearance chooses an explicit pair; it does not turn every
                // stone, stair or cladding contact into polished laboratory granite.
                if(surface)surface.useBallReferenceResponse=key=="granite";
            }
            var batches=new Dictionary<string,List<CombineInstance>>();int batchIndex=0;
            void Flush(string key)
            {
                if(!batches.TryGetValue(key,out var list)||list.Count==0)return;
                string name="Layout "+key+" batch "+batchIndex++;
                var obj=Child(parent,name,Vector3.zero);var mesh=new Mesh{name=name,indexFormat=IndexFormat.UInt32};
                mesh.CombineMeshes(list.ToArray(),true,true);mesh.RecalculateBounds();
                obj.AddComponent<MeshFilter>().sharedMesh=mesh;obj.AddComponent<MeshRenderer>().sharedMaterial=Visual(key);list.Clear();
            }
            void Batch(string key,Mesh mesh,Matrix4x4 matrix,bool isolatedLighting=false)
            {
                // A stair flight must not inherit one lighting sample from a
                // station-wide material batch. Preserve its local bake bounds.
                if(isolatedLighting)Flush(key);
                if(!batches.TryGetValue(key,out var list)){list=new List<CombineInstance>();batches.Add(key,list);}
                list.Add(new CombineInstance{mesh=mesh,transform=matrix});if(isolatedLighting||list.Count>=384)Flush(key);
            }
            foreach(var b in layout.boxes)
            {
                GameObject obj;
                if(collision&&b.collision)obj=StationGeometry.Box(parent,b.id,b.center,b.size,Physical(b.material),b.id,b.role.ToUpperInvariant());
                else obj=Child(parent,b.id,b.center);
                obj.transform.localRotation=Quaternion.Euler(0,b.yaw,0);
                AssociateResponse(obj,b.material);
                if(b.role=="step-edge")obj.layer=CollisionLayers.BallStairs;
                string appearanceKey=string.IsNullOrEmpty(b.appearance)?b.material:b.appearance;
                if(Visual(appearanceKey))
                {
                    var visual=Primitive(obj.transform,PrimitiveType.Cube,Visual(appearanceKey));
                    visual.transform.localScale=b.size;
                    if(worldTextureSpans.TryGetValue(appearanceKey,out float span))
                    {
                        var filter=visual.GetComponent<MeshFilter>();var mesh=Object.Instantiate(filter.sharedMesh);
                        mesh.name=b.id+" authored texture coordinates";var vertices=mesh.vertices;var uv=new Vector2[vertices.Length];
                        for(int i=0;i<uv.Length;i++)
                        {
                            var point=visual.transform.TransformPoint(vertices[i]);uv[i]=new Vector2(point.x,point.z)/span;
                        }
                        mesh.uv=uv;mesh.RecalculateTangents();filter.sharedMesh=mesh;
                    }
                }
            }
            foreach(var f in layout.flights)
            {
                string material=string.IsNullOrEmpty(f.material)?"stone":f.material;
                if(f.role!="escalator")
                {
                    bool stoneStair=material=="stone"&&f.rise>0;
                    bool stoneLanding=material=="stone"&&f.role=="landing";
                    var flight=StairGeometry.Create(parent,f.id,f.Rows(),f.baseElevation,f.rise,Physical(material),
                        Visual(string.IsNullOrEmpty(f.appearance)?(stoneStair||stoneLanding?"stair-stone":material):f.appearance),walking,collision,.3f,stoneStair?Visual(string.IsNullOrEmpty(f.treadAppearance)?"stair-tread":f.treadAppearance):null);
                    AssociateResponse(flight,material);
                }
                if(f.foundationDepth>0)
                    StairGeometry.Create(parent,f.id+" foundation",new[]{f.contours[0].points,f.contours[f.contours.Length-1].points},
                        f.baseElevation-.31f,0,Physical("facade"),Visual("facade"),false,collision,f.foundationDepth);
            }
            if(layout.escalators!=null)foreach(var e in layout.escalators)
                MovingEscalator.Create(parent,e,Physical("escalator"),Visual("escalator"),collision,walking,
                    Visual(e.id.StartsWith("east-skyway-escalator")?"escalator-edge":"escalator-silver-edge"),Visual("escalator-casing"));
            if(layout.panels!=null)foreach(var p in layout.panels)
            {
                if(p.playerOnly&&!walking)continue;
                bool stairFloor=p.material=="stone"&&(p.role=="landing"||(p.role=="building-floor"&&p.id.StartsWith("west-")));
                string appearanceKey=string.IsNullOrEmpty(p.appearance)?(stairFloor?"stair-stone":p.material):p.appearance;
                var obj=Child(parent,p.id,Vector3.zero);
                var mesh=new Mesh{name=p.id,indexFormat=p.vertices.Length>65535?IndexFormat.UInt32:IndexFormat.UInt16};mesh.vertices=p.vertices;mesh.triangles=p.triangles;
                if(p.normals!=null&&p.normals.Length==p.vertices.Length)mesh.normals=p.normals;else mesh.RecalculateNormals();
                mesh.RecalculateBounds();
                Vector3 meshOrigin=Vector3.zero;
                if(p.role=="city-ground")
                {
                    // Keep the narrow curb faces near their collider's origin.
                    // World-coordinate vertices caused millimetre-scale PhysX
                    // contact errors; rendering uses the same translated mesh.
                    meshOrigin=mesh.bounds.center;
                    var local=new Vector3[p.vertices.Length];
                    for(int i=0;i<local.Length;i++)local[i]=p.vertices[i]-meshOrigin;
                    mesh.vertices=local;mesh.RecalculateBounds();obj.transform.localPosition=meshOrigin;
                }
                if(p.material=="garden-court"&&appearance!=null)
                {
                    // One texture repeats every four metres. World coordinates
                    // keep the module consistent across the triangulated slab.
                    var uv=new Vector2[p.vertices.Length];
                    var origin=mesh.bounds.min;
                    for(int i=0;i<uv.Length;i++)uv[i]=new Vector2((p.vertices[i].x-origin.x)*.25f,(p.vertices[i].z-origin.z)*.25f);
                    mesh.uv=uv;mesh.RecalculateTangents();
                }
                if(stairFloor&&appearance!=null)
                {
                    var uv=new Vector2[p.vertices.Length];var normals=mesh.normals;
                    for(int i=0;i<uv.Length;i++)
                    {
                        var point=p.vertices[i];var n=normals[i];
                        uv[i]=(Mathf.Abs(n.y)>.75f?new Vector2(point.x,point.z):
                            Mathf.Abs(n.x)>Mathf.Abs(n.z)?new Vector2(point.z,point.y):new Vector2(point.x,point.y))/2.4f;
                    }
                    mesh.uv=uv;mesh.RecalculateTangents();
                }
                if(p.uv!=null&&p.uv.Length==p.vertices.Length){mesh.uv=p.uv;mesh.RecalculateTangents();}
                if(p.playerOnly)obj.layer=CollisionLayers.WalkingAssist;else if(p.ballStairs)obj.layer=CollisionLayers.BallStairs;
                if((p.playerOnly?walking:collision)&&p.collision)
                {
                    var collider=obj.AddComponent<MeshCollider>();collider.sharedMesh=mesh;collider.sharedMaterial=Physical(p.material);collider.contactOffset=.001f;
                    if(!p.playerOnly)
                    {
                    var surface=obj.AddComponent<Surface>();surface.surfaceId=p.id;
                    surface.displayName=p.id.Contains("balustrade")?"GLASS BALUSTRADE":p.id.StartsWith("canopy")?"CANOPY GLASS":p.id.StartsWith("east-end-screen-")?"GLAZED END WALL":"GLAZED BRIDGE ROOF";surface.tone=1600;
                    if(!string.IsNullOrEmpty(p.role)){surface.displayName=p.role.ToUpperInvariant();surface.tone=420;}
                    AssociateResponse(obj,p.material);
                    }
                }
                if(!p.playerOnly&&p.finishes!=null&&p.finishes.Length>0&&appearance!=null)
                {
                    foreach(var finish in p.finishes)
                    {
                        var part=new Mesh{name=p.id+" finish",indexFormat=mesh.indexFormat};
                        part.vertices=mesh.vertices;part.normals=mesh.normals;part.uv=mesh.uv;part.triangles=finish.triangles;
                        part.RecalculateTangents();part.RecalculateBounds();Batch(finish.appearance,part,Matrix4x4.Translate(meshOrigin),p.ballStairs);
                    }
                }
                else if(!p.playerOnly&&Visual(appearanceKey))
                {
                    Batch(appearanceKey,mesh,Matrix4x4.Translate(meshOrigin),p.ballStairs);
                }
            }
            Mesh cube=null,cylinder=null;
            if(appearance!=null)
            {
                var temp=GameObject.CreatePrimitive(PrimitiveType.Cube);cube=temp.GetComponent<MeshFilter>().sharedMesh;Object.DestroyImmediate(temp);
                temp=GameObject.CreatePrimitive(PrimitiveType.Cylinder);cylinder=temp.GetComponent<MeshFilter>().sharedMesh;Object.DestroyImmediate(temp);
            }
            int index=0;
            foreach(var b in layout.beams)
            {
                Vector3 delta=b.b-b.a;
                if(delta.sqrMagnitude<1e-8f)continue;
                Quaternion rotation=Quaternion.FromToRotation(Vector3.up,delta.normalized);bool square=b.profile=="square";
                if(collision&&b.collision)
                {
                    var obj=Child(parent,b.id+" "+index++,(b.a+b.b)*.5f);obj.transform.localRotation=rotation;
                    Collider c;
                    if(square){var box=obj.AddComponent<BoxCollider>();box.size=new Vector3(b.radius*2,delta.magnitude,b.radius*2);c=box;}
                    else{var capsule=obj.AddComponent<CapsuleCollider>();capsule.radius=b.radius;capsule.height=delta.magnitude+2*b.radius;capsule.direction=1;c=capsule;}
                    c.contactOffset=.001f;c.sharedMaterial=Physical(b.material);
                    var s=obj.AddComponent<Surface>();s.surfaceId=b.id;s.displayName=b.id.Replace('-',' ').ToUpperInvariant();s.tone=1200;
                    if(b.material=="rubber"&&layout.escalators!=null)foreach(var lane in layout.escalators)
                    {
                        bool handrail=b.id.StartsWith(lane.id+"-handrail"),turn=b.id.StartsWith(lane.id+"-belt-return");
                        if(!handrail&&!turn)continue;
                        float sign=1;
                        if(turn)sign=Vector3.Dot((b.a+b.b)*.5f-lane.lowerCenter,lane.uphill)>lane.run*.5f?1:-1;
                        s.contactVelocity=delta.normalized*lane.speed*sign;break;
                    }
                    AssociateResponse(obj,b.material);
                }
                string appearanceKey=string.IsNullOrEmpty(b.appearance)?b.material:b.appearance;
                if(Visual(appearanceKey))
                {
                    Batch(appearanceKey,square?cube:cylinder,Matrix4x4.TRS((b.a+b.b)*.5f,rotation,new Vector3(b.radius*2,delta.magnitude*(square?1:.5f),b.radius*2)));
                }
            }
            foreach(var key in batches.Keys)Flush(key);
            if(layout.municipalGeometry!=null&&!string.IsNullOrEmpty(layout.municipalGeometry.resource))
            {
                var reference=layout.municipalGeometry;
                var municipal=Resources.Load<MunicipalGeometry>(reference.resource);
                if(!municipal||municipal.geometrySha256!=reference.geometrySha256||municipal.manifestSha256!=reference.manifestSha256)
                    throw new System.InvalidOperationException("Municipal geometry does not match the shared layout reference.");
                municipal.Create(parent,collision,appearance!=null,Physical);
            }
        }
        static GameObject Child(Transform parent,string name,Vector3 local)
        {
            var obj=new GameObject(name);
            if(parent&&obj.scene!=parent.gameObject.scene)SceneManager.MoveGameObjectToScene(obj,parent.gameObject.scene);
            obj.transform.SetParent(parent,false);obj.transform.localPosition=local;return obj;
        }
        static GameObject Primitive(Transform parent,PrimitiveType type,Material material)
        {
            var obj=GameObject.CreatePrimitive(type);obj.name="Appearance";
            if(obj.scene!=parent.gameObject.scene)SceneManager.MoveGameObjectToScene(obj,parent.gameObject.scene);
            obj.transform.SetParent(parent,false);
            Object.DestroyImmediate(obj.GetComponent<Collider>());
            obj.GetComponent<Renderer>().sharedMaterial=material;return obj;
        }
    }
}
