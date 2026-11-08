using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class WorldArtFactory
    {
        private bool SkinnedUnit(Transform root, string culture, string role, string heroId, Vector3 offset, Color team, WorldActorAnimation actor)
        {
            string title = string.IsNullOrEmpty(culture) ? "Greek" : char.ToUpperInvariant(culture[0]) + culture.Substring(1);
            string name = string.IsNullOrEmpty(heroId) ? title + role : "Hero_" + heroId;
            string cacheKey = "unit:" + name;
            if (!importedModels.TryGetValue(cacheKey, out var asset)) { asset = Resources.Load<GameObject>("Art/Units/" + name); importedModels[cacheKey] = asset; }
            if (asset == null) return false;
            var pivot = new GameObject(name + " formation").transform; pivot.SetParent(root, false); pivot.localPosition = offset;
            var orientation=new GameObject("FBX facing and scale").transform;orientation.SetParent(pivot,false);
            var instance = Object.Instantiate(asset, orientation, false); var animation = instance.GetComponentInChildren<Animation>();
            if(animation!=null)AuthoredUnit.Prepare(animation);
            if (animation == null || animation["Idle"] == null || animation["March"] == null)
            { Object.Destroy(pivot.gameObject); return false; }
            // FBX facing tags remove exporter-axis assumptions.
            foreach (var node in instance.GetComponentsInChildren<Transform>()) if (node.name == "FacingForward")
            {
                var direction = pivot.InverseTransformDirection(node.position - instance.transform.position); direction.y = 0;
                if (direction.sqrMagnitude > 0.01f) orientation.localRotation = Quaternion.FromToRotation(direction, Vector3.forward) * orientation.localRotation;
            }
            float scale = role == "Mythic" ? culture == "norse" ? 1.35f : culture == "greek" ? 1.15f : 1 : role == "Commander" ? 0.88f : role == "Cavalry" ? 0.72f : 0.80f;
            orientation.localScale = Vector3.one * scale;
            string paletteCulture=string.IsNullOrEmpty(heroId)?culture:heroId=="rune-seer"||heroId=="sigurd"?"norse":heroId=="mulan"||heroId=="wukong"?"chinese":heroId=="tomoe"?"japanese":heroId=="horus-champion"?"egyptian":"greek";
            foreach (var renderer in instance.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                var source = renderer.sharedMaterials; var palette = new Material[source.Length];
                for (int i = 0; i < source.Length; i++)
                {
                    string materialRole = source[i] == null ? "Armor" : source[i].name;
                    Color armor = paletteCulture == "norse" ? new Color(0.45f,0.51f,0.53f) : paletteCulture == "japanese" ? new Color(0.24f,0.27f,0.34f) : new Color(0.72f,0.52f,0.24f);
                    Color cloth=paletteCulture=="egyptian"?new Color(.13f,.57f,.58f):paletteCulture=="norse"?new Color(.29f,.43f,.36f):paletteCulture=="chinese"?new Color(.56f,.18f,.13f):paletteCulture=="japanese"?new Color(.24f,.28f,.53f):new Color(.14f,.39f,.60f);
                    Color color = materialRole.Contains("Banner") ? team : materialRole.Contains("Cloth") ? cloth : materialRole.Contains("Skin") ? new Color(0.78f,0.59f,0.40f) : materialRole.Contains("Armor") ? armor : materialRole.Contains("Steel") ? new Color(0.66f,0.72f,0.72f) : materialRole.Contains("Ivory") ? new Color(0.94f,0.87f,0.65f) : materialRole.Contains("Spirit") ? new Color(0.35f,0.70f,0.76f) : materialRole.Contains("Crest") ? new Color(0.65f,0.19f,0.14f) : materialRole.Contains("Fur") ? new Color(0.42f,0.28f,0.17f) : new Color(0.30f,0.19f,0.11f);
                    palette[i] = MaterialFor(color);
                }
                renderer.sharedMaterials = palette; renderer.updateWhenOffscreen = false;
            }
            animation.cullingType = AnimationCullingType.BasedOnRenderers; animation.Play("Idle");
            var unit = pivot.gameObject.AddComponent<AuthoredUnit>(); unit.player = animation; unit.formationRole=role; unit.commander = role == "Commander"; unit.mythic = role == "Mythic"; unit.ranged = role == "Archer" || heroId == "atalanta" || heroId == "scout" || heroId == "tomoe";
            actor.authored.Add(unit); if (role != "Commander") actor.soldiers.Add(pivot.gameObject);
            return true;
        }
        private void Formation(Transform root, string culture, Color team, UnitCounts units, string commanderId, int mythic, WorldActorAnimation actor)
        {
            int visible = Mathf.Min(6, units.Total), assigned = 0;
            foreach (var role in new[] { "Infantry", "Archer", "Cavalry" })
            {
                int count = role == "Infantry" ? units.Infantry : role == "Archer" ? units.Archers : units.Cavalry;
                if (count <= 0) continue;
                int reserved = role == "Infantry" ? (units.Archers > 0 ? 1 : 0) + (units.Cavalry > 0 ? 1 : 0) : role == "Archer" && units.Cavalry > 0 ? 1 : 0;
                int proxies = Mathf.Min(count, Mathf.Min(6 - assigned - reserved, Mathf.Clamp(Mathf.RoundToInt(visible * count / (float)Mathf.Max(1,units.Total)), 1, 3)));
                for (int i = 0; i < proxies && assigned < 6; i++, assigned++)
                {
                    float side = i % 2 == 0 ? -1 : 1;
                    var position = role == "Archer" ? new Vector3((i-0.5f)*0.85f,0,-1.35f) : role == "Cavalry" ? new Vector3(side*(1.65f+i/2*0.8f),0,-0.2f) : new Vector3((i-0.5f)*0.85f,0,0.05f);
                    if (!SkinnedUnit(root,culture,role,"",position,team,actor)) Soldier(root,position,team,culture,actor,role == "Archer" ? "archers" : role.ToLowerInvariant());
                    int veterans=role=="Infantry"?units.veteranInfantry:role=="Archer"?units.veteranArchers:units.veteranCavalry;
                    if(i<veterans&&actor.soldiers.Count>0)
                    {
                        var badge=Shape(actor.soldiers[actor.soldiers.Count-1].transform,PrimitiveType.Cube,new Vector3(0,2.1f,0),new Vector3(.15f,.15f,.06f),new Color(.95f,.75f,.28f));
                        badge.localRotation=Quaternion.Euler(0,0,45);
                    }
                }
            }
            var leader = new Vector3(0,0,1.2f);
            if (!SkinnedUnit(root,culture,"Commander",commanderId,leader,team,actor)) Commander(root,commanderId,team,actor);
            for (int i=0;i<Mathf.Min(2,mythic);i++) { var at=new Vector3(2.5f+i*1.8f,0,-1.5f); if(!SkinnedUnit(root,culture,"Mythic","",at,team,actor)) Beast(root,at,culture,team,actor); }
        }
    }
}
