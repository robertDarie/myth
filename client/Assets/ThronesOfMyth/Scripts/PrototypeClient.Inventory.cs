using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int selectedItem,itemQuantity=1,itemCategory;
        private string speedupJobId="";
        private Vector2 itemScroll,itemDetailScroll;
        private string selectedInventoryId="";
        private bool inventoryCatalogue,shownCatalogue;
        private InventoryData shownBag;private int shownCategory=-1;private InventoryItem[] shownItems;
        private void RenderInventoryWindow(Rect r)
        {
            var bag=me.inventory;
            if(bag==null){theme.Text(r,"Update and restart the server to load your inventory.",theme.Body);return;}
            float listWidth=Mathf.Clamp(r.width*.36f,280,420);
            var list=new Rect(r.x,r.y,listWidth,r.height);var detail=new Rect(r.x+listWidth+14,r.y,r.width-listWidth-14,r.height);
            theme.Panel(list,false,true);theme.Panel(detail,false,true);
            GUILayout.BeginArea(new Rect(list.x+12,list.y+12,list.width-24,list.height-24));
            theme.Section("Stored supplies","Select a stack; items stay sealed until used.");
            if(bag.suppliesAvailable&&theme.Action("Collect founding supplies",!processing&&pendingOrder==null,"Confirm the pending order first."))Send("inventory-supplies");
            inventoryCatalogue=GUILayout.Toggle(inventoryCatalogue,"Show unowned items");
            itemCategory=theme.Tabs(itemCategory,new[]{"All","Resources","Speedups","Summons","Energy","Combat buffs"},list.width-24);
            var categories=new[]{"","Resources","Speedups","Summons","Energy","Combat buffs"};
            if(!ReferenceEquals(shownBag,bag)||shownCategory!=itemCategory||shownCatalogue!=inventoryCatalogue){shownBag=bag;shownCategory=itemCategory;shownCatalogue=inventoryCatalogue;shownItems=Array.FindAll(bag.items??Array.Empty<InventoryItem>(),i=>InterfaceLayout.ShowItem(i,categories[itemCategory],inventoryCatalogue));}
            var filtered=shownItems;
            itemScroll=GUILayout.BeginScrollView(itemScroll);
            selectedItem=Array.FindIndex(filtered,i=>i.id==selectedInventoryId);if(selectedItem<0)selectedItem=0;
            for(int i=0;i<filtered.Length;i++)
            {
                var entry=filtered[i];bool chosen=i==selectedItem;
                GUILayout.BeginHorizontal();var itemIcon=GUILayoutUtility.GetRect(28,34,GUILayout.Width(28));theme.Icon(itemIcon,entry.kind=="resource"?entry.resource:entry.kind=="speedup"?"research":entry.kind=="energy"?"aether":entry.kind=="buff"?"infantry":"heroes",MythInterfaceTheme.Gold);
                if(GUILayout.Button(entry.name+"\n× "+entry.count,chosen?theme.Primary:theme.Skin.button,GUILayout.MinHeight(64))){selectedItem=i;selectedInventoryId=entry.id;itemDetailScroll=Vector2.zero;}GUILayout.EndHorizontal();
            }
            if(filtered.Length==0)GUILayout.Label("No stored items in this category.",theme.Small);
            GUILayout.EndScrollView();GUILayout.EndArea();
            if(filtered.Length==0){theme.Text(new Rect(detail.x+18,detail.y+18,detail.width-36,60),"Earn supplies through your campaign and daily objectives.",theme.Body);return;}
            GUILayout.BeginArea(new Rect(detail.x+18,detail.y+14,detail.width-36,detail.height-28));itemDetailScroll=GUILayout.BeginScrollView(itemDetailScroll);
            var item=filtered[selectedItem];GUILayout.Space(12);GUILayout.Label(item.name,theme.Heading);GUILayout.Label(item.description,theme.Body);
            int max=Mathf.Max(1,Mathf.Min(100,item.count));itemQuantity=Mathf.Clamp(itemQuantity,1,max);
            GUILayout.Label("Quantity · "+itemQuantity+" / "+item.count,theme.Small);
            itemQuantity=Mathf.RoundToInt(GUILayout.HorizontalSlider(itemQuantity,1,max,GUILayout.Width(Mathf.Min(450,detail.width-48))));
            InventoryJob job=null;
            if(item.kind=="speedup")
            {
                GUILayout.Label("Choose one active job",theme.Eyebrow);
                foreach(var candidate in bag.jobs)
                {
                    bool eligible=item.scope=="universal"||candidate.lane==item.scope;
                    GUI.enabled=eligible&&!processing;
                    if(GUILayout.Button((candidate.id==speedupJobId?"✓ ":"")+candidate.lane+" · "+candidate.targetId+" · "+Mathf.CeilToInt(candidate.remaining)+"s",GUILayout.MinHeight(38)))speedupJobId=candidate.id;
                }
                GUI.enabled=true;job=Array.Find(bag.jobs,j=>j.id==speedupJobId);
                if(job!=null)GUILayout.Label("Remove "+Mathf.CeilToInt(Mathf.Min(job.remaining,item.seconds*itemQuantity))+" seconds. Unused time: "+Mathf.FloorToInt(Mathf.Max(0,item.seconds*itemQuantity-job.remaining))+" seconds. Other jobs do not advance.",theme.Small);
                else GUILayout.Label("Only the first active training batch can be accelerated. Select a job above.",theme.Small);
            }
            else if(item.kind=="resource")GUILayout.Label("Adds "+item.amount*itemQuantity+" "+item.resource+" to your spendable stockpile.",theme.Heading);

            if(me.economy!=null&&(item.kind=="energy"||item.kind=="buff")){var e=me.economy;GUILayout.Label("AP "+e.ap+" / "+e.apCap+(e.ap<e.apCap?" · Next point in "+e.nextAPSeconds+"s · Full in "+e.fullAPSeconds+"s":" · Full")+". Movement, PvP, gathering and scouting cost no AP.",noteStyle);foreach(var buff in e.buffs)if(buff.remaining>0)GUILayout.Label("Active "+buff.kind+" oath · "+buff.remaining+" seconds remaining",noteStyle);}

            bool valid=item.kind!="speedup"||job!=null&&(item.scope=="universal"||job.lane==item.scope)&&itemQuantity<=Mathf.CeilToInt(job.remaining/Mathf.Max(1,item.seconds));
            if(item.kind=="energy"&&me.economy!=null)valid &= me.economy.ap+item.amount*itemQuantity<=me.economy.apCap;
            if(item.kind=="buff"&&me.economy!=null)valid &= itemQuantity==1&&!Array.Exists(me.economy.buffs,b=>b.kind==item.scope&&b.remaining>0);
            string reason=processing?"Sending your order…":pendingOrder!=null?"Confirm the previous order first.":item.count<itemQuantity?"Not enough items in this stack.":!valid?item.kind=="energy"?"This would exceed your AP capacity. Lower the quantity or use AP first.":item.kind=="buff"?"Use one oath at a time; the same active oath cannot stack.":"Select a compatible active job and an appropriate quantity.":"";
            if(theme.Action(item.kind=="speedup"?"Use hourglass":item.kind=="buff"?"Activate oath":"Use selected supplies",string.IsNullOrEmpty(reason),reason))Send(new GameCommand{type="inventory-use",targetId=item.id,count=itemQuantity,jobId=job==null?"":job.id});
            GUILayout.EndScrollView();GUILayout.EndArea();
        }
        private void RenderRankingsWindow(Rect r)
        {
            GUILayout.BeginArea(new Rect(r.x+18,r.y+10,r.width-36,r.height-20));contentScroll=GUILayout.BeginScrollView(contentScroll);
            if(world.rankings==null){GUILayout.Label("Rankings are not available on this server.",theme.Body);GUILayout.EndScrollView();GUILayout.EndArea();return;}
            GUILayout.Label("KINGDOM POWER",theme.Eyebrow);GUILayout.Label(world.rankings.policy,theme.Small);
            if(me.powerBreakdown!=null)
            {
                var p=me.powerBreakdown;
                GUILayout.Label("Your power · "+p.total.ToString("N0"),theme.Heading);
                GUILayout.Label("City "+p.city+" · Research "+p.research+" · Heroes "+p.heroes+" · Reserves "+p.ready+" · Deployed "+p.deployed,theme.Body);
            }
            GUILayout.Space(12);GUILayout.Label("CIVILIZATIONS",theme.Eyebrow);
            for(int i=0;i<world.rankings.players.Length;i++){var entry=world.rankings.players[i];GUILayout.Label((i+1)+". "+entry.name+" · "+entry.power.ToString("N0"),entry.id==playerId?theme.Heading:theme.Body);}
            GUILayout.Space(12);GUILayout.Label("ALLIANCES",theme.Eyebrow);
            if(world.rankings.alliances.Length==0)GUILayout.Label("No alliances have sworn an oath yet.",theme.Small);
            for(int i=0;i<world.rankings.alliances.Length;i++){var entry=world.rankings.alliances[i];GUILayout.Label((i+1)+". "+entry.name+" · "+entry.power.ToString("N0"),theme.Body);}
            GUILayout.EndScrollView();GUILayout.EndArea();
        }
    }
}
