using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        [Serializable] private sealed class AccountRequest { public string username, password, recoveryCode; public bool revokeOtherSessions, allDevices; }
        [Serializable] private sealed class AccountResult { public string token, playerId, name, username, recoveryCode; public bool registered; public int activeSessions; }
        private bool accountEntryOpen, accountRecovering, accountBusy, accountRegistered, revokeOtherDevices;
        private string accountName="", accountPassword="", accountPasswordConfirm="", accountRecoveryInput="", accountRecoveryDisplay="", accountMessage="";
        private Vector2 accountScroll;
        private bool SecureAccountAddress()
        {
            return Uri.TryCreate(serverUrl,UriKind.Absolute,out var address)&&(address.Scheme=="https"||(address.Scheme=="http"&&address.IsLoopback));
        }
        private void OpenAccount()
        {
            interfacePage=InterfacePage.Account;
            if(!accountBusy)StartCoroutine(RefreshAccount());
        }
        private IEnumerator RefreshAccount()
        {
            if(world?.persistence?.backend!="sqlite") { accountMessage="Account protection requires a SQLite kingdom. This local profile still saves on your PC.";yield break; }
            accountBusy=true;
            using(var request=Request("/auth/me","GET"))
            {
                yield return request.SendWebRequest();
                if(request.result==UnityWebRequest.Result.Success)
                {
                    var result=JsonUtility.FromJson<AccountResult>(request.downloadHandler.text);accountRegistered=result.registered;
                    if(result.registered){accountName=result.username;accountMessage="Protected city · "+result.activeSessions+" signed-in device(s).";}
                    else accountMessage="Protect this existing city so you can sign in on another device.";
                }
                else accountMessage=DescribeError(request);
            }
            accountBusy=false;
        }
        private void RenderAccountEntry()
        {
            theme.Backdrop(new Rect(0,0,ViewWidth,ViewHeight));
            float width=Mathf.Min(650,ViewWidth-80);
            var panel=new Rect((ViewWidth-width)/2,40,width,ViewHeight-80);theme.Panel(panel);
            theme.Text(new Rect(panel.x+28,panel.y+20,panel.width-56,42),"Return to your civilization",theme.Title);
            theme.OneLine(new Rect(panel.x+28,panel.y+64,panel.width-56,25),serverUrl,theme.Small);
            RenderAccountWindow(new Rect(panel.x+20,panel.y+108,panel.width-40,panel.height-128));
        }
        private void RenderAccountWindow(Rect r)
        {
            GUILayout.BeginArea(new Rect(r.x+14,r.y+8,r.width-28,r.height-16));accountScroll=GUILayout.BeginScrollView(accountScroll);
            bool entry=string.IsNullOrEmpty(token);
            GUI.enabled=!accountBusy;
            GUILayout.Label(entry?"ACCOUNT SIGN IN":accountRegistered?"PROTECTED CITY":"PROTECT THIS CITY",theme.Eyebrow);
            GUILayout.Label(entry?"Your city follows your account.":"Keep your civilization recoverable.",theme.Heading);
            GUILayout.Label("Accounts belong to this kingdom. Use the same server address on your other PC or phone.",theme.Body);
            if(entry)
            {
                GUILayout.Label("Server address",theme.Small);serverUrl=GUILayout.TextField(serverUrl,160,GUILayout.Height(36));
                GUILayout.Label("Account name",theme.Small);accountName=GUILayout.TextField(accountName,24,GUILayout.Height(36));
                accountRecovering=GUILayout.Toggle(accountRecovering,"Recover with my saved recovery code");
            }
            else if(!accountRegistered){GUILayout.Label("Choose an account name · letters, numbers or underscore",theme.Small);accountName=GUILayout.TextField(accountName,24,GUILayout.Height(36));}
            else GUILayout.Label("Account · "+accountName,theme.Heading);
            GUILayout.Label(accountRecovering?"New password · at least 12 characters":"Password · at least 12 characters",theme.Small);
            accountPassword=GUILayout.PasswordField(accountPassword,'*',128,GUILayout.Height(36));
            if(!accountRegistered&&!entry||accountRecovering)
            {
                GUILayout.Label("Confirm password",theme.Small);accountPasswordConfirm=GUILayout.PasswordField(accountPasswordConfirm,'*',128,GUILayout.Height(36));
            }
            if(entry&&accountRecovering){GUILayout.Label("Saved recovery code",theme.Small);accountRecoveryInput=GUILayout.PasswordField(accountRecoveryInput,'*',128,GUILayout.Height(36));}
            if(entry&&!accountRecovering)revokeOtherDevices=GUILayout.Toggle(revokeOtherDevices,"Sign out my other devices");
            if(!SecureAccountAddress())GUILayout.Label("Use an HTTPS kingdom address. HTTP is supported only for local development.",theme.Small);
            bool available=entry||world?.persistence?.backend=="sqlite";
            GUI.enabled=!accountBusy&&!processing&&available&&SecureAccountAddress();
            if(entry)
            {
                if(GUILayout.Button(accountBusy?"Opening your account…":accountRecovering?"Recover my city":"Sign in",theme.Primary,GUILayout.Height(42)))StartCoroutine(AccountAction(accountRecovering?"recover":"login"));
            }
            else if(!accountRegistered)
            {
                if(GUILayout.Button(accountBusy?"Protecting your city…":"Protect this city",theme.Primary,GUILayout.Height(42)))StartCoroutine(AccountAction("register"));
            }
            else
            {
                if(GUILayout.Button("Replace my recovery code",GUILayout.Height(36)))StartCoroutine(AccountAction("rotate-recovery"));
                GUILayout.Label("Enter your password above to replace the code. The old code stops working.",theme.Small);
                if(GUILayout.Button("Sign out this device",GUILayout.Height(36)))StartCoroutine(AccountAction("logout"));
                if(GUILayout.Button("Sign out all devices",GUILayout.Height(36)))StartCoroutine(AccountAction("logout-all"));
            }
            GUI.enabled=true;
            if(!available)GUILayout.Label("This local JSON server does not provide accounts. Use a SQLite kingdom for account testing; your existing local save remains available.",theme.Body);
            if(!string.IsNullOrEmpty(accountRecoveryDisplay))
            {
                GUILayout.Space(12);GUILayout.Label("SAVE YOUR RECOVERY CODE",theme.Eyebrow);
                GUILayout.Label("Keep this code somewhere private. It can replace your password. It is shown only here and is not saved by the client.",theme.Body);
                GUILayout.TextField(accountRecoveryDisplay,GUILayout.Height(36));
                if(GUILayout.Button("Copy recovery code",GUILayout.Height(32)))GUIUtility.systemCopyBuffer=accountRecoveryDisplay;
                if(GUILayout.Button("I saved my code · hide it",GUILayout.Height(32)))accountRecoveryDisplay="";
            }
            if(!string.IsNullOrEmpty(accountMessage)){GUILayout.Space(10);GUILayout.Label(accountMessage,theme.Body);}
            GUI.enabled=!accountBusy;
            if(entry&&GUILayout.Button("Back to local / guest profile",GUILayout.Height(32))){accountEntryOpen=false;accountRecovering=false;accountPassword="";accountPasswordConfirm="";accountRecoveryInput="";}
            GUI.enabled=true;
            GUILayout.EndScrollView();GUILayout.EndArea();
        }
        private IEnumerator AccountAction(string action)
        {
            if(accountBusy||processing||!SecureAccountAddress())yield break;
            bool passwordAction=action!="logout"&&action!="logout-all";
            if(passwordAction&&(accountPassword.Length<12||((action=="register"||action=="recover")&&accountPassword!=accountPasswordConfirm)))
            {accountMessage="Use at least 12 characters and matching confirmation.";yield break;}
            var body=new AccountRequest{username=accountName,password=accountPassword,recoveryCode=accountRecoveryInput,revokeOtherSessions=revokeOtherDevices,allDevices=action=="logout-all"};
            accountBusy=true;accountMessage="Contacting your kingdom…";
            using(var request=Request("/auth/"+(action=="logout-all"?"logout":action),"POST",JsonUtility.ToJson(body)))
            {
                yield return request.SendWebRequest();
                if(request.result==UnityWebRequest.Result.Success)
                {
                    var result=JsonUtility.FromJson<AccountResult>(request.downloadHandler.text);
                    accountPassword="";accountPasswordConfirm="";accountRecoveryInput="";
                    if(action=="logout"||action=="logout-all")
                    {
                        PlayerPrefs.DeleteKey(SessionKey);ReturnToAccountEntry("Signed out. Sign in to return to this city.");
                    }
                    else if(action=="rotate-recovery"){accountRecoveryDisplay=result.recoveryCode;accountMessage="Recovery code replaced. Save the new code.";}
                    else
                    {
                        if(pollRoutine!=null)StopCoroutine(pollRoutine);
                        commands.Clear();token=result.token;playerId=result.playerId;playerName=result.name;accountName=result.username;accountRegistered=true;accountEntryOpen=false;accountRecovering=false;
                        accountRecoveryDisplay=result.recoveryCode??"";accountMessage="City recovered. Keep your credentials private.";
                        cityProgress.Reset();activeMarchId=playerId;focused=false;worldReady=false;world=null;me=null;map.Clear();pendingOrder=null;loadedOrderProfile="";
                        loadingError="";loadingStage="Restoring your protected city";
                        PlayerPrefs.SetString(SessionKey,token);PlayerPrefs.SetString("ThronesOfMyth.name",playerName);PlayerPrefs.Save();
                        interfacePage=string.IsNullOrEmpty(accountRecoveryDisplay)?InterfacePage.World:InterfacePage.Account;
                        pollRoutine=StartCoroutine(Poll());
                    }
                }
                else accountMessage=DescribeError(request);
            }
            accountBusy=false;
        }
        private void ReturnToAccountEntry(string message)
        {
            if(pollRoutine!=null){StopCoroutine(pollRoutine);pollRoutine=null;}
            ResetCityExperience();focused=false;token=null;world=null;me=null;worldReady=false;commands.Clear();processing=false;map.Clear();loadingError="";
            accountEntryOpen=true;accountRegistered=false;accountRecoveryDisplay="";accountMessage=message;
            accountPassword="";accountPasswordConfirm="";accountRecoveryInput="";pendingOrder=null;loadedOrderProfile="";
        }
    }
}
