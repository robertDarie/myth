# TM-077 Diplomacy and coalitions

## Non-aggression pacts

A pact is bilateral and uses alliance ids. Only the leaders of two different alliances can propose and accept it. The invited leader may decline. The proposing leader may withdraw. Either leader may end an active pact. A declined, withdrawn, or expired proposal does not create a pact.

A proposal expires 24 hours after it is created, measured on the monotonic activity clock. An alliance may have four outgoing proposals. The kingdom holds at most 64 pending proposals. One pending proposal may exist between a pair, and an active pact blocks another proposal.

Acceptance is refused while a field battle, attack order, rally, or siege is still open between the alliances. Ending that engagement does not delete troops, cargo, wounded units, or paid jobs. After the pact is active, the server rejects direct PvP, hostile rallies against the partner's beacons, forts, and occupied sacred sites. The same rule applies in both directions. Neutral and unaffiliated armies are unchanged. A pact grants no resources.

Members and officers can read the diplomacy state. Only leaders can sign or end treaties. Another alliance cannot see a proposal that does not involve it, and alliance chat stays inside the alliance.

Disbanding an alliance removes its proposals and pacts. Schema 23 stores the diplomacy book. Schema 22 loads an empty book and keeps the alliances. Protocol stays 16.

## Coalitions

Coalition rules are added in the following checkpoint.
