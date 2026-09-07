using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Kyoto.Editor
{
    // The browser release reuses the saved authored scene. No architecture regeneration.
    public static class BrowserMvpBuilder
    {
        public const string ScenePath = "Assets/Kyoto/Atrium/GroundFloor19/KyotoAtrium.unity";

        public static void Build()
        {
            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WebGL, BuildTarget.WebGL))
                throw new InvalidOperationException("Install Web Build Support for this Unity editor first.");
            if (!File.Exists(ScenePath)) throw new FileNotFoundException("Frozen atrium scene missing", ScenePath);
            string output = Path.GetFullPath("../Builds/Browser");
            foreach (string arg in Environment.GetCommandLineArgs())
                if (arg.StartsWith("--kyoto-web-output=")) output = Path.GetFullPath(arg.Substring(19));
            Directory.CreateDirectory(output);

            string oldName = PlayerSettings.productName, oldVersion = PlayerSettings.bundleVersion;
            var oldCompression = PlayerSettings.WebGL.compressionFormat;
            bool oldCaching = PlayerSettings.WebGL.dataCaching;
            var oldStripping = PlayerSettings.GetManagedStrippingLevel(NamedBuildTarget.WebGL);
            var oldCompiler = PlayerSettings.GetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL);
            int oldWidth = PlayerSettings.defaultWebScreenWidth, oldHeight = PlayerSettings.defaultWebScreenHeight;
            try
            {
                PlayerSettings.productName = "Kyoto Ricochet";
                PlayerSettings.bundleVersion = "0.3.0-local";
                // Local-first: avoid special compressed-response middleware for the initial build.
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
                PlayerSettings.WebGL.dataCaching = false;
                // Native-only APIs must not be retained in the browser by conservative stripping.
                PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.High);
                bool release = Array.Exists(Environment.GetCommandLineArgs(), a => a == "--kyoto-web-release");
                PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL,
                    release ? Il2CppCompilerConfiguration.Release : Il2CppCompilerConfiguration.Debug);
                PlayerSettings.defaultWebScreenWidth = 1280;
                PlayerSettings.defaultWebScreenHeight = 800;
                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { ScenePath }, locationPathName = output,
                    target = BuildTarget.WebGL, options = BuildOptions.Development
                });
                if (report.summary.result != BuildResult.Succeeded)
                    throw new InvalidOperationException("Browser build failed: " + report.summary.result);
                Debug.Log($"KYOTO_BROWSER_BUILD_SUCCESS {output} bytes={report.summary.totalSize}");
                File.WriteAllText(Path.Combine(output, "kyoto-build.json"), JsonUtility.ToJson(new BuildIdentity
                { scene = ScenePath, unity = Application.unityVersion, version = "0.3.0-local", builtUtc = DateTime.UtcNow.ToString("O") }, true));
            }
            finally
            {
                PlayerSettings.productName = oldName;
                PlayerSettings.bundleVersion = oldVersion;
                PlayerSettings.WebGL.compressionFormat = oldCompression;
                PlayerSettings.WebGL.dataCaching = oldCaching;
                PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, oldStripping);
                PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL, oldCompiler);
                PlayerSettings.defaultWebScreenWidth = oldWidth;
                PlayerSettings.defaultWebScreenHeight = oldHeight;
            }
        }

        [Serializable] class BuildIdentity { public string scene, unity, version, builtUtc; }
    }
}
