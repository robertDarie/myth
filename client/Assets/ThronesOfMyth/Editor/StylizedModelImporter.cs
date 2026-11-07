using UnityEditor;
namespace ThronesOfMyth.Editor
{
    // Keep small original scenery meshes readable for runtime material batching.
    public sealed class StylizedModelImporter : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            if (!assetPath.StartsWith("Assets/ThronesOfMyth/Resources/Art/Models/")) return;
            var model = (ModelImporter)assetImporter;
            model.isReadable = true; model.importAnimation = false; model.importCameras = false; model.importLights = false;
            model.globalScale = 1; model.useFileScale = true;
            model.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            model.materialLocation = ModelImporterMaterialLocation.InPrefab;
        }
    }
}
