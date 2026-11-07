using UnityEditor;
namespace ThronesOfMyth.Editor
{
    // Keep small original scenery meshes readable for runtime material batching.
    public sealed class StylizedModelImporter : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            if (!assetPath.StartsWith("Assets/ThronesOfMyth/Resources/Art/Models/") && !assetPath.StartsWith("Assets/ThronesOfMyth/Resources/Art/Units/")) return;
            var model = (ModelImporter)assetImporter;
            model.isReadable = true; model.importAnimation = assetPath.Contains("/Units/");
            if (model.importAnimation) model.animationType = ModelImporterAnimationType.Legacy; model.importCameras = false; model.importLights = false;
            model.globalScale = 1; model.useFileScale = true;
            model.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            model.materialLocation = ModelImporterMaterialLocation.InPrefab;
        }
        private void OnPreprocessAnimation()
        {
            if (!assetPath.Contains("/Art/Units/")) return;
            var model = (ModelImporter)assetImporter; var clips = model.defaultClipAnimations;
            foreach (var clip in clips)
            {
                foreach (var state in new[] { "Idle", "March", "Attack", "Skill", "Retreat", "Victory", "Gather", "Hit" })
                    if (clip.name.EndsWith(state)) { clip.name = state; break; }
                bool loop = clip.name == "Idle" || clip.name == "March" || clip.name == "Retreat" || clip.name == "Gather";
                clip.loopTime = loop; clip.wrapMode = loop ? UnityEngine.WrapMode.Loop : UnityEngine.WrapMode.ClampForever;
                clip.lockRootPositionXZ = true; clip.lockRootHeightY = true; clip.lockRootRotation = true;
            }
            model.clipAnimations = clips;
        }
    }
}
