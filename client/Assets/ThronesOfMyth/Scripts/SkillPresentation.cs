using System;
namespace ThronesOfMyth
{
    public enum SkillShape { Physical, Shield, Healing, Projectile, Area, Charge, Buff, Debuff }
    public struct SkillPalette
    {
        public SkillShape Shape;
        public float R,G,B;
        public string Sound;
        public int Rune;
        public SkillPalette(SkillShape shape,float r,float g,float b,string sound,int rune){Shape=shape;R=r;G=g;B=b;Sound=sound;Rune=rune;}
    }
    public static class SkillPresentation
    {
        // Observed server kind wins over cosmetics. No inference of AoE hits, dashes or debuffs.
        public static SkillPalette Profile(string commander,string confirmedKind)
        {
            if(confirmedKind=="shield")return commander=="mulan"?new SkillPalette(SkillShape.Shield,.95f,.34f,.24f,"rally-release",6):commander=="warden"?new SkillPalette(SkillShape.Shield,.66f,.77f,.53f,"rally-release",4):new SkillPalette(SkillShape.Shield,1,.74f,.26f,"rally-release",8);
            if(confirmedKind=="heal")return commander=="horus-champion"?new SkillPalette(SkillShape.Healing,1,.84f,.42f,"heal-cast",10):new SkillPalette(SkillShape.Healing,.34f,.90f,.80f,"heal-cast",6);
            switch(commander)
            {
                case "scout":return new SkillPalette(SkillShape.Projectile,.49f,.78f,.36f,"volley-cast",3);
                case "atalanta":return new SkillPalette(SkillShape.Projectile,1,.78f,.40f,"volley-cast",5);
                case "tomoe":return new SkillPalette(SkillShape.Physical,.78f,.64f,1,"cleave-cast",7);
                case "sigurd":return new SkillPalette(SkillShape.Physical,1,.46f,.20f,"cleave-cast",4);
                case "wukong":return new SkillPalette(SkillShape.Physical,.74f,.88f,.32f,"cleave-cast",9);
                default:return new SkillPalette(SkillShape.Physical,1,.70f,.30f,"cleave-cast",6);
            }
        }
        public const float ArrowRelease=.20f, ArrowImpact=.48f;
        public static float ArrowProgress(float elapsed)=>Math.Max(0,Math.Min(1,(elapsed-ArrowRelease)/(ArrowImpact-ArrowRelease)));
        public static float ArrowHeight(float progress)=>4*progress*(1-progress)*.75f;
        public static float ArrowSlope(float progress)=>3*(1-2*progress);
        // Commander reaches the release pose exactly with the shared sound/shockwave cue.
        public static float CastPose(float age)
        {if(age<0||age>=.9f)return 0;return age<RallyingCryTimeline.Release?age/RallyingCryTimeline.Release:1-(age-RallyingCryTimeline.Release)/(.9f-RallyingCryTimeline.Release);}
        public static float AttackLean(float elapsed)
        {
            if(elapsed<0||elapsed>=.65f)return 0;
            if(elapsed<.20f)return -.22f*(float)Math.Sin(elapsed/.20f*Math.PI*.5);
            if(elapsed<.35f)return -.22f+1.22f*(elapsed-.20f)/.15f;
            float t=(elapsed-.35f)/.30f;return (1-t)*(1-t);
        }
        public static float Envelope(float age,SkillShape shape)
        {if(age<0||age>=1.35f)return 0;return Math.Min(1,age/.16f)*Math.Min(1,(1.35f-age)/.35f);}
        public static float Flight(float age)=>Math.Max(0,Math.Min(1,(age-.32f)/.40f));
        public static bool HasPersistentShield(SkillShape shape,int observedShield)=>shape==SkillShape.Shield&&observedShield>0;
    }
}
