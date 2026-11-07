using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed class WorldView : MonoBehaviour
    {
        private sealed class Piece { public GameObject root; public Vector3 destination; public string label; public Color color; public float health = -1; public bool moving; public string kind, visualKey; public WorldActorAnimation actor; }
        private readonly Dictionary<string, Piece> pieces = new Dictionary<string, Piece>();
        private readonly WorldArtFactory art = new WorldArtFactory();
        public bool reducedMotion;
        private readonly Color blue = new Color(0.2f, 0.7f, 1f), gold = new Color(0.9f, 0.7f, 0.3f), red = new Color(0.85f, 0.3f, 0.23f);
        private Transform scenery;
        private Texture2D groundTexture;
        public string selectedId;
        public bool labels = true;
        public float labelScale = 1;
        public System.Func<Vector2, bool> occluded;
        private Material MaterialFor(Color color) => art.MaterialFor(color);
        private Transform Shape(PrimitiveType type, Transform parent, Vector3 local, Vector3 scale, Color color) => art.Shape(parent, type, local, scale, color);
        private void Awake()
        {
            gameObject.AddComponent<BattlefieldAudio>();
            scenery = new GameObject("World Scenery").transform;
            var ground = GameObject.Find("Ground");
            if (ground == null) { ground = GameObject.CreatePrimitive(PrimitiveType.Cube); ground.name = "Ground"; }
            ground.transform.position = new Vector3(40, -0.3f, 40); ground.transform.localScale = new Vector3(80, 0.6f, 80);
            var groundMaterial = MaterialFor(new Color(0.78f, 0.8f, 0.7f));
            groundTexture = new Texture2D(256, 256, TextureFormat.RGB24, false) { name = "Kingdom grass and earth", wrapMode = TextureWrapMode.Repeat };
            var terrain = new Color[256 * 256];
            for (int y = 0; y < 256; y++) for (int x = 0; x < 256; x++)
            {
                float broad = Mathf.PerlinNoise(x * 0.025f + 43, y * 0.025f + 17);
                float grain = Mathf.PerlinNoise(x * 0.3f, y * 0.3f) * 0.12f;
                terrain[y * 256 + x] = Color.Lerp(new Color(0.28f, 0.35f, 0.24f), new Color(0.54f, 0.53f, 0.36f), Mathf.Clamp01(broad * 0.8f + grain));
            }
            groundTexture.SetPixels(terrain); groundTexture.Apply(false, true); groundMaterial.mainTexture = groundTexture;
            ground.GetComponent<Renderer>().sharedMaterial = groundMaterial;
            RenderSettings.ambientLight = new Color(0.58f, 0.62f, 0.65f);
            // Province boundaries communicate server-side access rules; gates are strategic objectives.
            Shape(PrimitiveType.Cube, scenery, new Vector3(40, 0.03f, 40), new Vector3(0.16f, 0.06f, 80), new Color(0.59f, 0.55f, 0.39f));
            Shape(PrimitiveType.Cube, scenery, new Vector3(40, 0.03f, 40), new Vector3(80, 0.06f, 0.16f), new Color(0.59f, 0.55f, 0.39f));
            var random = new System.Random(431);
            for (int i = 0; i < 90; i++)
            {
                float x = 2 + (float)random.NextDouble() * 76, z = 43 + (float)random.NextDouble() * 34;
                if (Mathf.Abs(x - 65) < 7 && Mathf.Abs(z - 65) < 7) continue;
                Shape(PrimitiveType.Cylinder, scenery, new Vector3(x, 0.8f, z), new Vector3(0.25f, 0.8f, 0.25f), new Color(0.28f, 0.2f, 0.13f));
                Shape(PrimitiveType.Sphere, scenery, new Vector3(x, 2.1f, z), new Vector3(1.6f, 2.5f, 1.6f), new Color(0.18f + i % 3 * 0.025f, 0.29f + i % 3 * 0.02f, 0.18f));
                if (i % 4 == 0) Shape(PrimitiveType.Sphere, scenery, new Vector3(x + 0.7f, 0.3f, z + 1), new Vector3(0.9f, 0.6f, 0.8f), new Color(0.4f, 0.43f, 0.38f));
            }
        }
        private Piece Create(string id, string kind, float x, float z, Color color)
        {
            var root = new GameObject(kind + " " + id); root.transform.SetParent(transform, false); root.transform.position = new Vector3(x, 0, z);
            var marker = root.AddComponent<MapMarker>(); marker.id = id; marker.kind = kind;
            var collider = root.AddComponent<BoxCollider>(); collider.center = new Vector3(0, 1.2f, 0); collider.size = new Vector3(2.8f, 2.8f, 2.8f);
            var piece = new Piece { root = root, destination = root.transform.position, color = color, kind = kind, moving = kind == "army" };
            pieces.Add(id, piece); return piece;
        }
        private void Put(HashSet<string> seen, string id, string kind, float x, float z, Color color, string label, float health = -1, string variant = "", int mythic = 0, UnitCounts units = null, string commanderId = "")
        {
            seen.Add(id);
            if (!pieces.TryGetValue(id, out var piece)) piece = Create(id, kind, x, z, color);
            piece.destination = new Vector3(x, 0, z); piece.label = label; piece.color = color; piece.health = health;
            string visualKey = kind + ":" + variant + ":" + ColorUtility.ToHtmlStringRGB(color) + ":" + Mathf.Min(3, mythic) + ":" + commanderId + ":" + (units == null ? "" : (units.infantry > 0 ? "I" : "") + (units.archers > 0 ? "A" : "") + (units.cavalry > 0 ? "C" : "") + Mathf.Min(3, units.Total));
            if (piece.visualKey != visualKey)
            {
                if (piece.actor != null) { piece.actor.gameObject.SetActive(false); Destroy(piece.actor.gameObject); }
                piece.actor = art.Build(piece.root.transform, kind, variant, color, mythic, units, commanderId); piece.visualKey = visualKey;
            }
            if (piece.actor.fire != null) piece.actor.fire.gameObject.SetActive(health != 0);
        }
        public void Sync(WorldSnapshot world, string ownId, string allianceId)
        {
            var seen = new HashSet<string>();
            foreach (var p in world.armies)
            {
                var color = p.ownerId == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, p.id, "army", p.x, p.z, color, p.name + " · Lv " + p.level + (p.mythic > 0 ? " + Mythic " + p.mythic : ""), (float)p.health / Mathf.Max(1, p.maxHealth), p.civilization, p.mythic, p.units, p.commanderId);
                pieces[p.id].actor.allowAudio = p.ownerId == ownId;
                pieces[p.id].actor.Observe(p);
            }
            foreach (var p in world.players)
            {
                var color = p.id == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, "city-" + p.id, "city", p.homeX, p.homeZ, color, p.name + " · " + p.ageName + " · City " + p.cityLevel, -1, p.civilization);
                pieces["city-" + p.id].root.transform.localScale = Vector3.one * (0.9f + 0.1f * p.cityLevel);
            }
            foreach (var c in world.camps)
            {
                bool wasAlive = pieces.TryGetValue(c.id, out var previous) && previous.health > 0;
                Put(seen, c.id, "camp", c.x, c.z, c.health > 0 ? red : Color.gray, c.name + " · Lv " + c.level + (c.health <= 0 ? " · " + c.respawn + "s" : ""), (float)c.health / c.maxHealth, c.id);
                pieces[c.id].actor.ObserveCamp(c, wasAlive && c.health <= 0);
            }
            foreach (var n in world.nodes) Put(seen, n.id, "node", n.x, n.z, n.resource == "stone" ? new Color(0.62f, 0.65f, 0.7f) : n.resource == "aether" ? new Color(0.6f, 0.35f, 0.9f) : n.resource == "gold" ? gold : n.resource == "wood" ? new Color(0.3f, 0.55f, 0.25f) : new Color(0.75f, 0.62f, 0.35f), n.name + " · " + n.remaining, -1, n.resource);
            foreach (var s in world.sites) Put(seen, s.id, "site", s.x, s.z, string.IsNullOrEmpty(s.allianceId) ? new Color(0.65f, 0.55f, 0.8f) : s.allianceId == allianceId ? blue : red, s.name + (s.progress > 0 ? " · " + Mathf.FloorToInt(s.progress / 15 * 100) + "%" : ""), s.health / Mathf.Max(1, s.maxHealth), s.kind);
            foreach (var f in world.flags)
            {
                string name = f.isRoot ? "Alliance Fort" : "Alliance Beacon";
                string state = f.buildRemaining > 0 ? " · Building " + Mathf.CeilToInt(f.buildRemaining) + "s" : f.connected ? "" : " · Disconnected";
                string variant = (f.isRoot ? "fort-" : "") + (f.connected ? "connected" : "inactive");
                Put(seen, f.id, "flag", f.x, f.z, f.connected ? (f.allianceId == allianceId ? blue : red) : Color.gray, name + state, f.health / Mathf.Max(1, f.maxHealth), variant);
            }
            foreach (var pin in world.markers) Put(seen, pin.id, "marker", pin.x, pin.z, new Color(0.85f, 0.45f, 0.8f), pin.name);
            var removed = new List<string>();
            foreach (var pair in pieces) if (!seen.Contains(pair.Key)) { Destroy(pair.Value.root); removed.Add(pair.Key); }
            foreach (var id in removed) pieces.Remove(id);
        }
        private void Update()
        {
            var camera = Camera.main;
            bool wide = camera != null && camera.orthographicSize > 25;
            foreach (var pair in pieces)
            {
                var piece = pair.Value;
                if (piece.moving && (piece.root.transform.position - piece.destination).sqrMagnitude > 144)
                { piece.root.transform.position = piece.destination; piece.actor.RebaseMotion(); }
                piece.root.transform.position = piece.moving ? Vector3.Lerp(piece.root.transform.position, piece.destination, 1 - Mathf.Exp(-14 * Time.deltaTime)) : piece.destination;
                if (piece.actor != null) { piece.actor.reducedMotion = reducedMotion; piece.actor.SetSelected(pair.Key == selectedId); piece.actor.SetWideView(wide); }
            }
        }
        public void DrawLabels(Camera camera)
        {
            if (camera == null || !labels) return;
            foreach (var pair in pieces)
            {
                var piece = pair.Value;
                if (piece.actor != null) piece.actor.DrawCaption(camera, labelScale, occluded);
                var point = camera.WorldToScreenPoint(piece.root.transform.position + Vector3.up * 3.7f);
                if (point.z <= 0 || point.x < 0 || point.x > Screen.width || point.y < 0 || point.y > Screen.height) continue;
                float x = point.x, y = Screen.height - point.y;
                if (occluded != null && occluded(new Vector2(x, y))) continue;
                if (piece.kind == "node" && camera.orthographicSize > 20 && pair.Key != selectedId) continue;
                if (piece.kind == "camp" && camera.orthographicSize > 34 && pair.Key != selectedId) continue;
                var rect = new Rect(x - 105 * labelScale, y - 10 * labelScale, 210 * labelScale, 22 * labelScale);
                GUI.color = pair.Key == selectedId ? Color.yellow : Color.white;
                GUI.Label(rect, piece.label, new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = Mathf.RoundToInt(11 * labelScale) });
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
            art.Dispose(); if (groundTexture != null) Destroy(groundTexture);
        }
    }
}
