using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Kyoto
{
    // A licensed exterior source, in the same metre frame as StationLayout.
    // Each part shares one mesh between its appearance and physical surface.
    public sealed class MunicipalGeometry : ScriptableObject
    {
        public int schemaVersion;
        public string geometrySha256,manifestSha256,attribution,sourceUrl;
        public Part[] parts;
        [Serializable] public sealed class Part
        {
            public string id,assembly,surfaceId,physical,role;
            public Vector3 origin;
            public Mesh mesh;
            public Material[] materials;
        }
        public void Create(Transform parent,bool collision,bool visual,Func<string,PhysicsMaterial> physical,
            Predicate<Part> include=null)
        {
            if(schemaVersion!=1||parts==null)throw new InvalidOperationException("Incomplete municipal geometry asset.");
            foreach(var part in parts)
            {
                if(include!=null&&!include(part))continue;
                if(!part.mesh)throw new InvalidOperationException("Missing municipal mesh: "+part.id);
                var obj=new GameObject(part.id);
                if(obj.scene!=parent.gameObject.scene)SceneManager.MoveGameObjectToScene(obj,parent.gameObject.scene);
                obj.transform.SetParent(parent,false);obj.transform.localPosition=part.origin;
                if(collision)
                {
                    var collider=obj.AddComponent<MeshCollider>();collider.sharedMesh=part.mesh;
                    collider.sharedMaterial=physical(part.physical);collider.contactOffset=.001f;
                    var surface=obj.AddComponent<Surface>();surface.surfaceId=part.surfaceId;
                    surface.displayName=part.role=="municipal-building"?"FACADE":part.role=="municipal-shelter"?"SHELTER":part.role=="municipal-fixture"?"FIXTURE":part.physical=="asphalt"?"ASPHALT":part.physical=="grass"?"PLANTING":"PAVEMENT";
                    surface.tone=part.physical=="asphalt"?260:420;
                }
                if(visual)
                {
                    obj.AddComponent<MeshFilter>().sharedMesh=part.mesh;
                    obj.AddComponent<MeshRenderer>().sharedMaterials=part.materials;
                }
            }
        }
    }
}
