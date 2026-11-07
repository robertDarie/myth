using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Mesh fogMesh;
        private Material fogMaterial;
        private GameObject fogObject;
        private void UpdateFog(ExplorationData data)
        {
            if (data == null) return;
            if (fogMesh == null)
            {
                fogObject = new GameObject("Veil · explored and current vision"); fogObject.transform.SetParent(transform, false);
                fogMesh = new Mesh { name = "Kingdom fog sectors" };
                var vertices = new Vector3[1600]; var triangles = new int[2400];
                for (int z = 0; z < 20; z++) for (int x = 0; x < 20; x++)
                {
                    int cell = z * 20 + x, v = cell * 4, t = cell * 6;
                    vertices[v] = new Vector3(x * 4, 4.5f, z * 4); vertices[v + 1] = new Vector3(x * 4, 4.5f, z * 4 + 4);
                    vertices[v + 2] = new Vector3(x * 4 + 4, 4.5f, z * 4 + 4); vertices[v + 3] = new Vector3(x * 4 + 4, 4.5f, z * 4);
                    triangles[t] = v; triangles[t + 1] = v + 1; triangles[t + 2] = v + 2; triangles[t + 3] = v; triangles[t + 4] = v + 2; triangles[t + 5] = v + 3;
                }
                fogMesh.vertices = vertices; fogMesh.triangles = triangles; fogMesh.RecalculateBounds();
                fogObject.AddComponent<MeshFilter>().sharedMesh = fogMesh;
                fogMaterial = new Material(Shader.Find("Sprites/Default")) { name = "Veil transparency", renderQueue = 3001 };
                fogObject.AddComponent<MeshRenderer>().sharedMaterial = fogMaterial;
            }
            var known = new HashSet<int>(data.explored); var visible = new HashSet<int>(data.visible); var colors = new Color[1600];
            for (int i = 0; i < 400; i++)
            {
                var color = new Color(0.035f, 0.055f, 0.085f, visible.Contains(i) ? 0 : known.Contains(i) ? 0.55f : 0.97f);
                for (int v = 0; v < 4; v++) colors[i * 4 + v] = color;
            }
            fogMesh.colors = colors;
        }
        private void DisposeFog()
        {
            if (fogObject != null) Destroy(fogObject); if (fogMesh != null) Destroy(fogMesh); if (fogMaterial != null) Destroy(fogMaterial);
        }
    }
}
