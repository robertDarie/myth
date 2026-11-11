using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace ThronesOfMyth.Editor
{
    public static class CommanderReviewBuild
    {
        public static void BuildFromCommandLine()
        {
            string project = Directory.GetParent(Application.dataPath).FullName;
            string repository = Directory.GetParent(project).FullName;
            string settings = Path.Combine(project, "ProjectSettings", "ProjectSettings.asset");
            string backup = Path.Combine(repository, "work", "commander-review", "ProjectSettings.backup");
            Directory.CreateDirectory(Path.GetDirectoryName(backup));
            File.Copy(settings, backup, true);
            try
            {
                PrototypeSceneBuilder.EnsureBuildScene();
                FrontierCaptainAnimatorSetup.Ensure();
                PlayerSettings.productName = "Thrones of Myth";
                PlayerSettings.defaultScreenWidth = 1280;
                PlayerSettings.defaultScreenHeight = 800;
                PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
                PlayerSettings.resizableWindow = true;
                PlayerSettings.runInBackground = true;
                string output = Path.Combine(repository, "work", "commander-review", "Game", "ThronesOfMyth.exe");
                Directory.CreateDirectory(Path.GetDirectoryName(output));
                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { "Assets/ThronesOfMyth/Scenes/Prototype.unity" },
                    locationPathName = output,
                    target = BuildTarget.StandaloneWindows64,
                    options = BuildOptions.None
                });
                if (report.summary.result != BuildResult.Succeeded)
                    throw new System.Exception("Commander review player failed: " + report.summary.result + " errors " + report.summary.totalErrors);
                Debug.Log("Commander review player: " + output);
            }
            finally
            {
                if (File.Exists(backup)) File.Copy(backup, settings, true);
            }
        }
    }
}
