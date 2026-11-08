using System.Collections.Generic;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        private Mesh fogMesh;
        private Material fogMaterial;
        private GameObject fogObject;
        private readonly byte[] fogSectors = new byte[400];
        private bool fogInitialized;
        private const int FogSteps = 160;
        private float FogOpacity(int x, int z)
        {
            byte state = fogSectors[Mathf.Clamp(z, 0, 19) * 20 + Mathf.Clamp(x, 0, 19)];
            return state == 2 ? 0 : state == 1 ? .42f : .97f;
        }
        private void UpdateFog(ExplorationData data)
        {
            if (data == null) return;
            if (fogMesh == null)
            {
                fogObject = new GameObject("Veil · feathered sector boundaries"); fogObject.transform.SetParent(transform, false);
                fogMesh = new Mesh { name = "Continuous kingdom veil" };
                int side = FogSteps + 1;
                var vertices = new Vector3[side * side]; var triangles = new int[FogSteps * FogSteps * 6];
                for (int z = 0; z <= FogSteps; z++) for (int x = 0; x <= FogSteps; x++) vertices[z * side + x] = new Vector3(x * .5f, 4.5f, z * .5f);
                for (int z = 0; z < FogSteps; z++) for (int x = 0; x < FogSteps; x++)
                {
                    int v = z * side + x, t = (z * FogSteps + x) * 6;
                    triangles[t] = v; triangles[t + 1] = v + side; triangles[t + 2] = v + side + 1;
                    triangles[t + 3] = v; triangles[t + 4] = v + side + 1; triangles[t + 5] = v + 1;
                }
                fogMesh.vertices = vertices; fogMesh.triangles = triangles; fogMesh.RecalculateBounds();
                fogObject.AddComponent<MeshFilter>().sharedMesh = fogMesh;
                fogMaterial = new Material(Shader.Find("Sprites/Default")) { name = "Veil transparency", renderQueue = 3001 };
                var renderer = fogObject.AddComponent<MeshRenderer>(); renderer.sharedMaterial = fogMaterial;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; renderer.receiveShadows = false;
            }
            var known = new HashSet<int>(data.explored); var visible = new HashSet<int>(data.visible);
            bool changed = !fogInitialized;
            for (int i = 0; i < 400; i++)
            {
                byte state = visible.Contains(i) ? (byte)2 : known.Contains(i) ? (byte)1 : (byte)0;
                if (fogSectors[i] != state) changed = true;
                fogSectors[i] = state;
            }
            if (!changed) return;
            fogInitialized = true;
            var colors = new Color[(FogSteps + 1) * (FogSteps + 1)];
            for (int z = 0; z <= FogSteps; z++) for (int x = 0; x <= FogSteps; x++)
            {
                // Interpolate the presentation only. Server discovery and entity filtering
                // still use the exact sectors; feathering never authorizes a target.
                float sx = x / 8f - .5f, sz = z / 8f - .5f;
                int ix = Mathf.FloorToInt(sx), iz = Mathf.FloorToInt(sz);
                float tx = Mathf.SmoothStep(0, 1, sx - ix), tz = Mathf.SmoothStep(0, 1, sz - iz);
                float alpha = Mathf.Lerp(Mathf.Lerp(FogOpacity(ix, iz), FogOpacity(ix + 1, iz), tx), Mathf.Lerp(FogOpacity(ix, iz + 1), FogOpacity(ix + 1, iz + 1), tx), tz);
                colors[z * (FogSteps + 1) + x] = new Color(.20f, .29f, .33f, alpha);
            }
            fogMesh.colors = colors;
        }
        private void DisposeFog()
        {
            if (fogObject != null) Destroy(fogObject); if (fogMesh != null) Destroy(fogMesh); if (fogMaterial != null) Destroy(fogMaterial);
            fogInitialized = false;
        }
    }
}
