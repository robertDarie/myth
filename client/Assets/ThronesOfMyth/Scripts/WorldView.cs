using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class WorldView : MonoBehaviour
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
            gameObject.AddComponent<BattlefieldAudio>(); gameObject.AddComponent<BattlefieldFeedback>();
            BuildKingdomEnvironment();
        }
        private Piece Create(string id, string kind, float x, float z, Color color)
        {
            var root = new GameObject(kind + " " + id); root.transform.SetParent(transform, false); root.transform.position = new Vector3(x, 0, z);
            var marker = root.AddComponent<MapMarker>(); marker.id = id; marker.kind = kind;
            var collider = root.AddComponent<BoxCollider>(); collider.center = new Vector3(0, 1.2f, 0); collider.size = new Vector3(2.8f, 2.8f, 2.8f);
            var piece = new Piece { root = root, destination = root.transform.position, color = color, kind = kind, moving = kind == "army" || kind == "scout" };
            pieces.Add(id, piece); return piece;
        }
        private void Put(HashSet<string> seen, string id, string kind, float x, float z, Color color, string label, float health = -1, string variant = "", int mythic = 0, UnitCounts units = null, string commanderId = "")
        {
            seen.Add(id);
            if (!pieces.TryGetValue(id, out var piece)) piece = Create(id, kind, x, z, color);
            piece.destination = new Vector3(x, 0, z); piece.label = label; piece.color = color; piece.health = health;
            string visualKey = kind + ":" + variant + ":" + ColorUtility.ToHtmlStringRGB(color) + ":" + Mathf.Min(3, mythic) + ":" + commanderId + ":" + (units == null ? "" : (units.Infantry > 0 ? "I" : "") + (units.Archers > 0 ? "A" : "") + (units.Cavalry > 0 ? "C" : "") + Mathf.Min(3, units.Total)+":"+Mathf.Min(3,units.veteranInfantry)+":"+Mathf.Min(3,units.veteranArchers)+":"+Mathf.Min(3,units.veteranCavalry));
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
            UpdateFog(world.exploration);
            if (world.exploration != null) foreach (var scout in world.exploration.scouts) Put(seen, scout.id, "scout", scout.x, scout.z, Color.cyan, "Scout · " + scout.phase);
            foreach (var p in world.armies)
            {
                var color = p.ownerId == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, p.id, "army", p.x, p.z, color, p.name + " · Lv " + p.level + (p.units.Veterans>0?" · T2: "+p.units.Veterans:"") + (p.mythic > 0 ? " + Mythic " + p.mythic : ""), (float)p.health / Mathf.Max(1, p.maxHealth), p.civilization, p.mythic, p.units, p.commanderId);
                pieces[p.id].actor.allowAudio = p.ownerId == ownId;
                pieces[p.id].actor.Observe(p);
            }
            foreach (var p in world.players)
            {
                var color = p.id == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, "city-" + p.id, "city", p.homeX, p.homeZ, color, p.name + " · " + p.ageName + " · City " + p.cityLevel, -1, p.civilization);
                pieces["city-" + p.id].root.transform.localScale = Vector3.one * (0.82f + 0.035f * p.cityLevel);
            }
            foreach (var boss in world.strongholds)
            {
                bool wasAlive = pieces.TryGetValue(boss.id, out var previousBoss) && previousBoss.health > 0;
                Put(seen, boss.id, "stronghold", boss.x, boss.z, boss.respawn > 0 ? Color.gray : red, boss.name + " · Tier " + boss.tier + (boss.respawn > 0 ? " · Reforms " + Mathf.CeilToInt(boss.respawn) + "s" : " · Guards " + Mathf.CeilToInt(boss.guardHealth) + "/" + Mathf.CeilToInt(boss.maxGuardHealth)), boss.health / Mathf.Max(1, boss.maxHealth), boss.tier.ToString());
                pieces[boss.id].actor.ObserveCamp(new CampData { health = Mathf.CeilToInt(boss.guardHealth + boss.health) }, wasAlive && boss.respawn > 0);
            }
            foreach (var c in world.camps)
            {
                bool wasAlive = pieces.TryGetValue(c.id, out var previous) && previous.health > 0;
                Put(seen, c.id, "camp", c.x, c.z, c.health > 0 ? red : Color.gray, c.name + " · Lv " + c.level + (c.health <= 0 ? " · " + c.respawn + "s" : ""), (float)c.health / c.maxHealth, c.id);
                pieces[c.id].actor.ObserveCamp(c, wasAlive && c.health <= 0);
            }
            foreach (var n in world.nodes) Put(seen, n.id, "node", n.x, n.z, n.resource == "stone" ? new Color(0.62f, 0.65f, 0.7f) : n.resource == "aether" ? new Color(0.6f, 0.35f, 0.9f) : n.resource == "gold" ? gold : n.resource == "wood" ? new Color(0.3f, 0.55f, 0.25f) : new Color(0.75f, 0.62f, 0.35f), n.name + " · " + n.remaining, -1, n.resource);
            foreach (var s in world.sites) Put(seen, s.id, "site", s.x, s.z, string.IsNullOrEmpty(s.allianceId) ? new Color(0.65f, 0.55f, 0.8f) : s.allianceId == allianceId ? blue : red, s.name + (s.locked ? " · Sealed" : "") + (s.unknown ? " · Unsurveyed" : "") + (s.progress > 0 ? " · " + Mathf.FloorToInt(s.progress / 15 * 100) + "%" : ""), s.health / Mathf.Max(1, s.maxHealth), s.kind);
            foreach (var f in world.flags)
            {
                string name = f.isRoot ? "Alliance Fort" : "Alliance Beacon";
                string state = f.buildRemaining > 0 ? " · Building " + Mathf.CeilToInt(f.buildRemaining) + "s" : f.connected ? "" : " · Disconnected";
                string variant = (f.isRoot ? "fort-" : "") + (f.connected ? "connected" : "inactive");
                Put(seen, f.id, "flag", f.x, f.z, f.connected ? (f.allianceId == allianceId ? blue : red) : Color.gray, name + state, f.health / Mathf.Max(1, f.maxHealth), variant);
            }
            foreach (var pin in world.markers) Put(seen, pin.id, "marker", pin.x, pin.z, new Color(0.85f, 0.45f, 0.8f), pin.name);
            ObserveCompletedBattles(world,ownId);
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
        private readonly List<Rect> labelBounds = new List<Rect>();
        public void DrawLabels(Camera camera)
        {
            if (camera == null || !labels) return;
            var colorBefore = GUI.color;
            labelBounds.Clear();
            var order = new List<string>(pieces.Keys);
            order.Sort((a, b) => LabelPriority(a).CompareTo(LabelPriority(b)));
            var style = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = Mathf.Max(10, Mathf.RoundToInt(11 * labelScale)), wordWrap = false, padding = new RectOffset(5, 5, 0, 0), clipping = TextClipping.Clip };
            foreach (string id in order)
            {
                var piece = pieces[id];
                if (piece.actor != null) piece.actor.DrawCaption(camera, labelScale, occluded);
                var point = camera.WorldToScreenPoint(piece.root.transform.position + Vector3.up * (piece.kind == "army" ? 2.8f : 3.7f));
                if (point.z <= 0 || point.x < 0 || point.x > Screen.width || point.y < 0 || point.y > Screen.height) continue;
                if (piece.kind == "node" && camera.orthographicSize > 20 && id != selectedId) continue;
                if (piece.kind == "camp" && camera.orthographicSize > 34 && id != selectedId) continue;
                float width = Mathf.Clamp(style.CalcSize(new GUIContent(piece.label)).x, 70 * labelScale, 210 * labelScale);
                var rect = new Rect(point.x - width / 2, Screen.height - point.y - 10 * labelScale, width, 22 * labelScale);
                bool placed = false;
                for (int attempt = 0; attempt < 3; attempt++)
                {
                    bool collision = false;
                    foreach (var occupied in labelBounds) if (occupied.Overlaps(rect)) { collision = true; break; }
                    bool blocked = occluded != null && (occluded(rect.center) || occluded(new Vector2(rect.xMin, rect.yMin)) || occluded(new Vector2(rect.xMax, rect.yMax)));
                    if (!collision && !blocked && rect.yMin >= 0 && rect.yMax <= Screen.height) { placed = true; break; }
                    rect.y -= 24 * labelScale;
                }
                if (!placed) continue;
                labelBounds.Add(new Rect(rect.x - 3, rect.y - 2, rect.width + 6, rect.height + 8));
                GUI.color = new Color(.025f, .06f, .08f, id == selectedId ? .92f : .72f); GUI.DrawTexture(rect, Texture2D.whiteTexture);
                GUI.color = id == selectedId ? MythInterfaceTheme.Gold : MythInterfaceTheme.Cream;
                GUI.Label(rect, piece.label, style);
                if (piece.health >= 0)
                {
                    GUI.color = new Color(.025f, .05f, .06f); GUI.DrawTexture(new Rect(rect.center.x - 30, rect.yMax + 2, 60, 3), Texture2D.whiteTexture);
                    GUI.color = piece.color; GUI.DrawTexture(new Rect(rect.center.x - 30, rect.yMax + 2, 60 * Mathf.Clamp01(piece.health), 3), Texture2D.whiteTexture);
                }
            }
            GUI.color = colorBefore;
        }
        private int LabelPriority(string id)
        {
            if (id == selectedId) return 0;
            string kind = pieces[id].kind;
            return kind == "city" ? 1 : kind == "army" ? 2 : kind == "site" ? 3 : kind == "camp" ? 4 : 5;
        }
        public void Clear()
        {
            foreach (var piece in pieces.Values) Destroy(piece.root); pieces.Clear();
        }
        private void OnDestroy()
        {
            Clear(); DisposeFog(); if (scenery != null) Destroy(scenery.gameObject);
            art.Dispose(); if (terrainMaterial != null) Destroy(terrainMaterial); if (groundTexture != null) Destroy(groundTexture);
        }
    }
}
