# Exploration and gate routes · 0.12

This release adds current vision, persistent map discovery, dedicated scouts and
routes through province corridors. It builds on the alliance warfare milestone;
city sieges and KvK remain later work.

## Vision and discovery

The 80×80 map has 400 discovery sectors (four units per side). Cities reveal a
radius of ten units; armies reveal eight; scouts reveal nine. Alliance members
share current vision. Land seen during simulation stays in each city's personal
discovery history even after an alliance membership change. Map and minimap
separate unexplored sectors, remembered sectors and current vision.

Enemy marches disappear from authenticated snapshots when out of sight. Visible
enemy marches do not reveal their orders or future route. Allied marches stay
available for coordination. Other players' city positions are fixed public
landmarks; their player records no longer leak moving founding-army coordinates.
Camps/resources and enemy beacons require current sight for live map display.
Sacred sites remain public landmarks, with hidden ownership/health replaced by an
explicit unsurveyed state. Your alliance retains its own structure status.

Scouting histories and mission details are private; allied scouts share their
positions and current vision. Enemy garrison IDs are omitted from normal
snapshots. Scout arrival reports can reveal garrison totals. The unfiltered global
event feed is suppressed in player snapshots because it would disclose remote
battles; kingdom/alliance chat and battle reports remain available.

Server snapshots enforce this filtering. A hidden enemy march cannot be targeted
for PvP; pursuit ends when current allied vision is lost. Static camp/resource/site
IDs remain commandable as fixed destinations if already known, even outside
current vision. Fog does not turn static map identifiers into secrets. A route
preview shows your ordered destination, not hidden enemy tracking.

## Dedicated scouts

Open **Exploration** in the activity navigation. Send your free dedicated scout
using coordinates or **Choose destination on the map**, then left-click a
location. Unsurveyed sacred-site context actions also offer scouting. Esc cancels
map destination selection. One scout can be active per city, independently of
army slots, troops and city queues.

Scouts travel at seven units per second, obey gate access and reveal along their
path. On arrival they record nearby enemy marches, camps, sacred sites, forts/
beacons and garrison totals, then return home. Reports are timestamped historical
observations, not live trackers. The latest 20 persist privately. Current troop
composition can differ when an attack arrives.

A scout can be recalled using its current mission ID; obsolete recalls cannot
cancel a later mission. Losing destination access sends it home without an
arrival report. Scouted enemy objectives remain available in the Warfare target
list after the scout returns. Ownership, supply and access are checked again on
rally creation; a report can be stale or the structure can have been destroyed.

Scouts are unattackable exploration proxies in this milestone. Exploration
rewards, watchtower alerts, scout combat/interception, alliance report-sharing and
upgradeable scouting institutions are not yet implemented.

## Gate corridors and movement

The border at x=40 has crossings at z=20 and z=60, controlled by the Eastern
Divine Gate. The border at z=40 has crossings at x=20 and x=60, controlled by the
Northern Divine Gate. Each visible opening spans four units; the navigation
centerline uses portal endpoints one unit on either side of the border. The
second opening on each border lets both outer provinces connect to the inner
province on this existing square map.

Army orders, garrison reinforcements, rally centers and scouts all use the same
shortest-route graph. Within a province movement is direct; crossing a border
requires an owned gate corridor. The sanctuary province still requires both
gates. The selected march's route preview follows the actual waypoint path.

Losing access cancels an outward ordinary order or rally, and recalls an outbound
scout. Return-home orders may use corridors without gate ownership, so stranded
armies and scouts can always get home. Movement conserves speed across multiple
waypoints within a tick and supports travel in both directions through a passage.
This is a province/portal graph, not a full terrain navmesh, obstacle avoidance,
formation collision or a redesigned radial kingdom map.

## Saves, packages and verification

Build 0.12.0 uses protocol 9 and schema 7. Schemas 1–6 migrate with versioned
archives. Migrated cities begin with local discovery; old omniscient maps do not
become fully explored maps. Discovery, scout reports and active scout missions
persist. Restart resumes scouts, while ordinary orders/rallies retain the previous
pause/interruption rules. Time remains paused while the server is closed.

Pull main, stop old servers and rebuild **Thrones of Myth → Build Windows
Playtest**. Both `navigation.mjs` and `exploration.mjs` are bundled. No Unity or
Node installation is needed by players using the generated Windows package.

Automated coverage includes corridor crossings in both directions, movement
speed, gate loss, garrison/rally routes, report immutability, allied vision,
membership changes, snapshot/HTTP privacy, recall and saved-state recovery.
Unity compilation, fog rendering, shader inclusion, scout visuals and native
Windows packaging still require local verification.
