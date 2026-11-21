using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.Networking;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private Rect KingdomSearchRect => new Rect(ViewWidth - 430, 112, 214, 268);
        private int kingdomSearchCategory;
        private Vector2 kingdomSearchScroll;
        private MarchPreview marchPreview;
        private string marchPreviewKey = "";
        private bool marchPreviewBusy;
        private int marchPreviewSerial;
        private static readonly string[] KingdomSearchNames = { "Resources", "Passes", "Sanctuaries", "Strongholds", "Alliance" };
        private readonly List<KingdomSearchHit> kingdomHits = new List<KingdomSearchHit>();
        private struct KingdomSearchHit { public string id, kind, title, detail; public float x, z; }
        private void DrawKingdomSearch()
        {
            var r = KingdomSearchRect;
            theme.Panel(r);
            if (theme.Button(new Rect(r.x + 8, r.y + 8, r.width - 16, 26), KingdomSearchNames[kingdomSearchCategory])) { kingdomSearchCategory = (kingdomSearchCategory + 1) % KingdomSearchNames.Length; kingdomSearchScroll = Vector2.zero; }
            CollectKingdomSearch();
            var list = new Rect(r.x + 8, r.y + 40, r.width - 16, 168);
            kingdomSearchScroll = GUI.BeginScrollView(list, kingdomSearchScroll, new Rect(0, 0, list.width - 18, Mathf.Max(list.height, kingdomHits.Count * 36)));
            if (kingdomHits.Count == 0) theme.Text(new Rect(0, 0, list.width - 18, 48), "Nothing in this list is on your map yet.", theme.Small);
            for (int i = 0; i < kingdomHits.Count; i++)
            {
                var hit = kingdomHits[i];
                if (GUI.Button(new Rect(0, i * 36, list.width - 18, 32), hit.title + "\n" + hit.detail, theme.Small))
                {
                    if (hit.kind == "rally") OpenWarfare(hit.id);
                    else Select(hit.id, hit.kind);
                    FocusGameplay(hit.x, hit.z);
                }
            }
            GUI.EndScrollView();
            string sentence = marchPreviewBusy ? "Checking the authorized route…" : marchPreview != null ? marchPreview.message : "Select a target, then right-click again to march.";
            theme.Text(new Rect(r.x + 8, r.y + 214, r.width - 16, 46), sentence ?? "", theme.Small);
        }
        private void CollectKingdomSearch()
        {
            kingdomHits.Clear();
            if (world == null || me == null) return;
            if (kingdomSearchCategory == 0 && world.nodes != null) foreach (var node in world.nodes) AddHit(node.id, "node", (node.lastKnown ? "Last survey · " : "") + node.name, node.resource, node.x, node.z);
            if (kingdomSearchCategory == 1 && world.passes != null) foreach (var pass in world.passes) AddHit(pass.id, "site", pass.name, pass.accessExplanation, pass.x, pass.z);
            if (kingdomSearchCategory == 2 && world.sites != null) foreach (var site in world.sites) if (!site.unknown && site.kind != "gate" && (site.kind == "sanctuary" || site.kind == "shrine")) AddHit(site.id, "site", (site.lastKnown ? "Last survey · " : "") + site.name, site.locked ? "Sealed" : site.kind, site.x, site.z);
            if (kingdomSearchCategory == 3 && world.strongholds != null) foreach (var hold in world.strongholds) AddHit(hold.id, "stronghold", (hold.lastKnown ? "Last survey · " : "") + hold.name, "Tier " + hold.tier, hold.x, hold.z);
            if (kingdomSearchCategory == 4)
            {
                if (world.markers != null) foreach (var pin in world.markers) AddHit(pin.id, "marker", pin.name, "Alliance marker", pin.x, pin.z);
                if (world.flags != null) foreach (var flag in world.flags) if (flag.allianceId == me.allianceId) AddHit(flag.id, "flag", flag.isRoot ? "Alliance Fort" : "Alliance Beacon", flag.connected ? "Connected" : "Disconnected", flag.x, flag.z);
                if (world.rallies != null) foreach (var rally in world.rallies) if (rally.allianceId == me.allianceId) AddHit(rally.id, "rally", "Rally · " + rally.phase, "Assembly", rally.meetX, rally.meetZ);
            }
        }
        private void AddHit(string id, string kind, string title, string detail, float x, float z) { if (string.IsNullOrEmpty(id) || kingdomHits.Count >= 8) return; kingdomHits.Add(new KingdomSearchHit { id = id, kind = kind, title = title, detail = detail, x = x, z = z }); }
        private void ConfirmMarkerAction(MapMarker marker)
        {
            if (processing || pendingOrder != null || commands.Count > 0) return;
            bool ownArmy = marker.kind == "army" && System.Array.Exists(world.armies, army => army.id == marker.id && army.ownerId == playerId);
            if (ownArmy || marker.kind == "city" || marker.kind == "marker") { ActOnSelection(); return; }
            string type = marker.kind == "camp" ? "attack" : marker.kind == "node" ? "gather" : marker.kind == "site" ? "capture" : "";
            if (type.Length == 0) { ActOnSelection(); return; }
            if (PreviewMatches(type, marker.id, 0, 0)) { if (MarchClick.IssuesOrder(marchPreviewBusy, marchPreview.authorized, true)) { marchPreview = null; marchPreviewKey = ""; ActOnSelection(); } else status = marchPreview.message; return; }
            if (marchPreviewBusy) { status = "Checking the authorized route…"; return; }
            QueueMarchPreview(type, marker.id, 0, 0);
        }
        private void ConfirmGroundMarch(float x, float z)
        {
            if (processing || pendingOrder != null || commands.Count > 0) return;
            if (PreviewMatches("move", "", x, z)) { if (MarchClick.IssuesOrder(marchPreviewBusy, marchPreview.authorized, true)) { marchPreview = null; marchPreviewKey = ""; Send(new GameCommand { type = "move", x = x, z = z }); } else status = marchPreview.message; return; }
            if (marchPreviewBusy) { status = "Checking the authorized route…"; return; }
            QueueMarchPreview("move", "", x, z);
        }
        private bool PreviewMatches(string type, string id, float x, float z) => !marchPreviewBusy && marchPreview != null && marchPreviewKey == PreviewKey(type, id, x, z);
        private string PreviewKey(string type, string id, float x, float z) => type + "|" + (id ?? "") + "|" + x.ToString("0.00", CultureInfo.InvariantCulture) + "|" + z.ToString("0.00", CultureInfo.InvariantCulture) + "|" + (ActiveArmy == null ? "" : ActiveArmy.id);
        private void QueueMarchPreview(string type, string id, float x, float z) { if (me == null || ActiveArmy == null || string.IsNullOrEmpty(token)) return; StartCoroutine(FetchMarchPreview(type, id, x, z)); }
        private IEnumerator FetchMarchPreview(string type, string id, float x, float z)
        {
            int serial = ++marchPreviewSerial; string key = PreviewKey(type, id, x, z); marchPreviewBusy = true; string owner = playerId, origin = serverUrl;
            string path = "/march-preview?type=" + UnityWebRequest.EscapeURL(type) + "&marchId=" + UnityWebRequest.EscapeURL(ActiveArmy.id) + "&targetId=" + UnityWebRequest.EscapeURL(id ?? "") + "&x=" + x.ToString("0.###", CultureInfo.InvariantCulture) + "&z=" + z.ToString("0.###", CultureInfo.InvariantCulture);
            using (var request = Request(path, "GET"))
            {
                yield return request.SendWebRequest();
                if (serial != marchPreviewSerial || owner != playerId || origin != serverUrl) yield break;
                if (request.result == UnityWebRequest.Result.Success) { marchPreview = JsonUtility.FromJson<MarchPreview>(request.downloadHandler.text); marchPreviewKey = key; status = marchPreview != null ? marchPreview.message : "Route preview unavailable."; }
                else { marchPreview = new MarchPreview { authorized = false, message = DescribeError(request), route = new RoutePoint[0] }; marchPreviewKey = key; status = marchPreview.message; }
            }
            if (serial == marchPreviewSerial) marchPreviewBusy = false;
        }
        private void DrawPreviewRoute()
        {
            if (marchPreview == null || !marchPreview.authorized || marchPreview.route == null || ActiveArmy == null) return;
            routeDashBudget = 160;
            var start = new Vector3(ActiveArmy.x, 0.3f, ActiveArmy.z);
            for (int index = 0; index < marchPreview.route.Length; index++)
            {
                var point = marchPreview.route[index];
                var end = new Vector3(point.x, .3f, point.z);
                DrawRouteSegment(start, end, index == marchPreview.route.Length - 1);
                start = end;
            }
        }
    }
}
