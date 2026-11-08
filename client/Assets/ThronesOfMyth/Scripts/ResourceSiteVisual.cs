using UnityEngine;
namespace ThronesOfMyth
{
    // Presentation of the server's remaining stock. Never predicts gathering rewards.
    public sealed class ResourceSiteVisual : MonoBehaviour
    {
        public Transform[] stock;
        public int VisibleSections { get; private set; }
        public int Remaining { get; private set; }
        public void Observe(int remaining,int capacity)
        {
            Remaining=Mathf.Max(0,remaining);
            int sections=stock==null?0:stock.Length;
            VisibleSections=capacity>0?Mathf.Clamp(Mathf.CeilToInt(Mathf.Clamp01(Remaining/(float)capacity)*sections),0,sections):Remaining>0?sections:0;
            for(int i=0;i<sections;i++)if(stock[i]!=null&&stock[i].gameObject.activeSelf!=(i<VisibleSections))stock[i].gameObject.SetActive(i<VisibleSections);
        }
    }
}
