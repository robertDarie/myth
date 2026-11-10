using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class WorldView : MonoBehaviour
    {
        private sealed class Piece { public GameObject root; public Vector3 destination; public string label; public Color color; public float health = -1; public bool moving; public string kind, visualKey,compactLabel,icon; public bool owned,working,compactFormation,engaged;public float shieldFraction; public readonly HealthBarTrail healthTrace=new HealthBarTrail(); public ResourceSiteVisual resource; public WorldActorAnimation actor; public readonly ArmyPresentationState presentation=new ArmyPresentationState(); }
        private readonly Dictionary<string, Piece> pieces = new Dictionary<string, Piece>();
        private readonly WorldArtFactory art = new WorldArtFactory();
        public bool reducedMotion;
        private readonly Color blue = new Color(0.2f, 0.7f, 1f), gold = new Color(0.9f, 0.7f, 0.3f), red = new Color(0.85f, 0.3f, 0.23f);
        private Transform scenery;
        private float synchronizedAt=-100;
        private Texture2D groundTexture;
        public string selectedId,hoveredId;
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
            piece.destination = new Vector3(x, 0, z); piece.label = label; piece.color = color; piece.health = health;piece.healthTrace.Observe(health,Time.unscaledTime);
            string visualKey = kind + ":" + variant + ":" + ColorUtility.ToHtmlStringRGB(color) + ":" + Mathf.Min(3, mythic) + ":" + commanderId + ":" + (units == null ? "" : (units.Infantry > 0 ? "I" : "") + (units.Archers > 0 ? "A" : "") + (units.Cavalry > 0 ? "C" : "") + Mathf.Min(3, units.Total)+":"+Mathf.Min(3,units.veteranInfantry)+":"+Mathf.Min(3,units.veteranArchers)+":"+Mathf.Min(3,units.veteranCavalry));
            if (piece.visualKey != visualKey)
            {
                if (piece.actor != null) { piece.actor.gameObject.SetActive(false); Destroy(piece.actor.gameObject); }
                piece.actor = art.Build(piece.root.transform, kind, variant, color, mythic, units, commanderId); piece.resource=piece.actor.GetComponent<ResourceSiteVisual>(); piece.visualKey = visualKey;
            }
            if (piece.actor.fire != null) piece.actor.fire.gameObject.SetActive(health != 0);
        }
        public void Sync(WorldSnapshot world, string ownId, string allianceId)
        {
            var seen = new HashSet<string>();
            UpdateFog(world.exploration);
            if (world.exploration != null) foreach (var scout in world.exploration.scouts)
            {
                if (scout.phase == "Idle") continue;
                string eta = scout.eta > 0.05f ? " · " + Mathf.CeilToInt(scout.eta) + "s" : "";
                Put(seen, scout.id, "scout", scout.x, scout.z, scout.phase == "Exploring" ? gold : Color.cyan, "Scout · " + (scout.phase == "Outbound" ? "Traveling" : scout.phase) + eta);
            }
            foreach (var p in world.armies)
            {
                var color = p.ownerId == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : red;
                Put(seen, p.id, "army", p.x, p.z, color, p.name + " · Lv " + p.level + (p.units.Veterans>0?" · T2: "+p.units.Veterans:"") + (p.mythic > 0 ? " + Mythic " + p.mythic : ""), (float)p.health / Mathf.Max(1, p.maxHealth), p.civilization, p.mythic, p.units, p.commanderId);
                pieces[p.id].engaged=ArmyPresentationState.IsEngaged(p);pieces[p.id].shieldFraction=p.shield/(float)Mathf.Max(1,p.maxHealth);pieces[p.id].owned=p.ownerId==ownId;pieces[p.id].compactLabel=(p.ownerId==ownId?"[YOU] ":p.allianceId==allianceId&&!string.IsNullOrEmpty(allianceId)?"[ALLY] ":"[OTHER] ")+p.name;pieces[p.id].icon="army";pieces[p.id].working=ArmyPresentationState.IsGathering(p);
                pieces[p.id].actor.allowAudio = p.ownerId == ownId;
                var observation=pieces[p.id].presentation.Observe(p,Time.unscaledTime);
                if(observation.Has(ArmyCue.Retreat)){pieces[p.id].root.transform.position=pieces[p.id].destination;pieces[p.id].actor.RebaseMotion();}
                pieces[p.id].actor.Observe(p,observation);
                if(observation.Has(ArmyCue.Arrival)&&p.ownerId==ownId)GroundPulse(new Vector3(p.x,0,p.z),MythInterfaceTheme.Teal);
                if(p.ownerId==ownId&&observation.Has(ArmyCue.Victory))RecordEncounter(p.name+" · Victory","Health "+p.health+" / "+p.maxHealth+" · Commander XP "+p.xp.ToString("0")+". Check your resource totals and campaign rewards.");
                if(p.ownerId==ownId&&observation.Has(ArmyCue.Retreat))RecordEncounter(p.name+" · Retreat","Recover health at home. Healing lists any wounded units from field battles.");
            }
            foreach (var p in world.players)
            {
                if(!p.mapVisible)continue;
                var color = p.id == ownId ? blue : !string.IsNullOrEmpty(allianceId) && p.allianceId == allianceId ? new Color(0.4f, 0.85f, 0.6f) : gold;
                Put(seen, "city-" + p.id, "city", p.homeX, p.homeZ, color, p.name + " · " + p.ageName + " · City " + p.cityLevel, -1, p.civilization);
                pieces["city-"+p.id].owned=p.id==ownId;pieces["city-"+p.id].compactLabel=p.name+" · "+p.cityLevel;pieces["city-"+p.id].icon="city";
                pieces["city-" + p.id].root.transform.localScale = Vector3.one * (0.82f + 0.035f * p.cityLevel);
            }
            foreach (var boss in world.strongholds)
            {
                bool wasAlive = pieces.TryGetValue(boss.id, out var previousBoss) && previousBoss.health > 0;
                Put(seen, boss.id, "stronghold", boss.x, boss.z, boss.respawn > 0 ? Color.gray : red, boss.name + " · Tier " + boss.tier + (boss.respawn > 0 ? " · Reforms " + Mathf.CeilToInt(boss.respawn) + "s" : " · Guards " + Mathf.CeilToInt(boss.guardHealth) + "/" + Mathf.CeilToInt(boss.maxGuardHealth)), boss.health / Mathf.Max(1, boss.maxHealth), boss.tier.ToString());
                pieces[boss.id].compactLabel="Tier "+boss.tier;pieces[boss.id].icon="camp";
                if(!boss.lastKnown)pieces[boss.id].actor.ObserveCamp(new CampData { health = Mathf.CeilToInt(boss.guardHealth + boss.health) }, wasAlive && boss.respawn > 0);
            }
            foreach (var c in world.camps)
            {
                bool wasAlive = pieces.TryGetValue(c.id, out var previous) && previous.health > 0;
                Put(seen, c.id, "camp", c.x, c.z, c.health > 0 ? red : Color.gray, c.name + " · Lv " + c.level + (c.health <= 0 ? " · " + c.respawn + "s" : ""), (float)c.health / c.maxHealth, c.id);
                pieces[c.id].compactLabel=c.health>0?"Lv "+c.level:"Reforming";pieces[c.id].icon="camp";
                if(!c.lastKnown)pieces[c.id].actor.ObserveCamp(c, wasAlive && c.health <= 0);
            }
            foreach(var n in world.nodes)
            {
                Put(seen,n.id,"node",n.x,n.z,n.resource=="stone"?new Color(.62f,.65f,.7f):n.resource=="mana"?new Color(.6f,.35f,.9f):n.resource=="gold"?gold:n.resource=="wood"?new Color(.3f,.55f,.25f):new Color(.75f,.62f,.35f),n.name+" · "+n.remaining,-1,n.resource);
                var piece=pieces[n.id];piece.compactLabel=n.remaining>0?n.remaining.ToString("N0"):"Empty";piece.icon=n.resource;piece.resource?.Observe(n.remaining,n.capacity);
            }
            foreach(var army in world.armies)if(army.state=="Gathering"&&pieces.TryGetValue(army.targetId??"",out var target)&&target.resource!=null)pieces[army.id].actor.GatheringColor(target.color);
            foreach (var s in world.sites) Put(seen, s.id, "site", s.x, s.z, string.IsNullOrEmpty(s.allianceId) ? new Color(0.65f, 0.55f, 0.8f) : s.allianceId == allianceId ? blue : red, s.name + (s.locked ? " · Sealed" : "") + (s.unknown ? " · Unsurveyed" : "") + (s.progress > 0 ? " · " + Mathf.FloorToInt(s.progress / 15 * 100) + "%" : ""), s.health / Mathf.Max(1, s.maxHealth), s.kind);
            foreach (var f in world.flags)
            {
                string name = f.isRoot ? "Alliance Fort" : "Alliance Beacon";
                string state = f.buildRemaining > 0 ? " · Building " + Mathf.CeilToInt(f.buildRemaining) + "s" : f.connected ? "" : " · Disconnected";
                string variant = (f.isRoot ? "fort-" : "") + (f.connected ? "connected" : "inactive");
                Put(seen, f.id, "flag", f.x, f.z, f.connected ? (f.allianceId == allianceId ? blue : red) : Color.gray, name + state, f.health / Mathf.Max(1, f.maxHealth), variant);
            }
            foreach (var pin in world.markers) Put(seen, pin.id, "marker", pin.x, pin.z, new Color(0.85f, 0.45f, 0.8f), pin.name);
            foreach(var n in world.nodes)if(n.lastKnown)Remembered(n.id);
            foreach(var c in world.camps)if(c.lastKnown)Remembered(c.id);
            foreach(var s in world.sites)if(s.lastKnown)Remembered(s.id);
            foreach(var f in world.flags)if(f.lastKnown)Remembered(f.id);
            foreach(var b in world.strongholds)if(b.lastKnown)Remembered(b.id);
            foreach(var p in world.players)if(p.lastKnown&&p.mapVisible)Remembered("city-"+p.id);
            ObserveCompletedBattles(world,ownId);
            var removed = new List<string>();
            foreach (var pair in pieces) if (!seen.Contains(pair.Key))
            {
                if(pair.Value.owned&&pair.Value.kind=="army"&&Time.unscaledTime-synchronizedAt<3)
                {
                    var city=System.Array.Find(world.players,p=>p.id==ownId);
                    var recovered=city?.homeFormations==null?null:System.Array.Find(city.homeFormations,a=>a.id==pair.Key&&a.recovery>0);
                    if(recovered==null&&city?.homeFormations!=null&&System.Array.Exists(city.homeFormations,a=>a.id==pair.Key&&!a.deployed)){GroundPulse(new Vector3(city.homeX,0,city.homeZ),MythInterfaceTheme.Teal);RecordEncounter("March arrived home","Deployment slot released. Formation and reserves are available in your city.");BattlefieldAudio.UiCue("arrival");}
                    if(recovered!=null){GroundPulse(pair.Value.root.transform.position,MythInterfaceTheme.Red);BattlefieldFeedback.Emit("defeat",pair.Value.root.transform.position,MythInterfaceTheme.Red,reducedMotion);RecordEncounter("Forced retreat","Your march is recovering at home. Review Reports and the House of Renewal.");BattlefieldAudio.UiCue("retreat");}
                }
                Destroy(pair.Value.root);removed.Add(pair.Key);
            }
            foreach (var id in removed) pieces.Remove(id);synchronizedAt=Time.unscaledTime;
        }
        private void Remembered(string id){if(pieces.TryGetValue(id,out var piece)){piece.compactLabel="Last seen";piece.label="Last seen · "+piece.label;piece.health=-1;piece.healthTrace.Observe(-1,Time.unscaledTime);}}
        private void Update()
        {
            var camera = Camera.main;UpdateGroundCues();

            foreach (var pair in pieces)
            {
                var piece = pair.Value;
                if (piece.moving && (piece.root.transform.position - piece.destination).sqrMagnitude > 144)
                { piece.root.transform.position = piece.destination; piece.actor.RebaseMotion(); }
                piece.root.transform.position = piece.moving ? Vector3.Lerp(piece.root.transform.position, piece.destination, reducedMotion?1:1-Mathf.Exp(-18*Time.deltaTime)) : piece.destination;
                if((piece.root.transform.position-piece.destination).sqrMagnitude<.0001f)piece.root.transform.position=piece.destination;
                if(piece.actor!=null)
                {
                    piece.actor.reducedMotion=reducedMotion;piece.actor.SetSelected(pair.Key==selectedId,pair.Key==hoveredId);
                    float unitPixels=camera==null?100:1.6f*piece.root.transform.lossyScale.x*camera.pixelHeight/(2*Mathf.Max(.01f,camera.orthographicSize));
                    float scale=Mathf.Max(.8f,labelScale);
                    if(pair.Key==selectedId||pair.Key==hoveredId)piece.compactFormation=false;
                    else if(unitPixels<32*scale)piece.compactFormation=true;
                    else if(unitPixels>40*scale)piece.compactFormation=false;
                    piece.actor.SetWideView(piece.compactFormation);
                }
            }
        }
        private readonly WorldLabelLayout labelLayout=new WorldLabelLayout();
        private readonly List<string> labelOrder=new List<string>();
        private GUIStyle markerText;
        public void DrawLabels(Camera camera,MythInterfaceTheme theme)
        {
            if(camera==null||!labels)return;
            int size=Mathf.Max(12,Mathf.RoundToInt(13*labelScale));
            if(markerText==null||markerText.fontSize!=size)markerText=new GUIStyle(GUI.skin.label){alignment=TextAnchor.MiddleLeft,fontSize=size,wordWrap=false,padding=new RectOffset(),clipping=TextClipping.Clip};
            float scale=Mathf.Max(.8f,labelScale);
            labelLayout.Reset(new Rect(0,0,Screen.width,Screen.height));labelOrder.Clear();labelOrder.AddRange(pieces.Keys);
            labelOrder.Sort((a,b)=>{int priority=LabelPriority(a).CompareTo(LabelPriority(b));return priority!=0?priority:string.CompareOrdinal(a,b);});
            foreach(string id in labelOrder)
            {
                var piece=pieces[id];bool selected=id==selectedId,hovered=id==hoveredId,detailed=selected||hovered;
                piece.actor?.DrawCaption(camera,labelScale,occluded);
                var origin=piece.root.transform.position+Vector3.up*(piece.kind=="army"?2.8f:piece.kind=="node"?1.8f:3.7f);
                var screen=camera.WorldToScreenPoint(origin);
                if(screen.z<=0||screen.x<0||screen.x>Screen.width||screen.y<0||screen.y>Screen.height)continue;
                string text=detailed?piece.label:piece.compactLabel??piece.label;
                string icon=piece.icon??(piece.kind=="site"?"temple":piece.kind=="flag"?"alliance":piece.kind=="scout"?"army":"chronicle");
                float width=Mathf.Clamp(markerText.CalcSize(new GUIContent(text)).x+42*scale,58*scale,(detailed?300:160)*scale);
                float height=(detailed?30:26)*scale;
                var desired=new Rect(screen.x-width/2,Screen.height-screen.y-height/2,width,height);
                if(!labelLayout.TryPlace(desired,4*scale,occluded,out var rect))continue;
                if(detailed&&(rect.center-desired.center).sqrMagnitude>1)MythInterfaceTheme.Line(new Vector2(screen.x,Screen.height-screen.y),new Vector2(rect.center.x,rect.yMax),scale,new Color(.90f,.74f,.43f,.65f));
                theme.WorldMarker(rect,text,icon,detailed?MythInterfaceTheme.Gold:piece.color,selected,markerText,scale);
                if(piece.working)theme.WorldStatus(new Rect(rect.xMax-11*scale,rect.y-5*scale,14*scale,14*scale),"Gathering",MythInterfaceTheme.Teal,scale);
                if(piece.health>=0&&(detailed||piece.engaged||piece.health<.999f))
                {
                    var bar=new Rect(rect.x+7*scale,rect.yMax+2*scale,rect.width-14*scale,5*scale);
                    theme.HealthBar(bar,piece.health,piece.healthTrace.Value(Time.unscaledTime,reducedMotion),piece.health<.3f?MythInterfaceTheme.Red:piece.color);
                    if(piece.shieldFraction>0)theme.Bar(new Rect(bar.x,bar.yMax+scale,bar.width,2*scale),Mathf.Clamp01(piece.shieldFraction),MythInterfaceTheme.Gold);
                }
            }
        }
        private int LabelPriority(string id)
        {
            if(id==selectedId)return 0;if(id==hoveredId)return 1;
            var piece=pieces[id];if(piece.owned&&piece.kind=="army")return 2;
            return piece.kind=="city"?3:piece.kind=="army"?4:piece.kind=="site"?5:piece.kind=="camp"?6:7;
        }
        public void Clear()
        {
            foreach (var piece in pieces.Values) Destroy(piece.root); pieces.Clear();synchronizedAt=-100;fogGrid.Reset();reportGuard.Reset();ClearInteraction();
        }
        private void OnDestroy()
        {
            Clear(); DisposeFog();if(realmMesh!=null)Destroy(realmMesh); if (scenery != null) Destroy(scenery.gameObject);
            art.Dispose(); if (terrainMaterial != null) Destroy(terrainMaterial); if (groundTexture != null) Destroy(groundTexture);
        }
    }
}
