using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        private readonly Dictionary<string, GameObject> importedModels = new Dictionary<string, GameObject>();
        private bool Imported(Transform parent, string model, Color team, string culture = "greek")
        {
            if (!importedModels.TryGetValue(model, out var asset)) { asset = Resources.Load<GameObject>("Art/Models/" + model); importedModels[model] = asset; }
            if (asset == null) return false;
            var instance = Object.Instantiate(asset, parent, false); instance.name = model + " · original mesh";
            Color roof = culture == "egyptian" ? new Color(0.16f, 0.51f, 0.54f) : culture == "norse" ? new Color(0.22f, 0.34f, 0.32f) : culture == "chinese" ? new Color(0.18f, 0.44f, 0.34f) : culture == "japanese" ? new Color(0.20f, 0.28f, 0.45f) : new Color(0.66f, 0.25f, 0.14f);
            foreach (var renderer in instance.GetComponentsInChildren<MeshRenderer>())
            {
                var source = renderer.sharedMaterials; var palette = new Material[source.Length];
                for (int i = 0; i < source.Length; i++)
                {
                    string role = source[i] == null ? "Stone" : source[i].name;
                    Color tint = role.Contains("Roof") ? roof : role.Contains("Banner") ? team : role.Contains("Gold") ? new Color(0.79f, 0.57f, 0.24f) : role.Contains("Window") ? new Color(0.98f, 0.75f, 0.31f) : role.Contains("Wood") || role.Contains("Bark") ? new Color(0.31f, 0.21f, 0.13f) : role.Contains("Green") ? team : role.Contains("Rock") ? new Color(0.48f, 0.51f, 0.43f) : role.Contains("Ground") ? new Color(0.51f, 0.57f, 0.35f) : new Color(0.83f, 0.77f, 0.61f);
                    palette[i] = role.Contains("Roof")?RoofMaterial(tint):MaterialFor(tint);
                }
                renderer.sharedMaterials = palette;
            }
            foreach (var collider in instance.GetComponentsInChildren<Collider>()) Object.Destroy(collider);
            return true;
        }
        public void EnvironmentModel(Transform parent, string model, Vector3 position, float scale, Color tint, float yaw)
        {
            var root = new GameObject(model).transform; root.SetParent(parent, false); root.localPosition = position; root.localScale = Vector3.one * scale; root.localRotation = Quaternion.Euler(0, yaw, 0);
            if(model=="OakTree"||model=="PineTree"){PainterTree(root,model=="PineTree",tint,Mathf.Abs(Mathf.RoundToInt(yaw))%4);return;}
            if(model=="BorderRock"){Sculpt(root,"rock"+(Mathf.Abs(Mathf.RoundToInt(yaw))%3),Vector3.zero,Vector3.one,tint);return;}
            if (!Imported(root, model, tint))
            {
                if (model == "BorderRock") Shape(root, PrimitiveType.Sphere, new Vector3(0, 0.7f, 0), new Vector3(2, 1.4f, 1.5f), tint);
                else { Pillar(root, 0, 0.6f, 0, 0.2f, 1.2f, timber); Ball(root, 0, 1.7f, 0, 1.5f, 1.8f, 1.5f, tint); }
            }
        }
        public void BatchEnvironment(Transform root)
        {
            var groups = new Dictionary<Material, List<CombineInstance>>();
            foreach (var filter in root.GetComponentsInChildren<MeshFilter>())
            {
                var renderer = filter.GetComponent<MeshRenderer>(); if (renderer == null || filter.sharedMesh == null || !filter.sharedMesh.isReadable) continue;
                var source = renderer.sharedMaterials;
                for (int i = 0; i < source.Length && i < filter.sharedMesh.subMeshCount; i++)
                {
                    if (!groups.TryGetValue(source[i], out var batch)) groups[source[i]] = batch = new List<CombineInstance>();
                    batch.Add(new CombineInstance { mesh = filter.sharedMesh, subMeshIndex = i, transform = root.worldToLocalMatrix * filter.transform.localToWorldMatrix });
                }
                renderer.enabled = false;
            }
            foreach (var group in groups)
            {
                var mesh = new Mesh { name = "Batched kingdom scenery", indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; mesh.CombineMeshes(group.Value.ToArray()); authoredMeshes.Add(mesh);
                var obj = new GameObject(mesh.name); obj.transform.SetParent(root, false); obj.AddComponent<MeshFilter>().sharedMesh = mesh; obj.AddComponent<MeshRenderer>().sharedMaterial = group.Key;
            }
        }
    }
}
