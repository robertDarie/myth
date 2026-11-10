namespace ThronesOfMyth
{
    public static class ReconCopy
    {
        public const string Stale = "This reading was true at the observation. The host may have changed since.";
        public static string Depth(int depth) => depth >= 3 ? "Advanced reading: commanders, defenses and ordinary stores." : depth == 2 ? "Improved reading: troop types and quantities." : depth == 1 ? "Basic reading: city and approximate strength." : "Raise the Outlook of the Horizon to read an enemy host.";
        public static string Kind(string kind) => kind == "city" ? "Reading a city" : kind == "march" ? "Reading a march" : kind == "garrison" ? "Reading a garrison" : "Reading";
    }
}
