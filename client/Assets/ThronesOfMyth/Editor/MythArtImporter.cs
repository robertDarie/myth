using UnityEditor;

namespace ThronesOfMyth.Editor
{
    public sealed class MythArtImporter : AssetPostprocessor
    {
        private void OnPreprocessTexture()
        {
            if (!assetPath.Contains("ThronesOfMyth/Resources/Art/")) return;
            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Default;
            importer.isReadable = assetPath.EndsWith("CommanderAtlas.png");
            importer.mipmapEnabled = false;
            importer.npotScale = TextureImporterNPOTScale.None;
            importer.maxTextureSize = 2048;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.wrapMode = UnityEngine.TextureWrapMode.Clamp;
            importer.filterMode = UnityEngine.FilterMode.Bilinear;
        }
        [MenuItem("Thrones of Myth/Refresh Art Imports")]
        public static void Refresh()
        {
            AssetDatabase.ImportAsset("Assets/ThronesOfMyth/Resources/Art/CommanderAtlas.png", ImportAssetOptions.ForceUpdate);
            AssetDatabase.ImportAsset("Assets/ThronesOfMyth/Resources/Art/SanctuaryDawn.png", ImportAssetOptions.ForceUpdate);
        }
    }
}
