using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace Kyoto.Editor
{
    public static class MunicipalGeometryInstall
    {
        [Serializable] sealed class SourcePart
        {public string id,assembly,surfaceId,physical,role;public Vector3 origin;public int vertices,triangles;}
        [Serializable] sealed class SourceMaterial
        {public string name,texture,normalTexture,metallicGlossTexture;public float[] color;public float alpha,roughness,metallic,normalScale=1;}
        [Serializable] sealed class SourceTexture {public string file,sha256,usage;}
        [Serializable] sealed class Manifest
        {
            public int schemaVersion;
            public string geometryFile,geometrySha256,attribution,sourceURL;
            public SourcePart[] parts;public SourceMaterial[] materials;public SourceTexture[] textures;
        }
        static string Sha(byte[] bytes)
        {using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
        public static void Import()
        {
            string input=null,assetPath=null,output=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-bundle="))input=arg.Substring("--kyoto-bundle=".Length);
                if(arg.StartsWith("--kyoto-asset="))assetPath=arg.Substring("--kyoto-asset=".Length);
                if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            }
            if(input==null||output==null||assetPath==null||!assetPath.StartsWith("Assets/Kyoto/Resources/Municipal/")||!assetPath.EndsWith(".asset"))
                throw new ArgumentException("Explicit bundle, evidence and municipal resource asset paths are required.");
            if(File.Exists(assetPath))throw new IOException("Use a new candidate asset path: "+assetPath);
            byte[] manifestBytes=File.ReadAllBytes(Path.Combine(input,"manifest.json"));
            var manifest=JsonUtility.FromJson<Manifest>(Encoding.UTF8.GetString(manifestBytes));
            if(manifest.schemaVersion!=1)throw new InvalidDataException("Unsupported municipal bundle.");
            byte[] geometryBytes=File.ReadAllBytes(Path.Combine(input,manifest.geometryFile));
            if(Sha(geometryBytes)!=manifest.geometrySha256)throw new InvalidDataException("Geometry hash mismatch.");
            string texturesPath="Assets/Kyoto/Art/Municipal/Textures";
            Directory.CreateDirectory(texturesPath);Directory.CreateDirectory(Path.GetDirectoryName(assetPath));Directory.CreateDirectory(output);
            foreach(var texture in manifest.textures)
            {
                if(Path.GetFileName(texture.file)!=texture.file)throw new InvalidDataException("Texture filename contains a path.");
                var bytes=File.ReadAllBytes(Path.Combine(input,"textures",texture.file));
                if(Sha(bytes)!=texture.sha256)throw new InvalidDataException("Texture hash mismatch: "+texture.file);
                string destination=Path.Combine(texturesPath,texture.file);
                if(File.Exists(destination))
                {if(Sha(File.ReadAllBytes(destination))!=texture.sha256)throw new InvalidDataException("Existing texture has different bytes.");}
                else File.WriteAllBytes(destination,bytes);
            }
            AssetDatabase.Refresh();
            foreach(var texture in manifest.textures)
            {
                string path=texturesPath+"/"+texture.file;
                var importer=(TextureImporter)AssetImporter.GetAtPath(path);
                bool normal=texture.usage=="normal",srgb=string.IsNullOrEmpty(texture.usage)||texture.usage=="color";
                if(!srgb&&!normal&&texture.usage!="linear")throw new InvalidDataException("Unknown texture usage: "+texture.usage);
                var textureType=normal?TextureImporterType.NormalMap:TextureImporterType.Default;
                bool configured=importer.textureType==textureType&&importer.sRGBTexture==srgb&&
                    importer.mipmapEnabled&&importer.wrapMode==TextureWrapMode.Repeat&&importer.filterMode==FilterMode.Trilinear&&
                    importer.anisoLevel==8&&importer.maxTextureSize==8192&&importer.textureCompression==TextureImporterCompression.CompressedHQ;
                if(configured)continue;
                importer.textureType=textureType;importer.sRGBTexture=srgb;
                importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;
                importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=8;importer.maxTextureSize=8192;
                importer.textureCompression=TextureImporterCompression.CompressedHQ;importer.SaveAndReimport();
            }
            var asset=ScriptableObject.CreateInstance<MunicipalGeometry>();asset.name=Path.GetFileNameWithoutExtension(assetPath);
            asset.geometrySha256=manifest.geometrySha256;asset.manifestSha256=Sha(manifestBytes);
            asset.attribution=manifest.attribution;asset.sourceUrl=manifest.sourceURL;
            AssetDatabase.CreateAsset(asset,assetPath);
            var materials=new Material[manifest.materials.Length];
            for(int i=0;i<materials.Length;i++)
            {
                var source=manifest.materials[i];var material=new Material(Shader.Find("Universal Render Pipeline/Lit")){name="Municipal "+source.name};
                material.SetColor("_BaseColor",new Color(source.color[0],source.color[1],source.color[2],source.alpha));
                material.SetFloat("_Metallic",source.metallic);material.SetFloat("_Smoothness",1-source.roughness);material.enableInstancing=true;
                if(!string.IsNullOrEmpty(source.texture))material.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(texturesPath+"/"+source.texture));
                if(!string.IsNullOrEmpty(source.normalTexture))
                {
                    material.SetTexture("_BumpMap",AssetDatabase.LoadAssetAtPath<Texture2D>(texturesPath+"/"+source.normalTexture));
                    material.SetFloat("_BumpScale",source.normalScale);material.EnableKeyword("_NORMALMAP");
                }
                if(!string.IsNullOrEmpty(source.metallicGlossTexture))
                {
                    material.SetTexture("_MetallicGlossMap",AssetDatabase.LoadAssetAtPath<Texture2D>(texturesPath+"/"+source.metallicGlossTexture));
                    material.SetFloat("_Smoothness",1);material.SetFloat("_SmoothnessTextureChannel",0);material.EnableKeyword("_METALLICSPECGLOSSMAP");
                }
                if(source.alpha<.999f)
                {
                    material.SetFloat("_Surface",1);material.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);material.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
                    material.SetFloat("_ZWrite",0);material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");material.renderQueue=(int)RenderQueue.Transparent;
                }
                materials[i]=material;AssetDatabase.AddObjectToAsset(material,asset);
            }
            var parts=new List<MunicipalGeometry.Part>();int totalVertices=0,totalTriangles=0;
            using(var stream=new MemoryStream(geometryBytes))using(var reader=new BinaryReader(stream))
            {
                if(Encoding.ASCII.GetString(reader.ReadBytes(8))!="KYOTOMG1"||reader.ReadInt32()!=manifest.parts.Length)throw new InvalidDataException("Geometry header mismatch.");
                for(int i=0;i<manifest.parts.Length;i++)
                {
                    var source=manifest.parts[i];int nv=reader.ReadInt32(),nt=reader.ReadInt32();
                    if(nv!=source.vertices||nt!=source.triangles)throw new InvalidDataException("Part counts disagree: "+source.id);
                    var vertices=new Vector3[nv];var normals=new Vector3[nv];var uv=new Vector2[nv];
                    for(int v=0;v<nv;v++)
                    {
                        vertices[v]=new Vector3(reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle());
                        normals[v]=new Vector3(reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle());uv[v]=new Vector2(reader.ReadSingle(),reader.ReadSingle());
                    }
                    var indices=new int[nt*3];for(int t=0;t<indices.Length;t++)indices[t]=reader.ReadInt32();
                    var groups=new SortedDictionary<int,List<int>>();
                    for(int t=0;t<nt;t++)
                    {
                        int material=reader.ReadInt32();if(material<0||material>=materials.Length)throw new InvalidDataException("Invalid material index.");
                        if(!groups.TryGetValue(material,out var group)){group=new List<int>();groups.Add(material,group);}
                        group.Add(indices[t*3]);group.Add(indices[t*3+1]);group.Add(indices[t*3+2]);
                    }
                    var mesh=new Mesh{name=source.id,indexFormat=nv>65535?IndexFormat.UInt32:IndexFormat.UInt16};
                    mesh.vertices=vertices;mesh.normals=normals;mesh.uv=uv;mesh.subMeshCount=groups.Count;
                    int sub=0;foreach(var group in groups)mesh.SetTriangles(group.Value,sub++,false);
                    if(groups.Keys.Any(k=>!string.IsNullOrEmpty(manifest.materials[k].normalTexture)))mesh.RecalculateTangents();
                    mesh.RecalculateBounds();AssetDatabase.AddObjectToAsset(mesh,asset);
                    parts.Add(new MunicipalGeometry.Part{id=source.id,assembly=source.assembly,surfaceId=source.surfaceId,
                        physical=source.physical,role=source.role,origin=source.origin,mesh=mesh,materials=groups.Keys.Select(k=>materials[k]).ToArray()});
                    totalVertices+=nv;totalTriangles+=nt;
                    if(i%256==0)Debug.Log($"KYOTO_MUNICIPAL_IMPORT {i}/{manifest.parts.Length}");
                }
                if(stream.Position!=stream.Length)throw new InvalidDataException("Unconsumed geometry bytes.");
            }
            asset.parts=parts.ToArray();asset.schemaVersion=1;EditorUtility.SetDirty(asset);AssetDatabase.SaveAssets();
            File.WriteAllLines(Path.Combine(output,"import-verification.txt"),new[]{
                "PASS municipal bundle import; not yet installed into the game scene/layout",
                $"asset={assetPath}; manifest_sha256={asset.manifestSha256}; geometry_sha256={asset.geometrySha256}",
                $"parts={parts.Count}; vertices={totalVertices}; triangles={totalTriangles}; materials={materials.Length}; textures={manifest.textures.Length}",
                "Original texture bytes verified; URP materials use mipmaps and standard high-quality platform compression."});
            Debug.Log($"KYOTO_MUNICIPAL_IMPORT_COMPLETE {parts.Count} parts; {totalTriangles} triangles");
        }
    }
}
