# Windows economy acceptance — v0.29.0

## Back up and rebuild

1. Stop the old game/server. Back up `%LOCALAPPDATA%\ThronesOfMyth\Saves` for the
   packaged game, or your configured development save location. Use the existing
   `node server/backup.mjs <source.sqlite> <new-backup.sqlite>` command for a full
   SQLite backup, including accounts and receipts. Keep an untouched v0.28 backup.
2. Pull main and Git LFS assets. Open `client` in Unity 6.3 LTS; wait for imports
   and confirm the Console has no compilation errors.
3. Editor: start Node 24+ with `cd server` then `node index.mjs`, open the existing
   prototype scene and enter Play. Connect to `http://127.0.0.1:8080`.
4. Standalone: choose **Thrones of Myth → Build Windows Playtest**. Extract the
   complete `dist/Thrones-of-Myth-Windows.zip` and launch **Start Thrones of Myth.cmd**.
   Do not reuse an old client or server: v0.29 requires protocol 16.

## New-player journey

- Start a new city. Confirm separate Mana and Aether balances, AP 100/100, and
  inventory categories. Aether starts at zero; Mana is an ordinary resource.
- Upgrade the Citadel, train two batches, prepare the founding march and deliver
  40 wood and 40 food. Claim each opening objective, then Chapter I. Confirm
  exactly 5 Aether and one stored Warden shard pack, with no automatic spending.
- Open the shard pack; recruit the Warden with ten matching shards. Train another
  batch and prepare/deploy a second formation. Existing commanders must remain
  assigned uniquely. A weak five-unit march should not be assumed to solo a camp;
  use the stronger founding formation for the initial battle.
- Approach a visible level-one camp. AP must remain unchanged during travel and
  drop by five at actual combat. Stop/rejoin the same generation: no second charge.
  Defeat it, review Mana/ordinary rewards, return and redeploy. After its respawn,
  the next engagement should cost five again. Camp rewards must not mint Aether.
- Complete the existing Temple progression. Gold cannot recruit a chosen hero or
  buy Sigils. Free offerings, earned Sigils, inventory Sigils, shard recruitment,
  summons, duplicate shards and pity must remain usable. Atalanta's existing
  guaranteed progression reward must still work.

## AP, inventory and timed oaths

- Spend AP, wait at least one real minute and observe +1 with a decreasing next-point
  timer. Close/reopen or reconnect: AP must not refill to 100 or forget elapsed time.
- Claim founding supplies once. Unseal one Sigil: add exactly one Sigil, do not roll
  a commander automatically. Check stored resource packs remain unspent until use.
- At AP 80 or below, use one 20-AP tonic; verify the exact increase. Attempt a tonic
  near/full cap: reject without consuming it. Test quantity/overflow controls.
- Use a specialized research/training/healing speedup on a real active matching
  job. Other lanes must not advance. Ineligible jobs must be disabled/rejected.
- Activate Valor and Shelter. Verify both authoritative ten-minute timers and
  changed actual attack/received damage. Try using a second same-type oath while
  active: reject without consuming it. Different types can coexist.
- Restart midway through the duration. It must retain the original expiry, not
  restart the timer. After ten real minutes, the effect and timer must expire.
  Check reduced motion and audio settings remain respected; no new effects are
  needed to make the economic result occur.

## Two-player/alliance checks

Use two clients and two cities on the same server (the Editor plus the packaged
client is sufficient for local testing).

1. Join one alliance. Build the sender's Agora and select the recipient in Market.
   Send 100 wood: recipient gets 100, sender loses 110. Inspect both private reports
   and the sender's remaining daily allowance. A sender report describes delivery,
   not income. Reopen/reconnect: no second transfer should occur.
2. Test insufficient funds, a self-recipient, member departure and sending limit.
   Premium Aether, Sigils and items must not be selectable. Alliance leadership
   transfer must still work through its existing controls.
3. Assemble a two-march stronghold rally. No AP cost during assembly/travel; actual
   siege entry costs ten per participating city. Multiple own marches must not
   multiply that charge. An underfunded party must not be charged if it cannot
   meet the two-affordable-march minimum.
4. Fight a real PvP duel: no AP cost to either side. Gathering, scouts and ordinary
   marches must likewise remain AP-free. Confirm private inventory/transfer/AP
   data is not displayed for the other city.

## Legacy-save check

Start a copy of the v0.28 save with v0.29. Compare before/after values: earned Aether
→ Mana; new Aether zero; old sealed phials → Mana packs; same commanders, troop
counts, item counts, equipment, objectives, job IDs and remaining work. Cancel an
old Mana-cost job and deliver old cargo: receive Mana, never premium Aether.
Previously claimed supplies/objectives/chests must not grant new premium/items.
Inspect a historical report's legacy note, then restart twice to check no repeated
migration, reward, AP reset or cargo delivery. Confirm the JSON migration archive
or your pre-upgrade SQLite backup remains available.

## Display and native verification

Repeat inventory, Temple, commanders, Agora, reports, city and world at 1280×720,
1920×1080 and 2560×1440; UI scales 0.85/1/1.15 and supported narrow/ultrawide ratios.
Check seven-resource HUD labels, AP/oath timers, scrolling, exact item previews,
selected/disabled states, map selection, camera limits and existing shortcuts.
Record Console errors, screenshots and any mismatched amounts. Rendering, native
input, layout, launcher/installer behavior and FPS are pending this Windows run;
automated source and server tests do not certify them.
