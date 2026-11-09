using System;
namespace ThronesOfMyth
{
    // Presentation only: no HP, rage, shield duration or combat mutation.
    public static class RallyingCryTimeline
    {
        public const float Release=.32f, End=1.35f;
        public static float Shock(float age)=>Clamp((age-Release)/.62f);
        public static float Gather(float age)=>age<0?0:age<Release?Clamp(age/Release):0;
        public static float Shell(float age,bool confirmedShield,bool reduced)
        {if(!confirmedShield)return 0;return reduced?.18f:age<0?.18f:age<Release?0:Math.Min(.42f,.18f+.24f*(1-Clamp((age-Release)/.8f)));}
        public static bool Live(float age,bool confirmedShield)=>confirmedShield||age>=0&&age<End;
        private static float Clamp(float value)=>Math.Max(0,Math.Min(1,value));
    }
}
