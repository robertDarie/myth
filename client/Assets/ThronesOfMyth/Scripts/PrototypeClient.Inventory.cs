using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int selectedItem,itemQuantity=1,itemCategory;
        private string speedupJobId="",chronicleCommanderId="";
        private Vector2 itemScroll,itemDetailScroll;
        private string selectedInventoryId="",acceptedInventoryId="",acceptedInventoryText="";
        private int acceptedInventoryCount=-1;
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
            if(bag.suppliesAvailable&&theme.Action("Collect founding supplies",!processing&&pendingOrder==null,"Confirm the pending order first."))Send(new GameCommand{type="inventory-supplies",requestId=Guid.NewGuid().ToString("N")});
            var accepted=Array.Find(bag.items??Array.Empty<InventoryItem>(),i=>i.id==acceptedInventoryId);
            if(accepted!=null&&accepted.count<acceptedInventoryCount)GUILayout.Label("Accepted once · "+acceptedInventoryText,theme.Small);
            inventoryCatalogue=GUILayout.Toggle(inventoryCatalogue,"Show unowned items");
            itemCategory=theme.Tabs(itemCategory,new[]{"All","Resources","Speedups","Summons","Energy","Combat buffs","Commander XP"},list.width-24);
            var categories=new[]{"","Resources","Speedups","Summons","Energy","Combat buffs","Commander XP"};
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
            if(item.kind=="buff")itemQuantity=1;
            int max=Mathf.Max(1,Mathf.Min(100,item.count));itemQuantity=Mathf.Clamp(itemQuantity,1,max);
            if(item.kind!="buff")
            {
                GUILayout.Label("Quantity · "+itemQuantity+" / "+item.count,theme.Small);
                itemQuantity=Mathf.RoundToInt(GUILayout.HorizontalSlider(itemQuantity,1,max,GUILayout.Width(Mathf.Min(450,detail.width-48))));
            }
            else GUILayout.Label("One oath. Quantity stays 1.",theme.Small);
            InventoryJob job=null;
            if(item.kind=="speedup")
            {
                var eligible=Array.FindAll(bag.jobs??Array.Empty<InventoryJob>(),candidate=>item.scope=="universal"||candidate.lane==item.scope);
                GUILayout.Label(eligible.Length==0?SpeedupWaiting(item.scope):"Choose one active job",theme.Eyebrow);
                foreach(var candidate in eligible)
                    if(GUILayout.Button((candidate.id==speedupJobId?"✓ ":"")+InventoryTargetLabel(candidate)+" · "+Mathf.CeilToInt(candidate.remaining)+"s",GUILayout.MinHeight(38)))speedupJobId=candidate.id;
                job=Array.Find(eligible,j=>j.id==speedupJobId);
                if(job!=null)GUILayout.Label("Remove "+Mathf.CeilToInt(Mathf.Min(job.remaining,item.seconds*itemQuantity))+" seconds. Unused time: "+Mathf.FloorToInt(Mathf.Max(0,item.seconds*itemQuantity-job.remaining))+" seconds. Other jobs do not advance.",theme.Small);
            }
            else if(item.kind=="experience")
            {
                if(!Array.Exists(me.ownedCommanders,id=>id==chronicleCommanderId))chronicleCommanderId=ActiveArmy.commanderId;
                GUILayout.Label("Choose a commander · "+(item.amount*itemQuantity)+" XP",theme.Heading);
                foreach(var id in me.ownedCommanders)
                {
                    var progress=Array.Find(me.heroProgress,h=>h.id==id);bool capped=progress==null||progress.heroLevel>=progress.stars*10;
                    GUI.enabled=!capped&&!processing;
                    if(GUILayout.Button((chronicleCommanderId==id?"✓ ":"")+HeroName(id)+(capped?" · promote stars first":"")))chronicleCommanderId=id;
                }
                GUI.enabled=true;
            }
            string preview=InventoryPreview(item,itemQuantity,job);
            GUILayout.Label(preview,theme.Heading);
            if(me.economy!=null&&(item.kind=="energy"||item.kind=="buff")){var e=me.economy;GUILayout.Label("AP "+e.ap+" / "+e.apCap+(e.ap<e.apCap?" · Next point in "+e.nextAPSeconds+"s · Full in "+e.fullAPSeconds+"s":" · Full")+". Movement, PvP, gathering and scouting cost no AP.",noteStyle);foreach(var buff in e.buffs)if(buff.remaining>0)GUILayout.Label("Active "+buff.kind+" oath · "+buff.remaining+" seconds remaining",noteStyle);}
            string reason=InventoryReason(item,itemQuantity,job);
            GUILayout.Label("One order is applied once. Retrying that order does not open or spend the stack again.",theme.Small);
            if(theme.Action(item.kind=="speedup"?"Use hourglass":item.kind=="buff"?"Activate oath":"Use selected supplies",string.IsNullOrEmpty(reason),reason))
            {
                acceptedInventoryId=item.id;acceptedInventoryCount=item.count;acceptedInventoryText=preview;
                Send(new GameCommand{type="inventory-use",targetId=item.id,count=itemQuantity,name=chronicleCommanderId,jobId=job==null?"":job.id,requestId=Guid.NewGuid().ToString("N")});
            }
            GUILayout.EndScrollView();GUILayout.EndArea();
        }
        private static string SpeedupWaiting(string scope)
        {
            if(scope=="construction")return "No construction job is active.";
            if(scope=="research")return "No research job is active.";
            if(scope=="training")return "Only the first active training batch can be accelerated.";
            if(scope=="healing")return "No treatment is active.";
            return "No active construction, research, training, crafting or treatment job.";
        }
        private string InventoryTargetLabel(InventoryJob candidate)
        {
            if(candidate.lane=="healing")return "Treatment";
            QueueJob match=null;
            if(me.construction!=null&&me.construction.id==candidate.id)match=me.construction;
            else if(me.secondConstruction!=null&&me.secondConstruction.id==candidate.id)match=me.secondConstruction;
            else if(me.research!=null&&me.research.id==candidate.id)match=me.research;
            else if(me.crafting!=null&&me.crafting.id==candidate.id)match=me.crafting;
            else if(me.trainingQueue!=null)match=Array.Find(me.trainingQueue,job=>job.id==candidate.id);
            return match!=null?JobName(match):candidate.lane;
        }
        private string InventoryPreview(InventoryItem item,int quantity,InventoryJob job)
        {
            if(item.kind=="resource")return "Adds "+item.amount*quantity+" "+item.resource+" to your spendable stockpile.";
            if(item.kind=="speedup")return job==null?"Select one active job. Each hourglass removes up to "+item.seconds+" seconds.":"Removes up to "+Mathf.CeilToInt(Mathf.Min(job.remaining,item.seconds*quantity))+" seconds from "+InventoryTargetLabel(job)+".";
            if(item.kind=="experience")return "Grants "+item.amount*quantity+" commander XP.";
            if(item.kind=="shards")return "Adds "+item.amount*quantity+" shards.";
            if(item.kind=="summon")return "Adds "+item.amount*quantity+" Oracle Sigil.";
            if(item.kind=="energy")return "Restores "+item.amount*quantity+" AP if the result stays within your cap.";
            if(item.kind=="buff")return "Lasts "+item.seconds+" seconds. "+item.description;
            return item.description;
        }
        private string InventoryReason(InventoryItem item,int quantity,InventoryJob job)
        {
            if(processing)return "Sending your order…";
            if(pendingOrder!=null)return "Confirm the previous order first.";
            if(item.count<quantity)return "Not enough items in this stack.";
            if(item.kind=="speedup")
            {
                if(job==null)return Array.Exists(me.inventory.jobs??Array.Empty<InventoryJob>(),candidate=>item.scope=="universal"||candidate.lane==item.scope)?"Select a compatible active job.":SpeedupWaiting(item.scope);
                if(quantity>Mathf.CeilToInt(job.remaining/Mathf.Max(1,item.seconds)))return "Fewer items can finish this job. Reduce the quantity.";
            }
            if(item.kind=="experience"){var hero=Array.Find(me.heroProgress,h=>h.id==chronicleCommanderId);if(hero==null||hero.heroLevel>=hero.stars*10)return "Promote that commander before using another chronicle.";}
            if(item.kind=="energy"&&me.economy!=null&&me.economy.ap+item.amount*quantity>me.economy.apCap)return "This would exceed your AP capacity. Lower the quantity or use AP first.";
            if(item.kind=="buff"&&me.economy!=null&&Array.Exists(me.economy.buffs,b=>b.kind==item.scope&&b.remaining>0))return "Use one oath at a time; the same active oath cannot stack.";
            return "";
        }
        private void RenderRankingsWindow(Rect r)
        {
            GUILayout.BeginArea(new Rect(r.x+18,r.y+10,r.width-36,r.height-20));contentScroll=GUILayout.BeginScrollView(contentScroll);
            if(world.rankings==null){GUILayout.Label("Rankings are not available on this server.",theme.Body);GUILayout.EndScrollView();GUILayout.EndArea();return;}
            GUILayout.Label("KINGDOM POWER",theme.Eyebrow);GUILayout.Label(world.rankings.policy,theme.Small);
            GUILayout.Label("The public board is total power only. Your own city, research, commanders, and military figures use the local prototype breakdown. They are not a Rise of Kingdoms power table, kill ranking, or event ranking.",theme.Small);
            if(me.powerBreakdown!=null)
            {
                var p=me.powerBreakdown;
                GUILayout.Label("Your power · "+p.total.ToString("N0"),theme.Heading);
                GUILayout.Label("City "+p.city+" · Research "+p.research+" · Commanders "+p.heroes+" · Military "+(p.ready+p.deployed)+" (reserves "+p.ready+", deployed "+p.deployed+")",theme.Body);
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
