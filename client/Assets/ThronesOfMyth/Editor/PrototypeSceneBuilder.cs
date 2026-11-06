using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ThronesOfMyth.Editor
{
    public static class PrototypeSceneBuilder
    {
        [MenuItem("Thrones of Myth/Create Prototype Scene")]
        public static void CreateScene()
        {
            const string scenePath = "Assets/ThronesOfMyth/Scenes/Prototype.unity";
            if (File.Exists(scenePath) && !EditorUtility.DisplayDialog("Replace prototype scene?",
                "This will overwrite the existing generated prototype scene.", "Replace", "Cancel")) return;
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "Ground";
            ground.transform.position = new Vector3(40, -0.25f, 40);
            ground.transform.localScale = new Vector3(80, 0.5f, 80);

            var camera = new GameObject("Main Camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.transform.position = new Vector3(20, 47, -12);
            camera.transform.LookAt(new Vector3(20, 0, 20));
            camera.orthographic = true;
            camera.orthographicSize = 29;
            camera.farClipPlane = 150;
            camera.backgroundColor = new Color(0.12f, 0.16f, 0.2f);
            camera.clearFlags = CameraClearFlags.SolidColor;

            var light = new GameObject("Sun").AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            light.transform.rotation = Quaternion.Euler(50, -30, 0);
            RenderSettings.ambientLight = new Color(0.55f, 0.55f, 0.55f);
            new GameObject("Prototype Client").AddComponent<PrototypeClient>();

            // Ensure input used by this small prototype works even if the local
            // editor defaults to the new Input System.
            var projectSettings = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset");
            if (projectSettings.Length > 0)
            {
                var settings = new SerializedObject(projectSettings[0]);
                var inputHandling = settings.FindProperty("activeInputHandler");
                if (inputHandling != null) { inputHandling.intValue = 0; settings.ApplyModifiedProperties(); }
            }
            EditorSettings.serializationMode = SerializationMode.ForceText;
            Directory.CreateDirectory("Assets/ThronesOfMyth/Scenes");
            AssetDatabase.Refresh();
            EditorSceneManager.SaveScene(scene, scenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(scenePath, true) };
            EditorUtility.DisplayDialog("Prototype ready", "Restart the updated server, press Play, then Establish / Resume City.", "OK");
        }
    }
}
