using System;
namespace ThronesOfMyth
{
    public readonly struct HallFrame
    {
        public readonly float X, Y, W, H;
        public HallFrame(float x, float y, float w, float h) { X = x; Y = y; W = w; H = h; }
        public float Right => X + W;
        public float Bottom => Y + H;
    }
    public static class CommanderHallLayout
    {
        public static void Place(float width, float height, out HallFrame roster, out HallFrame stage, out HallFrame card, out HallFrame figure)
        {
            float rail = width < 1100f ? 72f : 88f;
            float cardWidth = Math.Min(440f, Math.Max(320f, width * 0.34f));
            roster = new HallFrame(0, 0, rail, height);
            card = new HallFrame(width - cardWidth, 0, cardWidth, height);
            stage = new HallFrame(rail + 10f, 0, Math.Max(1f, card.X - rail - 20f), height);
            float figureHeight = Math.Max(1f, height - 36f);
            float figureWidth = Math.Min(stage.W - 12f, figureHeight * 0.72f);
            figure = new HallFrame(stage.X + (stage.W - figureWidth) * 0.5f, 4f, figureWidth, figureHeight);
        }
        public static bool Separated(float width, float height)
        {
            Place(width, height, out var roster, out var stage, out var card, out var figure);
            return width > 0 && height > 0
                && roster.Right <= stage.X + 0.01f
                && stage.Right <= card.X + 0.01f
                && figure.X >= stage.X - 0.01f
                && figure.Right <= stage.Right + 0.01f
                && figure.Bottom <= stage.Bottom + 0.01f
                && figure.H >= height * 0.7f
                && card.W >= 320f
                && roster.W >= 72f;
        }
    }
}
