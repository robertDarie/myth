using UnityEngine;
namespace ThronesOfMyth
{
    public sealed partial class PrototypeClient
    {
        private bool showDiplomacy;
        private void DrawDiplomacy()
        {
            var state = world.diplomacy;
            if (state == null)
            {
                GUILayout.Label("Diplomacy has not arrived from the kingdom yet.", noteStyle);
                return;
            }
            GUILayout.Label("ALLIANCE DIPLOMACY", theme.Eyebrow);
            GUILayout.Label(state.canLead ? "You can propose, answer and end non-aggression pacts." : state.lockReason, noteStyle);
            GUILayout.Label("A pact blocks field attacks, hostile rallies, beacon and fort sieges, and capture of the partner's occupied sites. It grants no resources.", noteStyle);
            if (state.pacts != null) foreach (var pact in state.pacts)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(pact.allianceName + " · Non-aggression pact", sectionStyle);
                GUI.enabled = state.canLead && !processing;
                if (GUILayout.Button("Terminate pact", theme.Primary)) Send(new GameCommand { type = "diplomacy-terminate", targetId = pact.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            if (state.incoming != null) foreach (var offer in state.incoming)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Incoming offer · " + offer.allianceName, sectionStyle);
                GUILayout.Label("Expires " + offer.expiresUtc + " · " + ActivityResetText(offer.remainingSeconds), theme.Small);
                GUI.enabled = state.canLead && !processing;
                if (GUILayout.Button("Accept pact", theme.Primary)) Send(new GameCommand { type = "diplomacy-accept", targetId = offer.id });
                if (GUILayout.Button("Decline")) Send(new GameCommand { type = "diplomacy-decline", targetId = offer.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            if (state.outgoing != null) foreach (var offer in state.outgoing)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label("Outgoing offer · " + offer.allianceName, sectionStyle);
                GUILayout.Label("Expires " + offer.expiresUtc + " · " + ActivityResetText(offer.remainingSeconds), theme.Small);
                GUI.enabled = state.canLead && !processing;
                if (GUILayout.Button("Withdraw offer")) Send(new GameCommand { type = "diplomacy-withdraw", targetId = offer.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
            if (state.alliances != null) foreach (var alliance in state.alliances)
            {
                GUILayout.BeginVertical(GUI.skin.box);
                GUILayout.Label(alliance.name + " · " + (alliance.relationship == "pact" ? "Non-aggression pact" : "Neutral") + " · Leader " + alliance.leaderName, sectionStyle);
                bool pending = HasOffer(state, alliance.id);
                GUI.enabled = state.canLead && alliance.relationship != "pact" && !pending && !processing;
                if (GUILayout.Button(alliance.relationship == "pact" ? "Pact active" : pending ? "Proposal pending" : "Propose non-aggression pact", theme.Primary))
                    Send(new GameCommand { type = "diplomacy-propose", targetId = alliance.id });
                GUI.enabled = true;
                GUILayout.EndVertical();
            }
        }
        private static bool HasOffer(DiplomacyState state, string allianceId)
        {
            if (state.incoming != null && System.Array.Exists(state.incoming, offer => offer.allianceId == allianceId)) return true;
            return state.outgoing != null && System.Array.Exists(state.outgoing, offer => offer.allianceId == allianceId);
        }
    }
}
