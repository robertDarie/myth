using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private int selectedItem,itemQuantity=1,itemCategory;
        private string speedupJobId="";
        private Vector2 itemScroll;
        private void RenderInventoryWindow(Rect r)
        {
            var bag=me.inventory;
            if(bag==null){theme.Text(r,"Update and restart the server to load your inventory.",theme.Body);return;}
            GUILayout.BeginArea(new Rect(r.x+16,r.y+10,r.width-32,r.height-20));itemScroll=GUILayout.BeginScrollView(itemScroll);
            GUILayout.Label("SUPPLIES OF THE DAWN",theme.Eyebrow);
            GUILayout.Label("Sealed supplies stay in your inventory until you choose to use them.",theme.Body);
            if(bag.suppliesAvailable)
            {
                GUILayout.Label("Founding supplies · resource packs and earned hourglasses. One claim per city.",theme.Small);
                GUI.enabled=!processing&&pendingOrder==null;
                if(GUILayout.Button("Collect founding supplies",theme.Primary,GUILayout.Height(38)))Send("inventory-supplies");GUI.enabled=true;
            }
            if(bag.items==null||bag.items.Length==0){GUILayout.EndScrollView();GUILayout.EndArea();return;}
            selectedItem=Mathf.Clamp(selectedItem,0,bag.items.Length-1);
            itemCategory=GUILayout.Toolbar(itemCategory,new[]{"All","Resources","Speedups","Summons","Energy","Combat buffs"});
            var categories=new[]{"","Resources","Speedups","Summons","Energy","Combat buffs"};
            var filtered=Array.FindAll(bag.items,i=>itemCategory==0||i.category==categories[itemCategory]);
            if(filtered.Length==0){GUILayout.Label("No items in this category.",theme.Small);GUILayout.EndScrollView();GUILayout.EndArea();return;}
            selectedItem=Mathf.Clamp(selectedItem,0,filtered.Length-1);
            var names=new string[filtered.Length];for(int i=0;i<names.Length;i++)names[i]=filtered[i].name+" · "+filtered[i].count;
            selectedItem=GUILayout.SelectionGrid(selectedItem,names,2,GUILayout.Height(Mathf.CeilToInt(names.Length/2f)*46));
            var item=filtered[selectedItem];GUILayout.Space(12);GUILayout.Label(item.name,theme.Heading);GUILayout.Label(item.description,theme.Body);
            int max=Mathf.Max(1,Mathf.Min(100,item.count));itemQuantity=Mathf.Clamp(itemQuantity,1,max);
            GUILayout.Label("Quantity · "+itemQuantity+" / "+item.count,theme.Small);
            itemQuantity=Mathf.RoundToInt(GUILayout.HorizontalSlider(itemQuantity,1,max,GUILayout.Width(Mathf.Min(450,r.width-64))));
            InventoryJob job=null;
            if(item.kind=="speedup")
            {
                GUILayout.Label("Choose one active job",theme.Eyebrow);
                foreach(var candidate in bag.jobs)
                {
                    bool eligible=item.scope=="universal"||candidate.lane==item.scope;
                    GUI.enabled=eligible&&!processing;
                    if(GUILayout.Button((candidate.id==speedupJobId?"✓ ":"")+candidate.lane+" · "+candidate.targetId+" · "+Mathf.CeilToInt(candidate.remaining)+"s",GUILayout.Height(32)))speedupJobId=candidate.id;
                }
                GUI.enabled=true;job=Array.Find(bag.jobs,j=>j.id==speedupJobId);
                if(job!=null)GUILayout.Label("Remove "+Mathf.CeilToInt(Mathf.Min(job.remaining,item.seconds*itemQuantity))+" seconds. Unused time: "+Mathf.FloorToInt(Mathf.Max(0,item.seconds*itemQuantity-job.remaining))+" seconds. Other jobs do not advance.",theme.Small);
                else GUILayout.Label("Only the first active training batch can be accelerated. Select a job above.",theme.Small);
            }
            else if(item.kind=="resource")GUILayout.Label("Adds "+item.amount*itemQuantity+" "+item.resource+" to your spendable stockpile.",theme.Heading);
            else GUILayout.Label(item.description,theme.Small);
            if(me.economy!=null){var e=me.economy;GUILayout.Label("AP "+e.ap+" / "+e.apCap+(e.ap<e.apCap?" · Next point in "+e.nextAPSeconds+"s · Full in "+e.fullAPSeconds+"s":" · Full")+". Movement, PvP, gathering and scouting cost no AP.",noteStyle);foreach(var buff in e.buffs)if(buff.remaining>0)GUILayout.Label("Active "+buff.kind+" oath · "+buff.remaining+" seconds remaining",noteStyle);}
            GUILayout.Label("Free premium Aether: 5 from each of Chapters I and III, and 2 / 3 from daily chests at 60 / 100 points. Claimed rewards never pay twice.",theme.Small);
            bool valid=item.kind!="speedup"||job!=null&&(item.scope=="universal"||job.lane==item.scope)&&itemQuantity<=Mathf.CeilToInt(job.remaining/Mathf.Max(1,item.seconds));
            if(item.kind=="energy"&&me.economy!=null)valid &= me.economy.ap+item.amount*itemQuantity<=me.economy.apCap;
            if(item.kind=="buff"&&me.economy!=null)valid &= itemQuantity==1&&!Array.Exists(me.economy.buffs,b=>b.kind==item.scope&&b.remaining>0);
            GUI.enabled=!processing&&pendingOrder==null&&item.count>=itemQuantity&&valid;
            if(GUILayout.Button(item.kind=="speedup"?"Use hourglass":item.kind=="buff"?"Activate oath":"Use item",theme.Primary,GUILayout.Height(42)))Send(new GameCommand{type="inventory-use",targetId=item.id,count=itemQuantity,jobId=job==null?"":job.id});GUI.enabled=true;
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
