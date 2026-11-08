using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private static readonly InterfacePage[] PrimaryPages={InterfacePage.City,InterfacePage.Marches,InterfacePage.Heroes,InterfacePage.Alliance,InterfacePage.Menu};
        private static readonly string[] PrimaryTitles={"City","Marches","Commanders","Alliance","Menu"};
        private static readonly string[] PrimaryIcons={"city","army","heroes","alliance","chronicle"};
        private Vector2 menuScroll;
        private float pageOpenedAt,orderNoticeAt=-100;
        private bool lastOrderFailed;
        private void Navigate(InterfacePage page)
        {
            if(page==InterfacePage.Formation){PrepareCityMarch();return;}
            OpenInterface(page);
        }
        private void DrawMenuWindow(Rect area)
        {
            float column=(area.width-32)/3;
            const float rowHeight=46;
            int maxRows=0;
            for(int group=0;group<3;group++){int count=0;foreach(var entry in GameNavigation.Entries)if(entry.Group==group)count++;maxRows=Mathf.Max(maxRows,count);}
            menuScroll=GUI.BeginScrollView(area,menuScroll,new Rect(0,0,area.width-18,48+maxRows*rowHeight));
            for(int group=0;group<3;group++)
            {
                float x=group*(column+8);theme.OneLine(new Rect(x+8,4,column-16,28),GameNavigation.Groups[group],theme.Eyebrow);
                int row=0;foreach(var entry in GameNavigation.Entries)
                {
                    if(entry.Group!=group)continue;
                    if(theme.NavigationButton(new Rect(x,40+row++*rowHeight,column-8,40),entry.Title,entry.Icon,false,entry.Hint))Navigate(entry.Page);
                }
            }
            GUI.EndScrollView();
        }
    }
}
