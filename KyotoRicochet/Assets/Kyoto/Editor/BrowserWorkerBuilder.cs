using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    public static class BrowserWorkerBuilder
    {
        public static void Build()
        { BuildFor(BuildTarget.StandaloneOSX,"../Builds/PhysicsWorker/Kyoto Physics Worker.app",BuildOptions.Development); }

        public static void BuildLinux()
        { BuildFor(BuildTarget.StandaloneLinux64,"../Builds/PhysicsWorkerLinux/KyotoPhysicsWorker.x86_64",BuildOptions.None); }

        static void BuildFor(BuildTarget target,string output,BuildOptions options)
        {
            string scenePath="Assets/Kyoto/Scenes/BrowserWorker.unity";
            Directory.CreateDirectory(Path.GetDirectoryName(scenePath));
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(output)));
            AssetDatabase.Refresh();
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            new GameObject("Local physics authority").AddComponent<BrowserPhysicsWorker>();
            if(!EditorSceneManager.SaveScene(scene,scenePath))
                throw new InvalidOperationException("Could not save generated worker scene: "+scenePath);
            bool server=target==BuildTarget.StandaloneLinux64;
            var namedTarget=server?NamedBuildTarget.Server:NamedBuildTarget.Standalone;
            var oldBackend=PlayerSettings.GetScriptingBackend(namedTarget);
            string oldName=PlayerSettings.productName;
            try
            {
                PlayerSettings.SetScriptingBackend(namedTarget,ScriptingImplementation.Mono2x);
                PlayerSettings.productName="Kyoto Physics Worker";
                var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
                    scenes=new[]{scenePath},target=target,subtarget=(int)(server?StandaloneBuildSubtarget.Server:StandaloneBuildSubtarget.Player),
                    locationPathName=Path.GetFullPath(output),options=options});
                if(report.summary.result!=BuildResult.Succeeded)throw new InvalidOperationException("Worker build failed: "+report.summary.result);
                Debug.Log("KYOTO_WORKER_BUILD_SUCCESS bytes="+report.summary.totalSize);
            }
            finally
            {PlayerSettings.SetScriptingBackend(namedTarget,oldBackend);PlayerSettings.productName=oldName;}
        }
    }
}
