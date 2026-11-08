using System.Collections.Generic;
namespace ThronesOfMyth
{
    public sealed class ReportReplayGuard
    {
        private readonly HashSet<string> seen=new HashSet<string>();
        private readonly Queue<string> order=new Queue<string>();
        private string owner;
        private float at;
        private bool initialized,continuous;
        public void Begin(string identity,float now)
        {
            continuous=initialized&&owner==identity&&now>=at&&now-at<3;
            if(!continuous){seen.Clear();order.Clear();}owner=identity;at=now;initialized=true;
        }
        public bool Observe(string id)
        {
            if(string.IsNullOrEmpty(id)||!seen.Add(id))return false;
            order.Enqueue(id);while(order.Count>256)seen.Remove(order.Dequeue());return continuous;
        }
        public void Reset(){initialized=false;seen.Clear();order.Clear();}
    }
}
