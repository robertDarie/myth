using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace ThronesOfMyth
{
    // Local development transport. World simulation always belongs to the server.
    public sealed class PrototypeClient : MonoBehaviour
    {
        public string serverUrl = "http://127.0.0.1:8080";
        private string playerName = "Commander";
        private string token;
        private string playerId;
        private string status = "Start the local server, then join.";
        private bool joining;
        private bool sending;
        private readonly Dictionary<string, GameObject> armies = new Dictionary<string, GameObject>();
        private GameObject enemyView;
        private Snapshot snapshot;
        private Material ownMaterial;
        private Material allyMaterial;
        private Material enemyMaterial;

        [Serializable] private sealed class JoinRequest { public string name; }
        [Serializable] private sealed class JoinResponse { public string token; public string playerId; }
        [Serializable] private sealed class ErrorResponse { public string error; }
        [Serializable] private sealed class Command { public string type; public float x; public float z; public string targetId; }
        [Serializable] private sealed class Army
        {
            public string id; public string name; public float x; public float z;
            public int health; public int maxHealth; public int gold;
        }
        [Serializable] private sealed class Snapshot { public float size; public Army[] players; public Army enemy; }

        private void Awake()
        {
            ownMaterial = MakeMaterial(new Color(0.2f, 0.65f, 1f));
            allyMaterial = MakeMaterial(new Color(0.9f, 0.75f, 0.2f));
            enemyMaterial = MakeMaterial(new Color(0.8f, 0.2f, 0.15f));
        }

        private static Material MakeMaterial(Color color)
        {
            var material = new Material(Shader.Find("Standard"));
            material.color = color;
            return material;
        }

        private void OnGUI()
        {
            GUILayout.BeginArea(new Rect(12, 12, 370, 270), GUI.skin.box);
            GUILayout.Label("THRONES OF MYTH — Development Prototype");
            if (string.IsNullOrEmpty(token))
            {
                GUILayout.Label("Server URL");
                serverUrl = GUILayout.TextField(serverUrl, 160);
                playerName = GUILayout.TextField(playerName, 24);
                GUI.enabled = !joining;
                if (GUILayout.Button("Join world")) StartCoroutine(Join());
                GUI.enabled = true;
            }
            else
            {
                GUILayout.Label("Click ground to move. Click the red enemy to attack.");
                if (snapshot != null)
                {
                    foreach (var player in snapshot.players)
                        if (player.id == playerId)
                            GUILayout.Label($"{player.name} | Health {player.health}/{player.maxHealth} | Gold {player.gold}");
                    GUILayout.Label($"Forsaken health: {snapshot.enemy.health}/{snapshot.enemy.maxHealth}");
                }
                GUI.enabled = !sending;
                if (GUILayout.Button("Attack Forsaken")) Send(new Command { type = "attack", targetId = "forsaken-1" });
                GUI.enabled = true;
            }
            GUILayout.Label(status);
            GUILayout.EndArea();
        }

        private void Update()
        {
            if (string.IsNullOrEmpty(token) || !Input.GetMouseButtonDown(0)) return;
            // IMGUI's panel occupies the top-left corner.
            if (Input.mousePosition.x < 390 && Input.mousePosition.y > Screen.height - 295) return;
            if (Camera.main == null) return;
            if (Physics.Raycast(Camera.main.ScreenPointToRay(Input.mousePosition), out var hit, 300f))
            {
                if (enemyView != null && hit.collider.gameObject == enemyView)
                    Send(new Command { type = "attack", targetId = "forsaken-1" });
                else if (hit.collider.gameObject.name == "Ground")
                    Send(new Command { type = "move", x = hit.point.x, z = hit.point.z });
            }
        }

        private IEnumerator Join()
        {
            joining = true;
            using (var request = Request("/join", "POST", JsonUtility.ToJson(new JoinRequest { name = playerName })))
            {
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success)
                {
                    var session = JsonUtility.FromJson<JoinResponse>(request.downloadHandler.text);
                    token = session.token;
                    playerId = session.playerId;
                    status = "Connected. Blue is your army; gold armies are other players.";
                    StartCoroutine(Poll());
                }
                else status = DescribeError(request);
            }
            joining = false;
        }

        private IEnumerator Poll()
        {
            while (!string.IsNullOrEmpty(token))
            {
                using (var request = Request("/world", "GET"))
                {
                    yield return request.SendWebRequest();
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        snapshot = JsonUtility.FromJson<Snapshot>(request.downloadHandler.text);
                        DrawSnapshot();
                        status = "Connected. Click ground to move or the red enemy to attack.";
                    }
                    else
                    {
                        status = DescribeError(request);
                        if (request.responseCode == 401) { token = null; ClearViews(); }
                    }
                }
                yield return new WaitForSecondsRealtime(0.2f);
            }
        }

        private UnityWebRequest Request(string path, string method, string body = null)
        {
            var request = new UnityWebRequest(serverUrl.TrimEnd('/') + path, method);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.timeout = 5;
            if (body != null)
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                request.SetRequestHeader("Content-Type", "application/json");
            }
            if (!string.IsNullOrEmpty(token)) request.SetRequestHeader("Authorization", "Bearer " + token);
            return request;
        }

        private static string DescribeError(UnityWebRequest request)
        {
            var body = request.downloadHandler.text;
            if (!string.IsNullOrEmpty(body) && body.TrimStart().StartsWith("{"))
            {
                var error = JsonUtility.FromJson<ErrorResponse>(body);
                if (!string.IsNullOrEmpty(error.error)) return error.error;
            }
            return request.error + " — check the server is running at the URL above.";
        }

        private void Send(Command command)
        {
            if (!sending && !string.IsNullOrEmpty(token)) StartCoroutine(SendCommand(command));
        }

        private IEnumerator SendCommand(Command command)
        {
            sending = true;
            using (var request = Request("/command", "POST", JsonUtility.ToJson(command)))
            {
                yield return request.SendWebRequest();
                status = request.result == UnityWebRequest.Result.Success ? "Command accepted." : DescribeError(request);
            }
            sending = false;
        }

        private void DrawSnapshot()
        {
            var present = new HashSet<string>();
            foreach (var player in snapshot.players)
            {
                present.Add(player.id);
                if (!armies.TryGetValue(player.id, out var view))
                {
                    view = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                    view.name = player.name;
                    view.GetComponent<Renderer>().sharedMaterial = player.id == playerId ? ownMaterial : allyMaterial;
                    armies.Add(player.id, view);
                }
                view.transform.position = new Vector3(player.x, 1, player.z);
                view.SetActive(player.health > 0);
            }
            var removed = new List<string>();
            foreach (var pair in armies)
                if (!present.Contains(pair.Key)) { Destroy(pair.Value); removed.Add(pair.Key); }
            foreach (var id in removed) armies.Remove(id);
            if (enemyView == null)
            {
                enemyView = GameObject.CreatePrimitive(PrimitiveType.Cube);
                enemyView.name = "Forsaken";
                enemyView.transform.localScale = new Vector3(1.7f, 2, 1.7f);
                enemyView.GetComponent<Renderer>().sharedMaterial = enemyMaterial;
            }
            enemyView.transform.position = new Vector3(snapshot.enemy.x, 1, snapshot.enemy.z);
            enemyView.SetActive(snapshot.enemy.health > 0);
        }

        private void ClearViews()
        {
            foreach (var view in armies.Values) Destroy(view);
            armies.Clear();
            if (enemyView != null) Destroy(enemyView);
            snapshot = null;
        }

        private void OnDestroy()
        {
            StopAllCoroutines();
            ClearViews();
            Destroy(ownMaterial);
            Destroy(allyMaterial);
            Destroy(enemyMaterial);
        }
    }
}
