using System;
using System.Collections.Generic;
using UnityEngine;

namespace ThronesOfMyth
{
    // Original painted artwork with procedural interface frames and ornaments.
    public sealed class MythInterfaceTheme : IDisposable
    {
        public static readonly Color Gold = new Color(0.90f, 0.74f, 0.43f);
        public static readonly Color Cream = new Color(0.95f, 0.91f, 0.8f);
        public static readonly Color Muted = new Color(0.64f, 0.73f, 0.75f);
        public static readonly Color Teal = new Color(0.24f, 0.7f, 0.65f);
        public static readonly Color Red = new Color(0.88f, 0.42f, 0.32f);
        public GUISkin Skin { get; private set; }
        public GUIStyle Title, Heading, Body, Small, Eyebrow, Number, Center, Primary, Danger, Tab, Card;
        private GUIStyle panel, inset, selected, compactPrimary;
        private readonly Dictionary<GUIStyle, GUIStyle> singleLines = new Dictionary<GUIStyle, GUIStyle>();
        private Texture2D disk;
        private readonly MythArtwork artwork = new MythArtwork();
        public bool ReducedMotion;
        public void Backdrop(Rect rect, float opacity = 1, bool marching = false) => artwork.Backdrop(rect, opacity, marching);
        public void PortraitCard(Rect rect, string id, Color rarity)
        {
            Fill(rect, rarity);
            var inner = new Rect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8);
            if (!artwork.Portrait(inner, id, false)) Portrait(inner, id, rarity);
            float length = Mathf.Min(22, rect.width * 0.15f);
            foreach (var corner in new[] { new Vector2(rect.x, rect.y), new Vector2(rect.xMax, rect.y), new Vector2(rect.x, rect.yMax), new Vector2(rect.xMax, rect.yMax) })
            {
                float dx = corner.x == rect.x ? 1 : -1, dy = corner.y == rect.y ? 1 : -1;
                Line(corner, corner + new Vector2(dx * length, 0), 3, Cream);
                Line(corner, corner + new Vector2(0, dy * length), 3, Cream);
                float pulse = ReducedMotion ? 1 : 0.86f + 0.14f * Mathf.Sin(Time.unscaledTime * 1.8f);
                Diamond(new Rect(corner.x - 4, corner.y - 4, 8, 8), Color.Lerp(rarity, Cream, pulse * 0.25f));
            }
        }
        private readonly List<Texture2D> textures = new List<Texture2D>();
        public MythInterfaceTheme(GUISkin original)
        {
            Skin = UnityEngine.Object.Instantiate(original);
            var normal = Rounded(new Color(0.12f, 0.23f, 0.29f), new Color(0.3f, 0.37f, 0.36f));
            var hover = Rounded(new Color(0.15f, 0.25f, 0.27f), Gold);
            var active = Rounded(new Color(0.27f, 0.29f, 0.21f), Gold);
            Skin.button = new GUIStyle(original.button) { fontSize = 15, fixedHeight = 0, padding = new RectOffset(12, 12, 9, 9), margin = new RectOffset(2, 2, 4, 4), border = new RectOffset(10, 10, 10, 10), wordWrap = false };
            Set(Skin.button.normal, normal, Cream); Set(Skin.button.hover, hover, Color.white); Set(Skin.button.active, active, Color.white);
            Set(Skin.button.onNormal, active, Cream); Set(Skin.button.onHover, hover, Color.white); Set(Skin.button.onActive, active, Cream);
            Skin.label = new GUIStyle(original.label) { fontSize = 15, wordWrap = true, padding = new RectOffset(0, 0, 3, 3) };
            Skin.label.normal.textColor = Cream;
            Skin.box = BoxStyle(Rounded(new Color(0.075f, 0.15f, 0.21f, 0.98f), new Color(0.33f, 0.34f, 0.27f)));
            Skin.textField = new GUIStyle(original.textField) { fontSize = 17, padding = new RectOffset(12, 12, 10, 10), border = new RectOffset(10, 10, 10, 10) };
            Set(Skin.textField.normal, normal, Cream); Set(Skin.textField.focused, hover, Color.white);
            Skin.settings.cursorColor = Cream;
            Skin.toggle = new GUIStyle(original.toggle) { fontSize = 15, wordWrap = true, padding = new RectOffset(22, 2, 4, 4) }; Skin.toggle.normal.textColor = Cream;
            Skin.toggle.onNormal.textColor = Gold; Skin.toggle.hover.textColor = Color.white; Skin.toggle.onHover.textColor = Gold;
            Skin.verticalScrollbar.fixedWidth = 10; Skin.verticalScrollbarThumb.normal.background = Rounded(Gold, Gold);
            Skin.horizontalScrollbar.fixedHeight = 10;
            panel = Skin.box;
            inset = BoxStyle(Rounded(new Color(0.035f, 0.07f, 0.09f, 0.95f), new Color(0.17f, 0.25f, 0.27f)));
            selected = BoxStyle(Rounded(new Color(0.13f, 0.22f, 0.23f, 0.98f), Gold));
            Title = Label(27, Cream, FontStyle.Bold); Heading = Label(19, Cream, FontStyle.Bold);
            Body = Label(15, Cream); Small = Label(13, Muted); Eyebrow = Label(12, Gold, FontStyle.Bold);
            Number = Label(20, Cream, FontStyle.Bold); Center = Label(15, Cream, FontStyle.Bold); Center.alignment = TextAnchor.MiddleCenter;
            Primary = new GUIStyle(Skin.button) { fontStyle = FontStyle.Bold, fontSize = 16, padding = new RectOffset(10, 10, 5, 5) };
            Set(Primary.normal, Rounded(new Color(0.13f, 0.39f, 0.52f), new Color(0.95f, 0.8f, 0.43f)), new Color(1, 0.97f, 0.85f));
            Set(Primary.hover, Rounded(new Color(0.20f, 0.49f, 0.61f), Cream), Color.white);
            compactPrimary = new GUIStyle(Primary) { fontSize = 12, padding = new RectOffset(5, 5, 3, 3) };
            Danger = new GUIStyle(Primary); Set(Danger.normal, Rounded(new Color(0.46f, 0.19f, 0.16f), Red), Cream);
            Tab = new GUIStyle(Skin.button) { fontSize = 12, padding = new RectOffset(3, 3, 4, 4) };
            Card = new GUIStyle(Skin.button) { alignment = TextAnchor.MiddleLeft, padding = new RectOffset(14, 14, 12, 12) };
            disk = new Texture2D(64, 64, TextureFormat.RGBA32, false) { name = "Myth UI medallion", hideFlags = HideFlags.HideAndDontSave };
            var pixels = new Color[64 * 64];
            for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) pixels[y * 64 + x] = new Color(1, 1, 1, Mathf.Clamp01(31.5f - Vector2.Distance(new Vector2(x, y), new Vector2(31.5f, 31.5f))));
            disk.SetPixels(pixels); disk.Apply(); textures.Add(disk);
        }
        private GUIStyle Label(int size, Color color, FontStyle font = FontStyle.Normal)
        {
            var style = new GUIStyle(Skin.label) { fontSize = size, fontStyle = font }; style.normal.textColor = color; return style;
        }
        private static void Set(GUIStyleState state, Texture2D background, Color color) { state.background = background; state.textColor = color; }
        private static GUIStyle BoxStyle(Texture2D texture) => new GUIStyle { normal = { background = texture }, border = new RectOffset(11, 11, 11, 11), padding = new RectOffset(14, 14, 12, 12) };
        private Texture2D Rounded(Color fill, Color border)
        {
            var tex = new Texture2D(48, 48, TextureFormat.RGBA32, false) { name = "Myth UI panel", hideFlags = HideFlags.HideAndDontSave, wrapMode = TextureWrapMode.Clamp };
            var colors = new Color[48 * 48];
            for (int y = 0; y < 48; y++) for (int x = 0; x < 48; x++)
            {
                float dx = Mathf.Max(8 - x, x - 39), dy = Mathf.Max(8 - y, y - 39);
                float edge = 8 - Mathf.Sqrt(Mathf.Max(0, dx) * Mathf.Max(0, dx) + Mathf.Max(0, dy) * Mathf.Max(0, dy));
                float alpha = Mathf.Clamp01(edge + 0.5f);
                float grain = Mathf.PerlinNoise(x * 0.6f, y * 0.6f) * 0.025f;
                var shade = Color.Lerp(fill * 0.78f, fill * 1.12f, y / 47f) + new Color(grain, grain, grain, 0); shade.a = fill.a;
                if (y > 43) shade = Color.Lerp(shade, border, 0.16f);
                if (y < 3) shade *= 0.72f;
                bool line = x == 0 || y == 0 || x == 47 || y == 47 || edge < 1.5f;
                var color = line ? border : shade; color.a *= alpha; colors[y * 48 + x] = color;
            }
            tex.SetPixels(colors); tex.Apply(); textures.Add(tex); return tex;
        }
        public void Panel(Rect rect, bool chosen = false, bool recessed = false)
        {
            Fill(new Rect(rect.x + 2, rect.y + 3, rect.width, rect.height), new Color(0.02f,0.04f,0.06f,0.22f));
            GUI.Box(rect, GUIContent.none, chosen ? selected : recessed ? inset : panel);
            if (!recessed && rect.width >= 180 && rect.height >= 100)
            {
                var trim = new Color(Gold.r,Gold.g,Gold.b,0.42f);
                Line(new Vector2(rect.x+14,rect.y+5),new Vector2(rect.xMax-14,rect.y+5),1,trim);
                Diamond(new Rect(rect.x+5,rect.y+3,5,5),trim); Diamond(new Rect(rect.xMax-10,rect.y+3,5,5),trim);
            }
        }
        public void Text(Rect rect, string text, GUIStyle style = null) => GUI.Label(rect, text, style ?? Body);
        public void OneLine(Rect rect, string text, GUIStyle style = null)
        {
            style = style ?? Body;
            if (!singleLines.TryGetValue(style, out var line))
            {
                line = new GUIStyle(style) { wordWrap = false, clipping = TextClipping.Clip, alignment = TextAnchor.MiddleLeft, padding = new RectOffset(0, 0, 0, 0) };
                singleLines[style] = line;
            }
            line.alignment = style.alignment == TextAnchor.MiddleCenter ? TextAnchor.MiddleCenter : TextAnchor.MiddleLeft;
            line.normal.textColor=style.normal.textColor;
            string shown = text ?? "";
            if (line.CalcSize(new GUIContent(shown)).x > rect.width)
            {
                while (shown.Length > 0 && line.CalcSize(new GUIContent(shown + "…")).x > rect.width) shown = shown.Substring(0, shown.Length - 1);
                shown += "…";
            }
            GUI.Label(rect, new GUIContent(shown, shown == text ? "" : text), line);
        }
        public void WorldMarker(Rect rect,string text,string icon,Color accent,bool chosen,GUIStyle textStyle,float scale)
        {
            // Quiet map plates use the same palette/icons as the HUD, without panel trim.
            Fill(new Rect(rect.x+1,rect.y+2,rect.width,rect.height),new Color(.015f,.03f,.04f,.24f));
            Fill(rect,chosen?new Color(.09f,.16f,.18f,.97f):new Color(.025f,.055f,.065f,.83f));
            Fill(new Rect(rect.x,rect.y,chosen?3*scale:2*scale,rect.height),accent);
            Icon(new Rect(rect.x+7*scale,rect.center.y-8*scale,16*scale,16*scale),icon,accent);
            var previous=textStyle.normal.textColor;textStyle.normal.textColor=chosen?Cream:Muted;
            OneLine(new Rect(rect.x+29*scale,rect.y,rect.width-35*scale,rect.height),text,textStyle);textStyle.normal.textColor=previous;
        }
        public void WorldStatus(Rect rect,string tooltip,Color accent,float scale)
        {
            Circle(rect,new Color(.025f,.06f,.07f));
            Circle(new Rect(rect.x+3*scale,rect.y+3*scale,rect.width-6*scale,rect.height-6*scale),accent);
            GUI.Label(rect,new GUIContent("",tooltip),GUIStyle.none);
        }
        public bool Button(Rect rect, string text, bool primary = false, bool enabled = true)
        {
            bool wasEnabled = GUI.enabled; GUI.enabled = wasEnabled && enabled;
            bool result = GUI.Button(rect, text, primary ? rect.height <= 36 ? compactPrimary : Primary : rect.height <= 36 ? Tab : Skin.button); GUI.enabled = wasEnabled; return result;
        }
        public static void Fill(Rect rect, Color color)
        {
            var previous = GUI.color; GUI.color = color; GUI.DrawTexture(rect, Texture2D.whiteTexture); GUI.color = previous;
        }
        public static void Line(Vector2 start, Vector2 end, float width, Color color)
        {
            var matrix = GUI.matrix; var colorBefore = GUI.color;
            // Compose in local GUI coordinates. RotateAroundPivot can displace geometry
            // when the parent GUI matrix already contains resolution scaling.
            GUI.matrix = matrix * Matrix4x4.TRS(new Vector3(start.x, start.y, 0), Quaternion.Euler(0, 0, Mathf.Atan2(end.y - start.y, end.x - start.x) * Mathf.Rad2Deg), Vector3.one);
            GUI.color = color; GUI.DrawTexture(new Rect(0, -width / 2, Vector2.Distance(start, end), width), Texture2D.whiteTexture);
            GUI.matrix = matrix; GUI.color = colorBefore;
        }
        public void Circle(Rect rect, Color color)
        {
            var old = GUI.color; GUI.color = color; GUI.DrawTexture(rect, disk); GUI.color = old;
        }
        public void Diamond(Rect rect, Color color)
        {
            var old = GUI.matrix;
            GUI.matrix = old * Matrix4x4.TRS(new Vector3(rect.center.x, rect.center.y, 0), Quaternion.Euler(0, 0, 45), Vector3.one);
            Fill(new Rect(-rect.width * 0.3f, -rect.height * 0.3f, rect.width * 0.6f, rect.height * 0.6f), color); GUI.matrix = old;
        }
        public void Bar(Rect rect, float value, Color color)
        {
            // Thin bars must not inherit a panel's eleven-pixel border and shadow.
            Fill(rect, new Color(0.025f, 0.055f, 0.07f, .95f));
            float inset = rect.height < 6 ? 0 : 1;
            Fill(new Rect(rect.x + inset, rect.y + inset, Mathf.Max(0, rect.width - inset * 2) * Mathf.Clamp01(value), Mathf.Max(1, rect.height - inset * 2)), color);
        }
        public void Icon(Rect r, string id, Color color)
        {
            var c = r.center; float u = r.width / 24;
            switch (id)
            {
                case "camp":
                    Line(new Vector2(r.x+4*u,r.y+3*u),new Vector2(r.xMax-3*u,r.yMax-3*u),2*u,color);
                    Line(new Vector2(r.xMax-4*u,r.y+3*u),new Vector2(r.x+3*u,r.yMax-3*u),2*u,color);
                    Diamond(new Rect(r.x+1*u,r.y,6*u,7*u),color);Diamond(new Rect(r.xMax-7*u,r.y,6*u,7*u),color);break;
                case "infantry":
                    Line(new Vector2(r.x + 3 * u, r.y + 4 * u), new Vector2(r.xMax - 3 * u, r.y + 4 * u), 2 * u, color);
                    Line(new Vector2(r.x + 3 * u, r.y + 4 * u), new Vector2(r.x + 5 * u, r.y + 17 * u), 2 * u, color);
                    Line(new Vector2(r.xMax - 3 * u, r.y + 4 * u), new Vector2(r.xMax - 5 * u, r.y + 17 * u), 2 * u, color);
                    Line(new Vector2(r.x + 5 * u, r.y + 17 * u), new Vector2(c.x, r.yMax), 2 * u, color);
                    Line(new Vector2(r.xMax - 5 * u, r.y + 17 * u), new Vector2(c.x, r.yMax), 2 * u, color); break;
                case "archers":
                    Line(new Vector2(r.x + 5 * u, r.y + 2 * u), new Vector2(r.xMax - 3 * u, c.y), 2 * u, color);
                    Line(new Vector2(r.xMax - 3 * u, c.y), new Vector2(r.x + 5 * u, r.yMax - 2 * u), 2 * u, color);
                    Line(new Vector2(r.x + 5 * u, r.y + 2 * u), new Vector2(r.x + 5 * u, r.yMax - 2 * u), u, color);
                    Line(new Vector2(r.x, c.y), new Vector2(r.xMax, c.y), 2 * u, color); break;
                case "cavalry":
                    Line(new Vector2(r.x + 4 * u, r.yMax), new Vector2(r.x + 8 * u, r.y + 4 * u), 5 * u, color);
                    Line(new Vector2(r.x + 8 * u, r.y + 4 * u), new Vector2(r.xMax - 2 * u, r.y + 11 * u), 6 * u, color);
                    Diamond(new Rect(r.x + 5 * u, r.y, 8 * u, 9 * u), color); break;
                case "food":
                    Line(new Vector2(c.x, r.yMax), new Vector2(c.x, r.y + 3 * u), 2 * u, color);
                    for (int i = 0; i < 3; i++) { Circle(new Rect(c.x - 7 * u, r.y + (5 + i * 5) * u, 6 * u, 4 * u), color); Circle(new Rect(c.x + u, r.y + (3 + i * 5) * u, 6 * u, 4 * u), color); } break;
                case "wood": case "lumber":
                    Fill(new Rect(c.x - 2 * u, c.y, 4 * u, 10 * u), color); Diamond(new Rect(r.x + 2 * u, r.y, 20 * u, 17 * u), color); break;
                case "stone": case "quarry": Diamond(new Rect(r.x, r.y + 3 * u, 15 * u, 19 * u), color); Diamond(new Rect(r.x + 10 * u, r.y + 9 * u, 14 * u, 14 * u), color); break;
                case "gold": case "mint": for (int i = 0; i < 3; i++) { Circle(new Rect(r.x + (i % 2) * 7 * u, r.y + (2 + i * 5) * u, 15 * u, 8 * u), color); } break;
                case "aether": case "well": case "sigil": Diamond(new Rect(r.x + 3 * u, r.y, 18 * u, 24 * u), color); break;
                case "temple": case "oracle": case "academy": case "city": case "citadel":
                    Line(new Vector2(r.x, r.y + 7 * u), new Vector2(c.x, r.y + u), 3 * u, color); Line(new Vector2(c.x, r.y + u), new Vector2(r.xMax, r.y + 7 * u), 3 * u, color);
                    for (int i = 0; i < 3; i++) Fill(new Rect(r.x + (3 + i * 8) * u, r.y + 10 * u, 3 * u, 10 * u), color);
                    Fill(new Rect(r.x, r.y + 21 * u, 24 * u, 3 * u), color); break;
                case "alliance": case "oathhall":
                    Line(new Vector2(r.x + 4 * u, r.yMax), new Vector2(r.x + 4 * u, r.y), 2 * u, color); Fill(new Rect(r.x + 6 * u, r.y + u, 16 * u, 11 * u), color); break;
                case "forge": case "builders":
                    Line(new Vector2(r.x + 5 * u, r.yMax - u), new Vector2(r.x + 18 * u, r.y + 4 * u), 4 * u, color); Fill(new Rect(r.x + 9 * u, r.y + u, 14 * u, 7 * u), color); break;
                case "research": case "chronicle":
                    Fill(new Rect(r.x + 3 * u, r.y + 2 * u, 18 * u, 20 * u), color);
                    for (int i = 0; i < 3; i++) Fill(new Rect(r.x + 7 * u, r.y + (7 + i * 5) * u, 10 * u, u), new Color(0.15f, 0.22f, 0.23f)); break;
                case "heroes": case "army": case "barracks":
                    Circle(new Rect(c.x - 5 * u, r.y + u, 10 * u, 10 * u), color); Fill(new Rect(c.x - 8 * u, r.y + 12 * u, 16 * u, 10 * u), color); break;
                case "inventory":
                    Fill(new Rect(r.x+4*u,r.y+8*u,16*u,14*u),color);
                    Line(new Vector2(r.x+7*u,r.y+8*u),new Vector2(r.x+7*u,r.y+3*u),2*u,color);
                    Line(new Vector2(r.x+17*u,r.y+8*u),new Vector2(r.x+17*u,r.y+3*u),2*u,color);
                    Line(new Vector2(r.x+7*u,r.y+3*u),new Vector2(r.x+17*u,r.y+3*u),2*u,color); break;
                case "lock":
                    Circle(new Rect(c.x - 7 * u, r.y + u, 14 * u, 15 * u), color); Circle(new Rect(c.x - 4 * u, r.y + 4 * u, 8 * u, 9 * u), new Color(0.07f, 0.12f, 0.15f)); Fill(new Rect(r.x + 3 * u, r.y + 12 * u, 18 * u, 11 * u), color); break;
                default: Diamond(r, color); break;
            }
        }
        public void Portrait(Rect rect, string id, Color rarity)
        {
            Circle(rect, rarity);
            var inner = new Rect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6); Circle(inner, new Color(0.1f, 0.18f, 0.22f));
            if (artwork.Portrait(inner, id, true))
            {
                Diamond(new Rect(rect.center.x - 4, rect.yMax - 4, 8, 8), rarity);
                return;
            }
            float unit = inner.width / 100;
            var skin = id == "rune-seer" ? new Color(0.72f, 0.77f, 0.79f) : new Color(0.76f, 0.6f, 0.43f);
            Circle(new Rect(inner.x + 20 * unit, inner.y + 53 * unit, 60 * unit, 43 * unit), Color.Lerp(rarity, new Color(0.1f, 0.22f, 0.24f), 0.6f));
            Circle(new Rect(inner.x + 31 * unit, inner.y + 15 * unit, 38 * unit, 46 * unit), skin);
            Fill(new Rect(inner.x + 29 * unit, inner.y + 15 * unit, 42 * unit, 14 * unit), rarity * 0.8f);
            Fill(new Rect(inner.x + 36 * unit, inner.y + 34 * unit, 7 * unit, 3 * unit), new Color(0.08f, 0.12f, 0.14f));
            Fill(new Rect(inner.x + 57 * unit, inner.y + 34 * unit, 7 * unit, 3 * unit), new Color(0.08f, 0.12f, 0.14f));
            Line(new Vector2(inner.x + 15 * unit, inner.y + 87 * unit), new Vector2(inner.x + 85 * unit, inner.y + 9 * unit), 4 * unit, Gold);
        }
        public void Dispose()
        {
            artwork.Dispose();
            foreach (var texture in textures) UnityEngine.Object.Destroy(texture);
            UnityEngine.Object.Destroy(Skin);
        }
    }
}
