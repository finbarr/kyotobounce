using System;
using System.IO;
using System.Security.Cryptography;
using UnityEditor;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class Phase2CourseInstall
    {
        public static void InstallCreateAndBuild()
        {
            Run();Phase2Builder.CreateAndBuild();
        }
        public static void Run()
        {
            var candidate=ScriptableObject.CreateInstance<Course>();
            JsonUtility.FromJsonOverwrite(File.ReadAllText("../art-source/phase2-course-candidate.json"),candidate);
            string hash;using(var sha=SHA256.Create())hash=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(Resources.Load<TextAsset>("StationLayout").text))).Replace("-","").ToLowerInvariant();
            if(candidate.layoutSha256!=hash||candidate.challenges.Length!=8)throw new Exception("Course requires eight witnesses on the current layout");
            foreach(var c in candidate.challenges)
            {
                float yaw=Mathf.Atan2(c.witnessVelocity.x,c.witnessVelocity.z)*Mathf.Rad2Deg;
                var origin=c.launchFeet+Vector3.up*1.5f+Quaternion.Euler(0,yaw,0)*new Vector3(.22f,0,.42f);
                if(!c.walkingLaunch||string.IsNullOrEmpty(c.id)||Vector3.Distance(origin,c.origin)>.0002f||c.witnessVelocity.magnitude>16.001f||c.witnessSpin.magnitude>200.001f||!ChallengeRules.InAimCone(c,yaw))throw new Exception("Invalid authored controls: "+c.id);
            }
            const string path="Assets/Kyoto/Phase2/Course.asset";
            var course=AssetDatabase.LoadAssetAtPath<Course>(path);if(!course)throw new Exception("Missing development course asset");
            EditorUtility.CopySerialized(candidate,course);EditorUtility.SetDirty(course);AssetDatabase.SaveAssets();UnityEngine.Object.DestroyImmediate(candidate);
            Debug.Log("KYOTO_PHASE2_COURSE_INSTALLED "+hash);
        }
    }
}
