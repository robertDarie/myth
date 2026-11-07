using System.Collections;
using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private bool bootLoading = true, worldReady, retryLoading;
        private string loadingStage = "Preparing the chronicles", loadingError = "";
        private int loadedArtwork;
        private Coroutine pollRoutine;
        private bool LoadingActive => bootLoading || joining || (!string.IsNullOrEmpty(token) && !worldReady) || (!worldReady && !string.IsNullOrEmpty(loadingError));
        private IEnumerator PreloadPresentation()
        {
            // Each stage represents completed work, never a simulated download percentage.
            foreach (var path in new[] { "Art/SanctuaryDawn", "Art/CommanderAtlas", "Art/LoadingMarch" })
            {
                var request = Resources.LoadAsync<Texture2D>(path);
                yield return request;
                loadedArtwork++;
            }
            bootLoading = false;
        }
        private void RenderLoadingScreen()
        {
            var screen = new Rect(0, 0, ViewWidth, ViewHeight);
            MythInterfaceTheme.Fill(screen, new Color(0.025f, 0.06f, 0.09f));
            if (!bootLoading || loadedArtwork > 0) theme.Backdrop(screen, 1, !bootLoading);
            MythInterfaceTheme.Fill(screen, new Color(0.015f, 0.035f, 0.055f, 0.55f));
            theme.Text(new Rect(80, 65, 650, 34), "THRONES OF MYTH", theme.Title);
            theme.Text(new Rect(82, 107, 620, 24), "THE AGE OF FALLEN GODS", theme.Eyebrow);
            float width = Mathf.Min(850, ViewWidth - 120);
            var panel = new Rect((ViewWidth - width) / 2, ViewHeight - 298, width, 225);
            theme.Panel(panel);
            string title = bootLoading ? "Awakening the realm" : joining ? "Opening the kingdom gates" : "Returning to your civilization";
            theme.Text(new Rect(panel.x + 26, panel.y + 18, panel.width - 52, 38), title, theme.Heading);
            bool error = !string.IsNullOrEmpty(loadingError);
            theme.Text(new Rect(panel.x + 26, panel.y + 58, panel.width - 52, 47), error ? loadingError : bootLoading ? "Preparing artwork · " + loadedArtwork + " / 3" : loadingStage, theme.Body);
            float progress = bootLoading ? loadedArtwork / 3f * 0.25f : joining ? 0.35f : loadingStage == "Preparing the kingdom map" ? 0.85f : 0.6f;
            theme.Bar(new Rect(panel.x + 26, panel.y + 115, panel.width - 52, 9), progress, error ? MythInterfaceTheme.Red : MythInterfaceTheme.Gold);
            if (error)
            {
                if (theme.Button(new Rect(panel.x + 26, panel.y + 151, 180, 42), "Retry connection", true, !joining))
                {
                    loadingError = "";
                    if (string.IsNullOrEmpty(token)) StartCoroutine(Join()); else retryLoading = true;
                }
                if (theme.Button(new Rect(panel.x + 224, panel.y + 151, 180, 42), "Back to entry", false, !joining))
                {
                    if (pollRoutine != null) { StopCoroutine(pollRoutine); pollRoutine = null; }
                    token = null; world = null; me = null; map.Clear(); loadingError = ""; worldReady = false;
                }
            }
            else
            {
                string[] tips = { "City construction and training continue while your armies explore.", "Pure cavalry marches move faster. Mixed formations travel at the pace of their slower units.", "Assemble exact troop counts at home. Unselected units stay in city reserves.", "Commander stars unlock skills. Skill levels and ascension are separate upgrades." };
                int index = reducedMotion ? 0 : Mathf.FloorToInt(Time.unscaledTime / 8) % tips.Length;
                theme.Text(new Rect(panel.x + 26, panel.y + 142, panel.width - 52, 62), "KINGDOM WISDOM\n" + tips[index], theme.Small);
            }
        }
    }
}
