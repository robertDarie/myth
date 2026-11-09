namespace ThronesOfMyth
{
    // Fresh per-pass hit testing, scoped to the actual screen; never retain GUI.tooltip.
    public sealed class TooltipSession
    {
        private int scope=int.MinValue;
        private string candidate="";
        private float since;
        public string Observe(int page,string fresh,float now)
        {
            fresh=fresh??"";
            if(scope!=page||fresh!=candidate){scope=page;candidate=fresh;since=now;}
            return candidate.Length>0&&now-since>=.35f?candidate:"";
        }
        public void Reset(){scope=int.MinValue;candidate="";since=0;}
    }
}
