namespace ThronesOfMyth
{
    public static class LandmarkCopy
    {
        public static bool ShowRemembered(bool terrainExplored) => terrainExplored;
        public static string MapLabel(bool terrainExplored, string name) => terrainExplored ? name + " · Recorded landmark" : "";
        public static string Compact(bool terrainExplored, string name) => terrainExplored ? name : "";
        public static string Inspection(bool terrainExplored) => terrainExplored
            ? "Explored ground · recorded earlier, not a live count"
            : "Concealed ground. Scout before treating any old note as current.";
    }
}
