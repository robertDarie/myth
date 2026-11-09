using System;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private readonly string[] resourceIds={"food","wood","stone","gold","mana","aether","sigil"};
        private readonly string[] resourceNames={"FOOD","WOOD","STONE","GOLD","MANA","AETHER","SIGILS"};
        private int ResourceValue(string id){switch(id){case "food":return me.food;case "wood":return me.wood;case "stone":return me.stone;case "gold":return me.gold;case "mana":return me.mana;case "aether":return me.aether;default:return me.sigils;}}
        private void DrawEnergyRibbon()
        {
            var e=me?.economy;if(e==null)return;
            var r=new Rect(266,77,ViewWidth-450,23);float elapsed=Time.unscaledTime-lastSnapshotAt;
            float next=InterfaceLayout.Countdown(e.nextAPSeconds,elapsed),full=InterfaceLayout.Countdown(e.fullAPSeconds,elapsed);
            string text="AP "+e.ap+" / "+e.apCap+(e.ap<e.apCap?"   +1 in "+InterfaceLayout.Duration(next)+" · Full "+InterfaceLayout.Duration(full):"   Full");
            theme.Icon(new Rect(r.x,r.y+3,13,16),"aether",MythInterfaceTheme.Teal);
            theme.Bar(new Rect(r.x+20,r.y+8,72,5),e.ap/(float)Mathf.Max(1,e.apCap),MythInterfaceTheme.Teal);
            int active=0;foreach(var buff in e.buffs)if(buff.remaining>0)active++;
            theme.OneLine(new Rect(r.x+101,r.y,r.width-108-active*100,r.height),text,theme.Small);
            string details="Action Points · Camps "+e.rules.campAP+" AP · Strongholds "+e.rules.strongholdAP+" AP. Movement, PvP, gathering and scouting are free.\n"+text;
            foreach(var buff in e.buffs)if(buff.remaining>0)details+="\n"+buff.kind+" +"+(buff.percent*100).ToString("F0")+"% · "+InterfaceLayout.Duration(InterfaceLayout.Countdown(buff.remaining,elapsed));
            theme.Hint(r,details);if(GUI.Button(r,GUIContent.none,GUIStyle.none))OpenInterface(InterfacePage.Inventory);
            float x=r.xMax-196;foreach(var buff in e.buffs)if(buff.remaining>0){var badge=new Rect(x,r.y,94,22);theme.Panel(badge,false,true);theme.OneLine(new Rect(x+5,r.y,84,22),(buff.kind=="attack"?"ATK":"DEF")+" +"+(buff.percent*100).ToString("F0")+"%",theme.Eyebrow);theme.Hint(badge,buff.kind+" oath · "+InterfaceLayout.Duration(buff.remaining));x+=100;}
        }
        private Rect MarchOrdersRect=>new Rect((ViewWidth-620)/2,ViewHeight-284,620,46);
        private void DrawMarchOrders()
        {
            var a=ActiveArmy;if(a==null||!a.deployed)return;var r=MarchOrdersRect;theme.Panel(r,false,true);
            theme.Text(new Rect(r.x+12,r.y+5,392,36),marchStatus.Status(a),theme.Small);
            bool ready=!processing&&pendingOrder==null;
            if(theme.Button(new Rect(r.xMax-202,r.y+7,88,32),"Stop",false,ready&&a.hasOrder&&string.IsNullOrEmpty(a.assignmentKind),"Use Recall to leave an alliance assignment."))Send(new GameCommand{type="stop",marchId=a.id});
            if(theme.Button(new Rect(r.xMax-106,r.y+7,96,32),"Recall [R]",false,ready))Send(new GameCommand{type="return",marchId=a.id});
        }
        private void FocusGameplay(float x,float z,float zoom=10)
        {cameraControl?.SetView(new Vector3(x,0,z),zoom);ShowKingdomForTarget();}
    }
}
