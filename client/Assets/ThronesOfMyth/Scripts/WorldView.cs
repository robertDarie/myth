using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed class WorldView : MonoBehaviour
    {
        private sealed class Piece { public GameObject root; public Vector3 destination; public string label; public Color color; public float health = -1; public bool moving; public int mythicCount; }
        private readonly Dictionary<string, Piece> pieces = new Dictionary<string, Piece>();
        private readonly Dictionary<Color, Material> materials = new Dictionary<Color, Material>();
        private readonly Color blue = new Color(0.2f, 0.7f, 1f), gold = new Color(0.9f, 0.7f, 0.3f), red = new Color(0.85f, 0.3f, 0.23f);
        private Transform scenery;
        public string selectedId;
        public bool labels = true;
        private Material MaterialFor(Color color)
        {
            if (!materials.TryGetValue(color, out var material))
            {
                material = new Material(Shader.Find("Standard")); material.color = color; materials.Add(color, material);
            }
            return material;
        }
        private GameObject Shape(PrimitiveType type, Transform parent, Vector3 local, Vector3 scale, Color color, bool collider = false)
        {
            var obj = GameObject.CreatePrimitive(type); obj.transform.SetParent(parent, false);
            obj.transform.localPosition = local; obj.transform.localScale = scale;
            obj.GetComponent<Renderer>().sharedMaterial = MaterialFor(color);
            if (!collider) Destroy(obj.GetComponent<Collider>());
            return obj;
        }
        private void Awake()
        {
            scenery = new GameObject("World Scenery").transform;
            var ground = GameObject.Find("Ground");
            if (ground == null) { ground = GameObject.CreatePrimitive(PrimitiveType.Cube); ground.name = "Ground"; }
            ground.transform.position = new Vector3(40, -0.3f, 40); ground.transform.localScale = new Vector3(80, 0.6f, 80);
            ground.GetComponent<Renderer>().sharedMaterial = MaterialFor(new Color(0.3f, 0.39f, 0.28f));
            // Province boundaries communicate server-side access rules; gates are strategic objectives.
            Shape(PrimitiveType.Cube, scenery, new Vector3(40, 0.03f, 40), new Vector3(0.25f, 0.1f, 80), gold);
            Shape(PrimitiveType.Cube, scenery, new Vector3(40, 0.03f, 40), new Vector3(80, 0.1f, 0.25f), gold);
            var random = new System.Random(431);
            for (int i = 0; i < 90; i++)
            {
                float x = 2 + (float)random.NextDouble() * 76, z = 43 + (float)random.NextDouble() * 34;
                if (Mathf.Abs(x - 65) < 7 && Mathf.Abs(z - 65) < 7) continue;
                Shape(PrimitiveType.Cylinder, scenery, new Vector3(x, 0.8f, z), new Vector3(0.25f, 0.8f, 0.25f), new Color(0.28f, 0.2f, 0.13f));
                Shape(PrimitiveType.Sphere, scenery, new Vector3(x, 2.1f, z), new Vector3(1.6f, 2.5f, 1.6f), new Color(0.18f, 0.3f, 0.2f));
            }
        }
        private Piece Create(string id, string kind, float x, float z, Color color)
        {
            var root = new GameObject(kind + " " + id); root.transform.SetParent(transform, false); root.transform.position = new Vector3(x, 0, z);
            var marker = root.AddComponent<MapMarker>(); marker.id = id; marker.kind = kind;
            var collider = root.AddComponent<BoxCollider>(); collider.center = new Vector3(0, 1.2f, 0); collider.size = new Vector3(2.8f, 2.8f, 2.8f);
            if (kind == "army")
            {
                for (int i = 0; i < 3; i++)
                {
                    var offset = new Vector3((i - 1) * 0.7f, 0.75f, i == 1 ? 0.5f : 0);
                    Shape(PrimitiveType.Capsule, root.transform, offset, new Vector3(0.55f, 0.75f, 0.55f), color);
                    Shape(PrimitiveType.Cube, root.transform, offset + new Vector3(0.3f, 0.25f, 0.2f), new Vector3(0.1f, 1.7f, 0.1f), gold);
                }
            }
            else if (kind == "city" || kind == "site")
            {
                Shape(PrimitiveType.Cube, root.transform, new Vector3(0, 0.2f, 0), new Vector3(4, 0.4f, 3.5f), color);
                for (int i = 0; i < 4; i++) Shape(PrimitiveType.Cylinder, root.transform, new Vector3((i % 2 == 0 ? -1 : 1) * 1.3f, 1.5f, (i < 2 ? -1 : 1)), new Vector3(0.5f, 1.3f, 0.5f), new Color(0.77f, 0.74f, 0.63f));
                Shape(PrimitiveType.Cube, root.transform, new Vector3(0, 3, 0), new Vector3(3.6f, 0.6f, 3), color);
            }
            else if (kind == "flag")
            {
                Shape(PrimitiveType.Cylinder, root.transform, new Vector3(0, 1.6f, 0), new Vector3(0.15f, 1.6f, 0.15f), gold);
                Shape(PrimitiveType.Cube, root.transform, new Vector3(0.6f, 2.7f, 0), new Vector3(1.2f, 0.8f, 0.1f), color);
                Shape(PrimitiveType.Cylinder, root.transform, new Vector3(0, 0.04f, 0), new Vector3(10, 0.03f, 10), color * 0.65f);
            }
            else
            {
                Shape(kind == "camp" ? PrimitiveType.Cube : PrimitiveType.Sphere, root.transform, new Vector3(0, 0.9f, 0), new Vector3(2, 1.8f, 2), color);
                Shape(PrimitiveType.Cylinder, root.transform, new Vector3(0, 0.1f, 0), new Vector3(3.2f, 0.1f, 3.2f), color * 0.7f);
            }
            var piece = new Piece { root = root, destination = root.transform.position, color = color, moving = kind == "army" };
            pieces.Add(id, piece); return piece;
        }
        private void Put(HashSet<string> seen, string id, string kind, float x, float z, Color color, string label, float health = -1)
        {
            seen.Add(id);
            if (!pieces.TryGetValue(id, out var piece)) piece = Create(id, kind, x, z, color);
            piece.destination = new Vector3(x, 0, z); piece.label = label; piece.color = color; piece.health = health;
        }
        public void Sync(WorldSnapshot world, string ownId, string allianceId)
        {
            var seen = new HashSet<string>();
            foreach (var p in world.armies)
            {
                var color = p.ownerId == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, p.id, "army", p.x, p.z, color, p.name + " · Lv " + p.level + (p.mythic > 0 ? " + Mythic " + p.mythic : ""), (float)p.health / Mathf.Max(1, p.maxHealth));
                var armyPiece = pieces[p.id];
                if (armyPiece.mythicCount != p.mythic)
                {
                    var oldEscort = armyPiece.root.transform.Find("Mythic Escort");
                    if (oldEscort != null) Destroy(oldEscort.gameObject);
                    var escort = new GameObject("Mythic Escort").transform; escort.SetParent(armyPiece.root.transform, false);
                    for (int i = 0; i < Mathf.Min(3, p.mythic); i++)
                    {
                        var center = new Vector3(2 + i * 1.4f, 1, 0);
                        Shape(PrimitiveType.Capsule, escort, center, new Vector3(1.1f, 1.2f, 1.1f), new Color(0.6f, 0.44f, 0.26f));
                        Shape(PrimitiveType.Cube, escort, center + new Vector3(-0.45f, 1, 0), new Vector3(0.2f, 0.8f, 0.25f), gold);
                        Shape(PrimitiveType.Cube, escort, center + new Vector3(0.45f, 1, 0), new Vector3(0.2f, 0.8f, 0.25f), gold);
                    }
                    armyPiece.mythicCount = p.mythic;
                }
            }
            foreach (var p in world.players)
            {
                var color = p.id == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, "city-" + p.id, "city", p.homeX, p.homeZ, color, p.name + " · " + p.ageName + " · City " + p.cityLevel);
                pieces["city-" + p.id].root.transform.localScale = Vector3.one * (0.9f + 0.1f * p.cityLevel);
            }
            foreach (var c in world.camps) Put(seen, c.id, "camp", c.x, c.z, c.health > 0 ? red : Color.gray, c.name + " · Lv " + c.level + (c.health <= 0 ? " · " + c.respawn + "s" : ""), (float)c.health / c.maxHealth);
            foreach (var n in world.nodes) Put(seen, n.id, "node", n.x, n.z, n.resource == "stone" ? new Color(0.62f, 0.65f, 0.7f) : n.resource == "aether" ? new Color(0.6f, 0.35f, 0.9f) : n.resource == "gold" ? gold : n.resource == "wood" ? new Color(0.3f, 0.55f, 0.25f) : new Color(0.75f, 0.62f, 0.35f), n.name + " · " + n.remaining);
            foreach (var s in world.sites) Put(seen, s.id, "site", s.x, s.z, string.IsNullOrEmpty(s.allianceId) ? new Color(0.65f, 0.55f, 0.8f) : s.allianceId == allianceId ? blue : red, s.name + (s.progress > 0 ? " · " + Mathf.FloorToInt(s.progress / 15 * 100) + "%" : ""));
            foreach (var f in world.flags) Put(seen, f.id, "flag", f.x, f.z, f.allianceId == allianceId ? blue : red, "Alliance Beacon");
            var removed = new List<string>();
            foreach (var pair in pieces) if (!seen.Contains(pair.Key)) { Destroy(pair.Value.root); removed.Add(pair.Key); }
            foreach (var id in removed) pieces.Remove(id);
        }
        private void Update()
        {
            foreach (var piece in pieces.Values)
                piece.root.transform.position = piece.moving ? Vector3.Lerp(piece.root.transform.position, piece.destination, 1 - Mathf.Exp(-14 * Time.deltaTime)) : piece.destination;
        }
        public void DrawLabels(Camera camera)
        {
            if (camera == null || !labels) return;
            foreach (var pair in pieces)
            {
                var piece = pair.Value;
                var point = camera.WorldToScreenPoint(piece.root.transform.position + Vector3.up * 3.7f);
                if (point.z <= 0 || point.x < 0 || point.x > Screen.width || point.y < 0 || point.y > Screen.height) continue;
                float x = point.x, y = Screen.height - point.y;
                if (x < 320 || y < 65 || y > Screen.height - 44) continue;
                var rect = new Rect(x - 105, y - 10, 210, 22);
                GUI.color = pair.Key == selectedId ? Color.yellow : Color.white;
                GUI.Label(rect, piece.label, new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = 11 });
                GUI.color = Color.white;
                if (piece.health >= 0)
                {
                    GUI.color = new Color(0.12f, 0.12f, 0.12f); GUI.DrawTexture(new Rect(x - 30, y + 13, 60, 4), Texture2D.whiteTexture);
                    GUI.color = piece.color; GUI.DrawTexture(new Rect(x - 30, y + 13, 60 * Mathf.Clamp01(piece.health), 4), Texture2D.whiteTexture); GUI.color = Color.white;
                }
            }
        }
        public void Clear()
        {
            foreach (var piece in pieces.Values) Destroy(piece.root); pieces.Clear();
        }
        private void OnDestroy()
        {
            Clear(); if (scenery != null) Destroy(scenery.gameObject);
            foreach (var material in materials.Values) Destroy(material);
        }
    }
}
