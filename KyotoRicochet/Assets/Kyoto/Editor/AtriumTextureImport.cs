using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class AtriumTextureImport
    {
        [Serializable] sealed class TextureRecord {public string file,usage,sha256;}
        [Serializable] sealed class Report {public TextureRecord[] textures;}
        public static void Run()
        {
            string prefix="--kyoto-export=";
            string input=Environment.GetCommandLineArgs().First(a=>a.StartsWith(prefix)).Substring(prefix.Length);
            var report=JsonUtility.FromJson<Report>(File.ReadAllText(Path.Combine(input,"export-report.json")));
            const string destination="Assets/Kyoto/Resources/AtriumTextures";Directory.CreateDirectory(destination);
            foreach(var texture in report.textures)
            {
                if(Path.GetFileName(texture.file)!=texture.file)throw new InvalidDataException("Texture must be a filename");
                byte[] bytes=File.ReadAllBytes(Path.Combine(input,"textures",texture.file));
                string hash;using(var sha=SHA256.Create())hash=BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();
                if(hash!=texture.sha256)throw new InvalidDataException("Texture changed after Blender export: "+texture.file);
                string path=destination+"/"+texture.file;
                if(!File.Exists(path))File.WriteAllBytes(path,bytes);
                else if(!File.ReadAllBytes(path).SequenceEqual(bytes))throw new InvalidDataException("Existing content-addressed texture differs");
                AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
                var importer=(TextureImporter)AssetImporter.GetAtPath(path);
                importer.textureType=texture.usage=="normal"?TextureImporterType.NormalMap:TextureImporterType.Default;
                importer.sRGBTexture=texture.usage=="color";importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;
                importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=8;importer.maxTextureSize=4096;
                importer.textureCompression=TextureImporterCompression.CompressedHQ;importer.SaveAndReimport();
            }
            Debug.Log("ATRIUM_TEXTURES_IMPORTED "+report.textures.Length);
        }
    }
}
