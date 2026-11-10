using System.Collections.Generic;
using System.Globalization;
namespace ThronesOfMyth
{
    public static class ScoutInterfaceCopy
    {
        static string Num(float value, string format) => value.ToString(format, CultureInfo.InvariantCulture);
        public static string Phase(string phase) => phase == "Outbound" ? "Traveling" : string.IsNullOrEmpty(phase) ? "Idle" : phase;
        public static string Line(int scouts, float speed, float radius, float surveySeconds, int autoSectors)
        {
            string noun = scouts == 1 ? "scout" : "scouts";
            return scouts + " " + noun + " · speed " + Num(speed, "0.0") + " · reveal " + Num(radius, "0") + " · survey " + Num(surveySeconds, "0.00") + "s · auto range " + autoSectors;
        }
        public static string Delta(ScoutCampCard camp)
        {
            if (camp == null || !camp.hasNext) return "The Outlook of the Horizon is fully raised.";
            var parts = new List<string>();
            if (camp.nextScouts > camp.scouts) parts.Add("+" + (camp.nextScouts - camp.scouts) + " scout slot");
            if (camp.nextSpeed > camp.speed) parts.Add("faster travel");
            if (camp.nextRadius > camp.radius) parts.Add("wider reveal");
            if (camp.nextSurveySeconds < camp.surveySeconds) parts.Add("shorter survey");
            if (camp.nextAutoSectors > camp.autoSectors) parts.Add("wider auto-explore");
            return parts.Count == 0 ? "Next level keeps the same scouting profile." : string.Join(" · ", parts.ToArray());
        }
    }
}
