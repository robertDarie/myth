using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public static class ReleaseIdentity
    {
        [Serializable] private sealed class Stamp{public string version,commit;public bool dirty;}
        private static string label;
        public static string Commit
        {
            get { var resource=Resources.Load<TextAsset>("BuildIdentity");return resource==null?"":JsonUtility.FromJson<Stamp>(resource.text)?.commit??""; }
        }
        public static string Label
        {
            get{if(label!=null)return label;var resource=Resources.Load<TextAsset>("BuildIdentity");var stamp=resource==null?null:JsonUtility.FromJson<Stamp>(resource.text);label=ReleaseVersion.Current+(stamp==null||string.IsNullOrEmpty(stamp.commit)?(Application.isEditor?" · Editor source":" · unstamped build"): " · "+stamp.commit.Substring(0,Math.Min(8,stamp.commit.Length))+(stamp.dirty?" · modified sources":""));return label;}
        }
    }
}
