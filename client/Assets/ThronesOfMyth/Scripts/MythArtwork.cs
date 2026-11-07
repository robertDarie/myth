using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    // Original painted atlas; cell order is independent of the server roster order.
    public sealed class MythArtwork : IDisposable
    {
        private Texture2D atlas;
        private Texture2D sanctuary, march;
        private readonly Dictionary<string, Texture2D> medallions = new Dictionary<string, Texture2D>();
        private static readonly string[] cells = { "captain", "warden", "scout", "rune-seer", "atalanta", "mulan", "tomoe", "horus-champion", "heracles", "sigurd", "wukong" };
        private Color32[] source;
        private bool UV(string id, out Rect rect)
        {
            if (atlas == null) atlas = Resources.Load<Texture2D>("Art/CommanderAtlas");
            int index = Array.IndexOf(cells, id);
            rect = index < 0 ? Rect.zero : new Rect(index % 3 / 3f + 0.002f, 1 - (index / 3 + 1) / 4f + 0.002f, 1 / 3f - 0.004f, 0.25f - 0.004f);
            return index >= 0 && atlas != null;
        }
        public bool Portrait(Rect rect, string id, bool circular)
        {
            if (!UV(id, out var uv)) return false;
            if (!circular)
            {
                float aspect = (uv.width * atlas.width) / (uv.height * atlas.height);
                float target = rect.width / rect.height;
                if (target < aspect) { float width = uv.width * target / aspect; uv.x += (uv.width - width) / 2; uv.width = width; }
                else { float height = uv.height * aspect / target; uv.y += (uv.height - height) / 2; uv.height = height; }
                GUI.DrawTextureWithTexCoords(rect, atlas, uv); return true;
            }
            if (!medallions.TryGetValue(id, out var texture))
            {
                if (!atlas.isReadable) return false; // Import setup repairs readability in the Editor.
                if (source == null) source = atlas.GetPixels32();
                const int size = 192;
                texture = new Texture2D(size, size, TextureFormat.RGBA32, false) { name = id + " portrait medallion", hideFlags = HideFlags.HideAndDontSave, wrapMode = TextureWrapMode.Clamp };
                var pixels = new Color32[size * size];
                for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
                {
                    int sx = Mathf.Clamp((int)((uv.x + uv.width * x / (size - 1)) * atlas.width), 0, atlas.width - 1);
                    int sy = Mathf.Clamp((int)((uv.y + uv.height * y / (size - 1)) * atlas.height), 0, atlas.height - 1);
                    var pixel = source[sy * atlas.width + sx];
                    pixel.a = (byte)(255 * Mathf.Clamp01((0.5f - Vector2.Distance(new Vector2(x / (size - 1f), y / (size - 1f)), Vector2.one * 0.5f)) * size));
                    pixels[y * size + x] = pixel;
                }
                texture.SetPixels32(pixels); texture.Apply(false, true); medallions.Add(id, texture);
            }
            GUI.DrawTexture(rect, texture); return true;
        }
        public void Backdrop(Rect rect, float opacity = 1, bool marching = false)
        {
            if (sanctuary == null) sanctuary = Resources.Load<Texture2D>("Art/SanctuaryDawn");
            if (marching && march == null) march = Resources.Load<Texture2D>("Art/LoadingMarch");
            var artwork = marching && march != null ? march : sanctuary;
            if (artwork == null) return;
            var color = GUI.color; GUI.color = new Color(1, 1, 1, opacity);
            GUI.DrawTexture(rect, artwork, ScaleMode.ScaleAndCrop); GUI.color = color;
        }
        public void Dispose() { foreach (var texture in medallions.Values) UnityEngine.Object.Destroy(texture); medallions.Clear(); source = null; }
    }
}
