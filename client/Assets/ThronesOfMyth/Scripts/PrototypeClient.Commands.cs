using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        [Serializable] private sealed class PendingOrder { public string key,body,playerId,server; }
        private PendingOrder pendingOrder;
        private string loadedOrderProfile="";
        private static string OrderProfile(string server,string player) => "ThronesOfMyth.pending."+server.TrimEnd('/')+"."+player;
        private bool SavePendingOrder(PendingOrder order)
        {
            try { PlayerPrefs.SetString(OrderProfile(order.server,order.playerId),JsonUtility.ToJson(order));PlayerPrefs.Save();return true; }
            catch { status="The order could not be retained on this device. It has not been sent.";return false; }
        }
        private void RestorePendingOrder()
        {
            string profile=OrderProfile(serverUrl,playerId);if(loadedOrderProfile==profile)return;loadedOrderProfile=profile;
            string saved=PlayerPrefs.GetString(profile,"");if(string.IsNullOrEmpty(saved))return;
            try
            {
                var order=JsonUtility.FromJson<PendingOrder>(saved);
                if(order==null||order.playerId!=playerId||order.server.TrimEnd('/')!=serverUrl.TrimEnd('/')||string.IsNullOrEmpty(order.key)||string.IsNullOrEmpty(order.body))throw new InvalidOperationException();
                pendingOrder=order;status="A previous order needs confirmation. Retry it safely before issuing another.";
            }
            catch { pendingOrder=new PendingOrder{key="",body="",playerId=playerId,server=serverUrl};status="The previous order record could not be read. Check your city, then clear the unreadable record in Settings."; }
        }
        private void ClearPendingOrder(PendingOrder order)
        {
            if(order==null)return;
            PlayerPrefs.DeleteKey(OrderProfile(order.server,order.playerId));PlayerPrefs.Save();
            if(ReferenceEquals(pendingOrder,order))pendingOrder=null;
        }
        private IEnumerator RetryPendingOrder()
        {
            if(processing||pendingOrder==null||string.IsNullOrEmpty(pendingOrder.key))yield break;
            processing=true;
            var order=pendingOrder;
            yield return TransmitOrder(JsonUtility.FromJson<GameCommand>(order.body),order.body,order);
            processing=false;
        }
        private IEnumerator TransmitOrder(GameCommand command,string body,PendingOrder retained)
        {
            string originPlayer=playerId,originServer=serverUrl;
            string claimReward=ClaimRewardPreview(command);
            int attempts=retained==null?1:2;
            for(int attempt=0;attempt<attempts;attempt++)
            {
                bool retry=false;
                using(var request=Request("/command","POST",body))
                {
                    if(retained!=null)request.SetRequestHeader("Idempotency-Key",retained.key);
                    yield return request.SendWebRequest();
                    bool success=request.result==UnityWebRequest.Result.Success;
                    bool rejected=MarchJourney.DefinitiveRejection(request.responseCode);
                    if(retained!=null&&(success||rejected))ClearPendingOrder(retained);
                    status=success?OrderFeedback(command):DescribeError(request);lastOrderFailed=!success;orderNoticeAt=Time.unscaledTime;
                    if(success&&playerId==originPlayer&&serverUrl==originServer&&me!=null)
                    {
                        OnConfirmedCommand(command);
                        if(!string.IsNullOrEmpty(claimReward)&&claimedFeedback.Add(command.type+":"+command.targetId+":"+command.period))
                        {status="Reward claimed · "+claimReward;BattlefieldAudio.UiCue("reward");}
                    }
                    if(success&&(command.type=="deploy-march"||command.type=="configure-march")){pendingFormationHero=command.targetId;interfacePage=InterfacePage.World;}
                    if(success&&command.type=="chat-send"&&chatDraft==command.name)chatDraft="";
                    retry=retained!=null&&!success&&(request.result==UnityWebRequest.Result.ConnectionError||request.responseCode>=500)&&attempt+1<attempts&&!string.IsNullOrEmpty(token);
                    toastUntil=Time.unscaledTime+5;
                }
                if(!retry)break;
                status="Confirming the last order with your kingdom…";yield return new WaitForSecondsRealtime(.5f);
            }
            if(retained!=null&&ReferenceEquals(pendingOrder,retained))status="The last order is unconfirmed. Retry safely; its resources will not be charged twice.";
        }
    }
}
