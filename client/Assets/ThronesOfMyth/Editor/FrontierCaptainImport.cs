using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace ThronesOfMyth.Editor
{
    public sealed class FrontierCaptainImport : AssetPostprocessor
    {
        private const string Folder = "/Resources/Commanders/FrontierCaptain/";

        void OnPreprocessTexture()
        {
            if (assetPath.IndexOf(Folder, StringComparison.Ordinal) < 0) return;
            var importer = (TextureImporter)assetImporter;
            importer.maxTextureSize = 2048;
            importer.mipmapEnabled = true;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
            if (assetPath.IndexOf("Albedo", StringComparison.Ordinal) >= 0)
            {
                importer.textureType = TextureImporterType.Default;
                importer.sRGBTexture = true;
                importer.alphaSource = TextureImporterAlphaSource.None;
            }
            else if (assetPath.IndexOf("Normal", StringComparison.Ordinal) >= 0)
            {
                importer.textureType = TextureImporterType.NormalMap;
                importer.sRGBTexture = false;
            }
            else
            {
                importer.textureType = TextureImporterType.Default;
                importer.sRGBTexture = false;
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
            }
        }

        void OnPreprocessModel()
        {
            if (assetPath.IndexOf(Folder + "FrontierCaptainPresentation", StringComparison.Ordinal) < 0) return;
            var importer = (ModelImporter)assetImporter;
            importer.globalScale = 1f;
            importer.useFileScale = true;
            importer.importBlendShapes = false;
            importer.importCameras = false;
            importer.importLights = false;
            importer.animationType = ModelImporterAnimationType.Generic;
            importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            importer.importAnimation = true;
            importer.animationCompression = ModelImporterAnimationCompression.Off;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.skinWeights = ModelImporterSkinWeights.Standard;
        }

        void OnPostprocessAnimation(GameObject root, AnimationClip clip)
        {
            if (assetPath.IndexOf(Folder + "FrontierCaptainPresentation", StringComparison.Ordinal) < 0 || clip == null) return;
            var settings = AnimationUtility.GetAnimationClipSettings(clip);
            settings.loopTime = clip.name.IndexOf("Idle", StringComparison.OrdinalIgnoreCase) >= 0;
            AnimationUtility.SetAnimationClipSettings(clip, settings);
        }
    }

    [InitializeOnLoad]
    public static class FrontierCaptainAnimatorSetup
    {
        static FrontierCaptainAnimatorSetup()
        {
            EditorApplication.delayCall += Ensure;
        }

        public static void Ensure()
        {
            const string folder = "Assets/ThronesOfMyth/Resources/Commanders/FrontierCaptain";
            string fbx = folder + "/FrontierCaptainPresentation.fbx";
            if (!File.Exists(fbx)) return;
            var avatar = AssetDatabase.LoadAssetAtPath<Avatar>(fbx);
            var model = AssetImporter.GetAtPath(fbx) as ModelImporter;
            if (avatar != null && !avatar.isValid && model != null && model.animationType == ModelImporterAnimationType.Human)
            {
                model.animationType = ModelImporterAnimationType.Generic;
                model.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                model.SaveAndReimport();
                Debug.LogWarning("Frontier Captain humanoid mapping was rejected. The presentation uses the generic skeleton instead.");
            }
            string controllerPath = folder + "/FrontierCaptain.controller";
            if (File.Exists(controllerPath)) return;
            var clips = AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<AnimationClip>().Where(clip => !clip.name.StartsWith("__")).ToArray();
            if (clips.Length == 0) return;
            var controller = AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var machine = controller.layers[0].stateMachine;
            AnimatorState idle = null;
            foreach (var clip in clips)
            {
                string stateName = StateName(clip.name);
                var state = machine.AddState(stateName);
                state.motion = clip;
                if (stateName == "Idle") idle = state;
            }
            if (idle != null) machine.defaultState = idle;
            AssetDatabase.SaveAssets();
            Debug.Log("Frontier Captain animator ready. Clips: " + string.Join(", ", clips.Select(clip => clip.name)));
        }

        private static string StateName(string clipName)
        {
            int bar = clipName.LastIndexOf('|');
            return bar >= 0 ? clipName.Substring(bar + 1) : clipName;
        }
    }
}
