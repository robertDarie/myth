using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private readonly FirstSessionGuide opening=new FirstSessionGuide(LoadOpeningFlag,SaveOpeningFlag);
        private static string OpeningKey(string identity,string flag)
        {
            using var sha=SHA256.Create();
            var hex=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(identity??"")),0,8).Replace("-","");
            return "ThronesOfMyth.opening."+flag+"."+hex;
        }
        private static bool LoadOpeningFlag(string identity,string flag)=>PlayerPrefs.GetInt(OpeningKey(identity,flag),0)==1;
        private static void SaveOpeningFlag(string identity,string flag,bool value){PlayerPrefs.SetInt(OpeningKey(identity,flag),value?1:0);PlayerPrefs.Save();}
        private readonly HashSet<string> claimedFeedback=new HashSet<string>();
        private string feelProfile;
        private int encounterShown;
        private bool openingEnabled=true;
        private OpeningCue Opening => openingEnabled&&me!=null?opening.Next(me,ActiveArmy):null;
        private void ObserveSessionFeel()
        {
            string identity=serverUrl.TrimEnd('/')+"/"+playerId;
            opening.Profile(identity);
            if(feelProfile!=identity){feelProfile=identity;claimedFeedback.Clear();encounterShown=0;}
            if(!worldReady)encounterShown=0;
            if(map.EncounterSerial!=encounterShown)
            {
                encounterShown=map.EncounterSerial;
                if(pendingOrder==null&&!processing){status=map.LatestEncounterTitle+" · "+map.LatestEncounterDetail;toastUntil=Time.unscaledTime+6;}
            }
        }
        private void GuideOpening(OpeningCue cue)
        {
            switch(FirstSessionGuide.Operation(cue))
            {
                case "formation":PrepareCityMarch();return;
                case "reports":opening.OutcomeViewed=true;GuidePage(InterfacePage.Reports);return;
                case "return":
                    if(ActiveArmy.state=="Returning")GuidePage(InterfacePage.City);
                    else {Send("return");interfacePage=InterfacePage.World;cameraControl?.Focus(ActiveArmy.x,ActiveArmy.z);}
                    return;
                default:GuideObjective(new JourneyTask{guide=cue.Guide,targetId=cue.Target});return;
            }
        }
        private string ClaimRewardPreview(GameCommand command)
        {
            var activityReward=ActivityRewardPreview.Find(command,world?.activity);if(activityReward!=null)return JourneyRewardText(activityReward);
            if(me?.journeyCampaign?.chapters==null)return null;
            foreach(var chapter in me.journeyCampaign.chapters)
            {
                if(command.type=="chapter-claim"&&chapter.id==command.targetId&&chapter.canClaim)return JourneyRewardText(chapter.reward)+(string.IsNullOrEmpty(chapter.commanderReward)?"":" · "+HeroName(chapter.commanderReward));
                foreach(var task in chapter.tasks)if(command.type=="journey-claim"&&task.id==command.targetId&&task.canClaim)return JourneyRewardText(task.reward);
            }
            return null;
        }
        private void OnConfirmedCommand(GameCommand command)
        {
            map.ConfirmDestination(command,me.homeX,me.homeZ);
            if(command.type=="configure-march"||command.type=="deploy-march")opening.ArmyPrepared=true;
            switch(command.type)
            {
                case "building-upgrade":case "upgrade":case "train":case "promote":case "research":case "configure-march":case "deploy-march":case "upgrade-skill":case "promote-commander":case "upgrade-commander":case "talent-raise":case "talent-respec":BattlefieldAudio.UiCue("confirm");break;
            }
        }
    }
}
