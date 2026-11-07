using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    // Shared materials and inexpensive, original strategy-scale silhouettes.
    // Models are deliberately stylized proxies, ready to be replaced by rigged art.
    public sealed partial class WorldArtFactory
    {
        private readonly Dictionary<Color, Material> materials = new Dictionary<Color, Material>();
        private readonly Color stone = new Color(0.72f, 0.69f, 0.57f), darkStone = new Color(0.35f, 0.39f, 0.36f), bronze = new Color(0.64f, 0.43f, 0.19f), timber = new Color(0.29f, 0.18f, 0.10f);
        public Material MaterialFor(Color color)
        {
            if (!materials.TryGetValue(color, out var material))
            {
                material = new Material(Shader.Find("Standard")) { color = color };
                material.SetFloat("_Glossiness", 0.16f); materials.Add(color, material);
            }
            return material;
        }
        public Transform Shape(Transform parent, PrimitiveType type, Vector3 at, Vector3 scale, Color color)
        {
            var obj = GameObject.CreatePrimitive(type); obj.transform.SetParent(parent, false);
            obj.transform.localPosition = at; obj.transform.localScale = scale;
            obj.GetComponent<Renderer>().sharedMaterial = MaterialFor(color);
            Object.Destroy(obj.GetComponent<Collider>()); return obj.transform;
        }
        private Transform Box(Transform p, float x, float y, float z, float w, float h, float d, Color c) => Shape(p, PrimitiveType.Cube, new Vector3(x, y, z), new Vector3(w, h, d), c);
        private Transform Ball(Transform p, float x, float y, float z, float w, float h, float d, Color c) => Shape(p, PrimitiveType.Sphere, new Vector3(x, y, z), new Vector3(w, h, d), c);
        private Transform Pillar(Transform p, float x, float y, float z, float width, float height, Color c) => Shape(p, PrimitiveType.Cylinder, new Vector3(x, y, z), new Vector3(width, height / 2, width), c);
        public LineRenderer Ring(Transform parent, float radius, Color color, float width = 0.07f)
        {
            var line = new GameObject("Engraved boundary").AddComponent<LineRenderer>(); line.transform.SetParent(parent, false);
            line.useWorldSpace = false; line.loop = true; line.positionCount = 48; line.widthMultiplier = width;
            line.sharedMaterial = MaterialFor(color); line.startColor = line.endColor = Color.white;
            for (int i = 0; i < 48; i++) { float a = i * Mathf.PI * 2 / 48; line.SetPosition(i, new Vector3(Mathf.Cos(a) * radius, 0.09f, Mathf.Sin(a) * radius)); }
            return line;
        }
        private void Roof(Transform p, float y, float width, float depth, Color c)
        {
            for (int side = -1; side <= 1; side += 2)
            {
                var roof = Box(p, side * width * 0.23f, y, 0, width * 0.56f, 0.18f, depth, c);
                roof.localRotation = Quaternion.Euler(0, 0, -side * 26);
            }
        }
        private void Temple(Transform p, Color team, bool grand)
        {
            Box(p, 0, 0.15f, 0, 4, 0.3f, 3.5f, darkStone);
            Box(p, 0, 0.38f, 0, 3.6f, 0.18f, 3.1f, stone);
            for (int x = -1; x <= 1; x += 2) for (int z = -1; z <= 1; z++)
            {
                Pillar(p, x * 1.35f, 1.45f, z * 1.1f, 0.32f, 2, stone);
                Box(p, x * 1.35f, 2.46f, z * 1.1f, 0.51f, 0.17f, 0.51f, bronze);
            }
            Box(p, 0, 1.25f, 0.15f, 1.7f, 1.8f, 1.6f, stone);
            Box(p, 0, 1.1f, -0.68f, 0.7f, 1.3f, 0.06f, team * 0.5f);
            Roof(p, 2.9f, 3.6f, 3.4f, bronze);
            if (grand) { Pillar(p, 0, 3.6f, 0, 0.5f, 0.8f, bronze); Ball(p, 0, 4.1f, 0, 0.7f, 0.7f, 0.7f, team); }
        }
        public WorldActorAnimation Build(Transform parent, string kind, string variant, Color team, int mythic = 0, UnitCounts units = null, string commanderId = "")
        {
            var root = new GameObject("Artwork · " + variant).transform; root.SetParent(parent, false);
            var actor = root.gameObject.AddComponent<WorldActorAnimation>(); actor.artwork = root;
            if (kind == "army")
            {
                units = units ?? new UnitCounts { infantry = 3 };
                var types = new List<string>();
                foreach (var type in new[] { "infantry", "archers", "cavalry" })
                {
                    int count = type == "infantry" ? units.infantry : type == "archers" ? units.archers : units.cavalry;
                    if (count > 0) types.Add(type);
                }
                int proxies = Mathf.Min(3, units.Total);
                for (int i = 0; i < proxies; i++) Soldier(root, new Vector3((i - (proxies - 1) / 2f) * 0.85f, 0, -0.45f), team, variant, actor, types[i % types.Count]);
                Commander(root, commanderId, team, actor);
                actor.projectile = Box(root, 0, 1.4f, 0, 0.06f, 0.06f, 0.5f, bronze); actor.projectile.name = "Arrow visual"; actor.projectile.gameObject.SetActive(false);
                for (int i = 0; i < Mathf.Min(3, mythic); i++) Beast(root, new Vector3(1.7f + i * 1.45f, 0, 0), variant, team, actor);
                actor.selection = Ring(root, 1.5f, team, 0.08f).gameObject; actor.selection.SetActive(false);
                actor.skillLine = Ring(root, 1.7f, new Color(1, 0.72f, 0.3f), 0.15f); actor.skill = actor.skillLine.gameObject; actor.skill.SetActive(false);
                actor.damageMaterial = actor.skillLine.sharedMaterial; actor.healMaterial = MaterialFor(new Color(0.4f, 0.9f, 0.65f)); actor.shieldMaterial = MaterialFor(new Color(0.5f, 0.8f, 1));
                actor.impact = Ring(root, 0.5f, new Color(1, 0.78f, 0.4f), 0.09f).transform; actor.impact.gameObject.SetActive(false);
                actor.shield = Ring(root, 1.9f, new Color(0.45f, 0.72f, 0.93f), 0.10f).gameObject; actor.shield.SetActive(false);
            }
            else if (kind == "scout") { Soldier(root, Vector3.zero, team, "greek", actor, "cavalry"); actor.selection = Ring(root, 1.1f, team).gameObject; actor.selection.SetActive(false); }
            else if (kind == "city") City(root, variant, team);
            else if (kind == "node") Resource(root, variant, team);
            else if (kind == "marker") { Pillar(root, 0, 1, 0, 0.1f, 2, bronze); Ball(root, 0, 2.1f, 0, 0.5f, 0.5f, 0.5f, team); Ring(root, 0.6f, team); }
            else if (kind == "flag")
            {
                Pillar(root, 0, 1.75f, 0, 0.13f, 3.5f, bronze);
                actor.banner = Box(root, 0.65f, 2.9f, 0, 1.3f, 0.9f, 0.07f, team);
                Ball(root, 0, 3.65f, 0, 0.23f, 0.23f, 0.23f, bronze);
                if (variant.StartsWith("fort-"))
                {
                    Box(root, 0, 0.35f, 0, 3.2f, 0.7f, 3, darkStone);
                    for (int i = 0; i < 4; i++) { float x = i % 2 == 0 ? -1.3f : 1.3f, z = i < 2 ? -1.2f : 1.2f; Box(root, x, 1.15f, z, 0.6f, 1.6f, 0.6f, stone); }
                }
                if (variant == "connected" || variant == "fort-connected") Ring(root, 5, team, 0.10f);
            }
            else if (kind == "site")
            {
                if (variant == "gate")
                {
                    Box(root, -1.55f, 1.7f, 0, 1, 3.4f, 1.6f, stone); Box(root, 1.55f, 1.7f, 0, 1, 3.4f, 1.6f, stone);
                    Box(root, 0, 3.45f, 0, 4.2f, 0.6f, 1.8f, darkStone);
                    for (int i = -1; i <= 1; i += 2) Box(root, i * 1.55f, 2.25f, -0.83f, 0.4f, 1.2f, 0.06f, team);
                    Ring(root, 2.5f, team);
                }
                else Temple(root, team, variant != "shrine");
            }
            else if (kind == "stronghold")
            {
                Box(root, 0, 0.3f, 0, 5.8f, 0.6f, 5, darkStone);
                for (int i = 0; i < 4; i++)
                {
                    float x = i % 2 == 0 ? -2.3f : 2.3f, z = i < 2 ? -1.8f : 1.8f;
                    Box(root, x, 1.8f, z, 1.1f, 3.6f, 1.1f, darkStone);
                    Box(root, x, 3.7f, z, 1.4f, 0.35f, 1.4f, bronze);
                    Ball(root, x, 4, z, 0.35f, 0.5f, 0.35f, team);
                }
                Box(root, 0, 1.4f, 1.8f, 3.8f, 2.5f, 0.55f, darkStone);
                Box(root, -1.3f, 1.4f, -1.8f, 1.4f, 2.5f, 0.55f, darkStone);
                Box(root, 1.3f, 1.4f, -1.8f, 1.4f, 2.5f, 0.55f, darkStone);
                Box(root, 0, 2.8f, -1.8f, 3.8f, 0.45f, 0.65f, bronze);
                Pillar(root, 0, 2, 0.5f, 0.14f, 4, bronze);
                actor.banner = Box(root, 0.55f, 3.3f, 0.5f, 1.1f, 0.9f, 0.08f, team);
                for (int i = -1; i <= 1; i += 2) Soldier(root, new Vector3(i * 1.2f, 0, -2.9f), team, "greek", actor, "infantry");
                Ring(root, 3.3f, team, 0.12f);
            }
            else if (kind == "camp")
            {
                if (variant == "forsaken-4" || variant == "forsaken-6") Beast(root, Vector3.zero, variant == "forsaken-6" ? "norse" : "greek", team);
                else
                {
                    for (int i = -1; i <= 1; i += 2)
                    {
                        var tent = new GameObject("War tent").transform; tent.SetParent(root, false); tent.localPosition = new Vector3(i * 0.95f, 0, 0.35f);
                        Roof(tent, 0.8f, 1.8f, 1.9f, team * 0.75f); Box(tent, 0, 0.4f, -0.85f, 0.7f, 0.8f, 0.06f, timber);
                    }
                    for (int i = -2; i <= 2; i++) Pillar(root, i * 0.8f, 0.5f, 1.65f, 0.20f, 1, timber);
                }
                Pillar(root, 0, 0.15f, -1.3f, 0.9f, 0.3f, darkStone);
                actor.fire = Ball(root, 0, 0.48f, -1.3f, 0.4f, 0.6f, 0.4f, new Color(1, 0.54f, 0.16f));
            }
            if (actor.selection == null)
            {
                actor.selection = Ring(root, kind == "node" ? 1.5f : 2.6f, team, 0.09f).gameObject;
                actor.selection.SetActive(false);
            }
            return actor;
        }
        private void City(Transform root, string culture, Color team)
        {
            if (culture == "greek" || string.IsNullOrEmpty(culture)) { Temple(root, team, false); return; }
            Box(root, 0, 0.12f, 0, 4, 0.24f, 3.5f, darkStone);
            if (culture == "egyptian")
            {
                for (int i = 0; i < 5; i++) Box(root, 0.6f, 0.35f + i * 0.42f, 0.45f, 2.7f - i * 0.48f, 0.42f, 2.7f - i * 0.48f, stone);
                for (int side = -1; side <= 1; side += 2) { Box(root, side * 1.15f, 1, -1, 0.8f, 1.8f, 0.7f, stone); Box(root, side * 1.15f, 1, -1.38f, 0.25f, 1.3f, 0.05f, team); }
            }
            else if (culture == "norse")
            {
                Box(root, 0, 0.95f, 0, 2.7f, 1.6f, 2.5f, timber); Roof(root, 2.1f, 3.5f, 3.2f, darkStone);
                for (int i = -1; i <= 1; i += 2) { Pillar(root, i * 1.35f, 1.1f, -1.25f, 0.25f, 2, bronze); Box(root, i * 0.8f, 1.2f, -1.28f, 0.45f, 0.9f, 0.08f, team); }
            }
            else
            {
                int tiers = culture == "japanese" ? 3 : 2;
                for (int i = 0; i < tiers; i++)
                {
                    float width = 3.3f - i * 0.65f, y = 0.8f + i * 0.95f;
                    Box(root, 0, y, 0, width - 0.5f, 0.95f, width - 0.5f, culture == "japanese" ? stone : new Color(0.47f, 0.16f, 0.13f));
                    Roof(root, y + 0.68f, width + 0.35f, width + 0.2f, culture == "japanese" ? darkStone : bronze);
                    Box(root, 0, y, -width / 2 + 0.23f, 0.6f, 0.7f, 0.05f, team);
                }
            }
        }
        private Transform Pivot(Transform parent, string name, Vector3 at)
        {
            var pivot = new GameObject(name).transform; pivot.SetParent(parent, false); pivot.localPosition = at; return pivot;
        }
        private WorldActorAnimation.Rig Soldier(Transform root, Vector3 offset, Color team, string culture, WorldActorAnimation actor, string type, bool commander = false)
        {
            var unit = Pivot(root, commander ? "Commander" : type + " formation proxy", offset);
            var rig = new WorldActorAnimation.Rig { root = unit, ranged = type == "archers", mounted = type == "cavalry", commander = commander };
            actor.rigs.Add(rig); if (!commander) actor.soldiers.Add(unit.gameObject);
            rig.bodyRest = Vector3.up * (rig.mounted ? 0.65f : 0);
            rig.body = Pivot(unit, "Breathing torso", rig.bodyRest);
            Box(rig.body, 0, 0.88f, 0, 0.42f, 0.55f, 0.32f, team);
            Ball(rig.body, 0, 1.38f, 0, 0.39f, 0.42f, 0.38f, stone);
            Ball(rig.body, 0, 1.55f, 0, 0.43f, 0.22f, 0.42f, type == "archers" ? team * 0.5f : culture == "norse" ? darkStone : bronze);
            Box(rig.body, 0, 1.33f, 0.18f, 0.22f, 0.07f, 0.05f, timber);
            rig.leftLeg = Pivot(rig.body, "Left hip", new Vector3(-0.13f, 0.62f, 0));
            rig.rightLeg = Pivot(rig.body, "Right hip", new Vector3(0.13f, 0.62f, 0));
            Box(rig.leftLeg, 0, -0.29f, 0, 0.15f, 0.58f, 0.17f, darkStone);
            Box(rig.rightLeg, 0, -0.29f, 0, 0.15f, 0.58f, 0.17f, darkStone);
            rig.weapon = Pivot(rig.body, "Weapon shoulder", new Vector3(0.3f, 1.08f, 0));
            rig.offhand = Pivot(rig.body, "Offhand shoulder", new Vector3(-0.3f, 1.08f, 0));
            Box(rig.weapon, 0, -0.22f, 0, 0.15f, 0.45f, 0.17f, bronze);
            Box(rig.offhand, 0, -0.22f, 0, 0.15f, 0.45f, 0.17f, bronze);
            if (rig.ranged)
            {
                var bow = Pivot(rig.offhand, "Bow", new Vector3(0, -0.3f, 0.24f));
                for (int i = -1; i <= 1; i += 2)
                { var limb = Box(bow, 0, i * 0.24f, 0, 0.06f, 0.55f, 0.06f, timber); limb.localRotation = Quaternion.Euler(i * 25, 0, 0); }
                Box(bow, 0, 0, -0.11f, 0.025f, 0.95f, 0.025f, stone);
                Box(rig.body, 0.15f, 0.95f, -0.23f, 0.22f, 0.6f, 0.2f, timber);
            }
            else
            {
                Box(rig.weapon, 0, 0.15f, 0.16f, 0.06f, 1.5f, 0.06f, timber);
                Box(rig.weapon, 0, 0.94f, 0.16f, 0.11f, 0.27f, 0.08f, stone);
                if (culture == "greek") GreekShield(rig.offhand);
                else { var shield = Pillar(rig.offhand, 0, -0.13f, 0.11f, 0.51f, 0.12f, bronze); shield.localRotation = Quaternion.Euler(90, 0, 0); }
            }
            if (culture == "greek") GreekKit(rig, type);
            if (commander)
            {
                unit.localScale = Vector3.one * 1.25f;
                rig.cloak = Pivot(rig.body, "Commander's cloak", new Vector3(0, 1.14f, -0.2f));
                Box(rig.cloak, 0, -0.38f, -0.05f, 0.66f, 0.8f, 0.07f, team * 0.6f);
            }
            if (rig.mounted)
            {
                Ball(unit, 0, 0.8f, 0, 0.6f, 0.65f, 1.3f, timber);
                Ball(unit, 0, 1.18f, 0.55f, 0.35f, 0.7f, 0.45f, timber);
                Ball(unit, 0, 1.5f, 0.75f, 0.38f, 0.34f, 0.7f, timber);
                for (int i = 0; i < 4; i++)
                {
                    var hip = Pivot(unit, "Horse hip", new Vector3(i % 2 == 0 ? -0.23f : 0.23f, 0.65f, i < 2 ? -0.42f : 0.42f));
                    Box(hip, 0, -0.32f, 0, 0.13f, 0.65f, 0.14f, timber); rig.horseLegs.Add(hip);
                }
            }
            return rig;
        }
        private void Commander(Transform root, string id, Color team, WorldActorAnimation actor)
        {
            bool bow = id == "scout" || id == "atalanta";
            Color cloth = id == "rune-seer" ? new Color(0.4f, 0.63f, 0.78f) : id == "warden" || bow ? new Color(0.25f, 0.42f, 0.25f) : id == "mulan" || id == "tomoe" || id == "wukong" ? new Color(0.6f, 0.16f, 0.12f) : team;
            string culture = id == "mulan" || id == "wukong" ? "chinese" : id == "tomoe" ? "japanese" : id == "rune-seer" || id == "sigurd" ? "norse" : id == "horus-champion" ? "egyptian" : "greek";
            var rig = Soldier(root, new Vector3(0, 0, 0.9f), cloth, culture, actor, bow ? "archers" : "infantry", true);
            rig.root.name = "Commander · " + id;
            if (id == "rune-seer" || id == "horus-champion")
                Ball(rig.weapon, 0, 1.18f, 0.16f, 0.26f, 0.26f, 0.26f, new Color(0.5f, 0.85f, 1));
            if (id == "heracles" || id == "sigurd")
            {
                Ball(rig.body, -0.27f, 1.14f, 0, 0.42f, 0.35f, 0.45f, id == "heracles" ? bronze : stone);
                Ball(rig.body, 0.27f, 1.14f, 0, 0.42f, 0.35f, 0.45f, id == "heracles" ? bronze : stone);
                Box(rig.weapon, 0, 0.8f, 0.16f, id == "heracles" ? 0.3f : 0.17f, 0.55f, 0.15f, id == "heracles" ? timber : stone);
            }
            if (id == "horus-champion")
                for (int side = -1; side <= 1; side += 2) Box(rig.body, side * 0.26f, 1.49f, -0.02f, 0.16f, 0.6f, 0.2f, bronze);
            if (id == "wukong")
            {
                Ball(rig.body, -0.24f, 1.4f, 0, 0.16f, 0.2f, 0.16f, bronze); Ball(rig.body, 0.24f, 1.4f, 0, 0.16f, 0.2f, 0.16f, bronze);
                var tail = Box(rig.body, 0.23f, 0.55f, -0.5f, 0.1f, 0.1f, 0.7f, bronze); tail.localRotation = Quaternion.Euler(-25, 25, 0);
                Box(rig.weapon, 0, 0.3f, 0.16f, 0.09f, 2.1f, 0.09f, bronze);
            }
            if (id == "captain" || id == "mulan" || id == "tomoe") Box(rig.body, 0, 1.77f, -0.04f, 0.14f, 0.34f, 0.4f, cloth);
        }
        private void Beast(Transform root, Vector3 offset, string culture, Color team, WorldActorAnimation actor = null)
        {
            var beast = new GameObject("Mythic · " + culture).transform; beast.SetParent(root, false); beast.localPosition = offset;
            var bodyRoot = Pivot(beast, "Creature torso", Vector3.zero);
            var rig = new WorldActorAnimation.Rig { root = beast, body = bodyRoot, bodyRest = Vector3.zero };
            if (actor != null) actor.rigs.Add(rig);
            bool quadruped = culture == "egyptian" || culture == "chinese";
            Color body = culture == "norse" ? new Color(0.52f, 0.73f, 0.79f) : culture == "chinese" ? new Color(0.26f, 0.59f, 0.49f) : culture == "japanese" ? new Color(0.28f, 0.29f, 0.37f) : new Color(0.52f, 0.35f, 0.22f);
            Ball(bodyRoot, 0, 1, 0, 0.95f, quadruped ? 0.85f : 1.5f, quadruped ? 1.65f : 0.85f, body);
            Ball(bodyRoot, 0, quadruped ? 1.55f : 2, quadruped ? 0.65f : 0, 0.7f, 0.7f, 0.7f, body);
            for (int i = -1; i <= 1; i += 2)
            {
                var hip = Pivot(beast, "Creature hip", new Vector3(i * 0.32f, 0.7f, quadruped ? 0.5f : 0));
                Box(hip, 0, -0.35f, 0, 0.25f, 0.7f, 0.28f, body);
                if (quadruped)
                {
                    rig.horseLegs.Add(hip);
                    var back = Pivot(beast, "Creature rear hip", new Vector3(i * 0.32f, 0.7f, -0.5f));
                    Box(back, 0, -0.35f, 0, 0.25f, 0.7f, 0.28f, body); rig.horseLegs.Add(back);
                }
                else if (i < 0) rig.leftLeg = hip; else rig.rightLeg = hip;
                if (culture == "chinese") { var horn = Box(bodyRoot, i * 0.42f, quadruped ? 2 : 2.4f, quadruped ? 0.65f : 0, 0.15f, 0.65f, 0.15f, bronze); horn.localRotation = Quaternion.Euler(0, 0, -i * 28); }
                if (culture == "japanese" || culture == "egyptian") { var wing = Box(bodyRoot, i * 0.75f, 1.55f, -0.15f, 1.15f, 0.14f, 0.85f, team); wing.localRotation = Quaternion.Euler(0, i * 18, i * 30); rig.wings.Add(wing); rig.wingRest.Add(wing.localRotation); }
            }
            if (culture == "norse") { rig.weapon = Pivot(bodyRoot, "Giant club shoulder", new Vector3(0.72f, 1.4f, 0)); Box(rig.weapon, 0, -0.2f, 0, 0.2f, 2, 0.2f, timber); Ball(rig.weapon, 0, 0.7f, 0, 0.7f, 0.7f, 0.7f, darkStone); }
            if (culture == "greek") MinotaurKit(bodyRoot, rig);
            if (culture == "egyptian") Box(bodyRoot, 0, 1.95f, 0.65f, 0.85f, 0.25f, 0.65f, bronze);
        }
        private void Resource(Transform root, string resource, Color color)
        {
            Pillar(root, 0, 0.07f, 0, 2.3f, 0.14f, darkStone);
            if (resource == "wood")
            {
                for (int i = 0; i < 5; i++) { var log = Pillar(root, (i % 3 - 1) * 0.5f, 0.35f + i / 3 * 0.4f, 0, 0.42f, 1.7f, timber); log.localRotation = Quaternion.Euler(90, 0, 0); }
            }
            else if (resource == "food")
            {
                for (int x = -1; x <= 1; x++) for (int z = -1; z <= 1; z++) { Pillar(root, x * 0.5f, 0.4f, z * 0.5f, 0.055f, 0.8f, bronze); Ball(root, x * 0.5f, 0.85f, z * 0.5f, 0.16f, 0.4f, 0.16f, color); }
            }
            else
            {
                for (int i = 0; i < 4; i++)
                {
                    var rock = Shape(root, resource == "aether" ? PrimitiveType.Cube : PrimitiveType.Sphere, new Vector3((i % 2 - 0.5f) * 0.8f, 0.5f + i * 0.1f, (i / 2 - 0.5f) * 0.7f), new Vector3(0.65f, resource == "aether" ? 1.3f : 0.75f, 0.65f), color);
                    rock.localRotation = Quaternion.Euler(resource == "aether" ? 15 : 0, i * 35, resource == "aether" ? 25 : 0);
                }
            }
        }
        public void Dispose() { foreach (var mesh in authoredMeshes) Object.Destroy(mesh); authoredMeshes.Clear(); equipmentMeshes.Clear(); foreach (var material in materials.Values) Object.Destroy(material); materials.Clear(); }
    }
}
