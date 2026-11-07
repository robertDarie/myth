using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        private readonly List<Mesh> authoredMeshes = new List<Mesh>();
        private readonly Dictionary<string, Mesh> equipmentMeshes = new Dictionary<string, Mesh>();
        private Transform Equipment(Transform parent, string name, Vector3 at, Mesh mesh, Color color)
        {
            var obj = new GameObject(name); obj.transform.SetParent(parent, false); obj.transform.localPosition = at;
            obj.AddComponent<MeshFilter>().sharedMesh = mesh;
            obj.AddComponent<MeshRenderer>().sharedMaterial = MaterialFor(color); return obj.transform;
        }
        private Mesh ShieldMesh()
        {
            if (equipmentMeshes.TryGetValue("aspis", out var cached)) return cached;
            const int sides = 16;
            var vertices = new List<Vector3> { new Vector3(0, 0, 0.10f), new Vector3(0, 0, -0.06f) };
            for (int ring = 0; ring < 2; ring++) for (int i = 0; i < sides; i++)
            {
                float angle = i * Mathf.PI * 2 / sides;
                vertices.Add(new Vector3(Mathf.Cos(angle) * 0.29f, Mathf.Sin(angle) * 0.29f, ring == 0 ? 0.02f : -0.06f));
            }
            var triangles = new List<int>();
            for (int i = 0; i < sides; i++)
            {
                int a = 2 + i, b = 2 + (i + 1) % sides, c = a + sides, d = b + sides;
                triangles.AddRange(new[] { 0, a, b, 1, d, c, a, c, b, b, c, d });
            }
            var mesh = new Mesh { name = "Greek convex aspis" }; mesh.SetVertices(vertices); mesh.SetTriangles(triangles, 0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
            authoredMeshes.Add(mesh); equipmentMeshes.Add("aspis", mesh); return mesh;
        }
        private Mesh HornMesh(int side)
        {
            string key = "bull-horn-" + side;
            if (equipmentMeshes.TryGetValue(key, out var cached)) return cached;
            var vertices = new List<Vector3>(); var triangles = new List<int>();
            const int rings = 6, sides = 8;
            for (int ring = 0; ring < rings; ring++)
            {
                float t = ring / (rings - 1f), radius = 0.13f * (1 - t) + 0.006f;
                var center = new Vector3(side * (t * 0.5f + Mathf.Sin(t * Mathf.PI) * 0.12f), t * t * 0.55f, -t * 0.08f);
                for (int i = 0; i < sides; i++) { float a = i * Mathf.PI * 2 / sides; vertices.Add(center + new Vector3(0, Mathf.Cos(a) * radius, Mathf.Sin(a) * radius)); }
            }
            for (int r = 0; r < rings - 1; r++) for (int i = 0; i < sides; i++)
            {
                int a = r * sides + i, b = r * sides + (i + 1) % sides;
                triangles.AddRange(new[] { a, b, a + sides, b, b + sides, a + sides });
            }
            // The base intersects the skull; cap the narrow tip.
            for (int i = 1; i < sides - 1; i++) triangles.AddRange(new[] { (rings - 1) * sides, (rings - 1) * sides + i, (rings - 1) * sides + i + 1 });
            if (side < 0) for (int i = 0; i < triangles.Count; i += 3) { int swap = triangles[i + 1]; triangles[i + 1] = triangles[i + 2]; triangles[i + 2] = swap; }
            var mesh = new Mesh { name = "Curved Minotaur horn" }; mesh.SetVertices(vertices); mesh.SetTriangles(triangles, 0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
            authoredMeshes.Add(mesh); equipmentMeshes.Add(key, mesh); return mesh;
        }
        private Mesh AxeMesh()
        {
            if (equipmentMeshes.TryGetValue("axe", out var cached)) return cached;
            var outline = new[] { new Vector2(0, 0.12f), new Vector2(-0.4f, 0.38f), new Vector2(-0.56f, 0.18f), new Vector2(-0.56f, -0.18f), new Vector2(-0.4f, -0.38f), new Vector2(0, -0.12f), new Vector2(0.4f, -0.38f), new Vector2(0.56f, -0.18f), new Vector2(0.56f, 0.18f), new Vector2(0.4f, 0.38f) };
            var vertices = new List<Vector3> { new Vector3(0, 0, 0.055f), new Vector3(0, 0, -0.055f) };
            foreach (float z in new[] { 0.055f, -0.055f }) foreach (var point in outline) vertices.Add(new Vector3(point.x, point.y, z));
            var triangles = new List<int>(); int count = outline.Length;
            for (int i = 0; i < count; i++)
            {
                int a = 2 + i, b = 2 + (i + 1) % count, c = a + count, d = b + count;
                triangles.AddRange(new[] { 0, a, b, 1, d, c, a, c, b, b, c, d });
            }
            var mesh = new Mesh { name = "Minotaur double axe" }; mesh.SetVertices(vertices); mesh.SetTriangles(triangles, 0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
            authoredMeshes.Add(mesh); equipmentMeshes.Add("axe", mesh); return mesh;
        }
        private void GreekKit(WorldActorAnimation.Rig rig, string type)
        {
            // Armor follows the existing hip/shoulder skeleton, rather than the world marker.
            Box(rig.body, -0.12f, 0.96f, 0.18f, 0.18f, 0.34f, 0.08f, bronze);
            Box(rig.body, 0.12f, 0.96f, 0.18f, 0.18f, 0.34f, 0.08f, bronze);
            for (int i = -2; i <= 2; i++) Box(rig.body, i * 0.09f, 0.58f, 0.18f, 0.075f, 0.23f, 0.05f, timber);
            Box(rig.leftLeg, 0, -0.31f, 0.09f, 0.17f, 0.27f, 0.07f, bronze);
            Box(rig.rightLeg, 0, -0.31f, 0.09f, 0.17f, 0.27f, 0.07f, bronze);
            if (type != "archers")
            {
                Box(rig.body, -0.17f, 1.36f, 0.16f, 0.085f, 0.23f, 0.09f, bronze);
                Box(rig.body, 0.17f, 1.36f, 0.16f, 0.085f, 0.23f, 0.09f, bronze);
                Box(rig.body, 0, 1.42f, 0.23f, 0.045f, 0.2f, 0.04f, bronze);
            }
        }
        private void GreekShield(Transform hand)
        {
            var shield = Equipment(hand, "Bronze aspis", new Vector3(0, -0.13f, 0.13f), ShieldMesh(), bronze);
            Ball(shield, 0, 0, 0.09f, 0.13f, 0.13f, 0.07f, stone);
            Box(shield, 0, 0, 0.12f, 0.035f, 0.33f, 0.025f, timber);
            Box(shield, 0, 0, 0.12f, 0.33f, 0.035f, 0.025f, timber);
        }
        private void MinotaurKit(Transform torso, WorldActorAnimation.Rig rig)
        {
            Ball(torso, 0, 1.9f, 0.33f, 0.55f, 0.33f, 0.5f, timber);
            for (int side = -1; side <= 1; side += 2)
            {
                Equipment(torso, "Swept bull horn", new Vector3(side * 0.27f, 2.2f, 0), HornMesh(side), stone);
                Ball(torso, side * 0.58f, 1.46f, 0, 0.55f, 0.6f, 0.65f, bronze);
            }
            rig.weapon = Pivot(torso, "Minotaur axe shoulder", new Vector3(0.65f, 1.55f, 0));
            Box(rig.weapon, 0, -0.2f, 0.15f, 0.12f, 1.8f, 0.12f, timber);
            Equipment(rig.weapon, "Axe blade", new Vector3(0, 0.65f, 0.15f), AxeMesh(), stone);
        }
    }
}
