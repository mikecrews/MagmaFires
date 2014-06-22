MagmaFires 1.1
================

/fires on, /fires off - turn this plugin on or off
/fires furnace - enable/disable furnaces for all actions
/fires campfire - enable/disable campfires for all actions
/fires restrict <steamID> - only empty fires owned by <steamID> ignite at dusk
/fires clear - remove material in all eligible fires on the server

(hidden command '/fires verbose' toggles on/off Verbose Logging)

Campfires and Furnaces are supported.  Fires must be placed on a Structure part.
The Structure must have 2 or more parts at the time the Fire is deployed onto it.
A Foundation alone is not enough to register the Fire as being deployed onto a Structure.
A Foundation and a pillar is OK.  Once the Fire is deployed, you can remove the Pillar,
if all you want to light at night is a Fire on a Foundation.

Enough Wood to last the night is added to every Fire. Only Fires that are empty, or have only 
the charcoal from last night, are given Wood and ignited.

If you don't want to give Wood to players' empty Fires every night, restrict MagmaFires to a
SteamID whose Fires have been deployed out of the players' reach.  Campfires need about 1/4 the
amount of Wood as do Furnaces to last until dawn.

TODO:
- Support multiple ID's for restricting ignition (sooner)
- Staggered ignition - fires will come on one at a time over a few Rust minutes (sooner)
- Fuel-less ingition (sooner)
- Deploy fires at ignition time, remove when done (later)
- Fire Groups - add a fire to a group and fuel/light the group at once (later)
- General Deployable Item handling features - load inventory/clear inventory/destroy deployable objects (later)
- Choreographed fire handling routines (much later)

BUGS:
- Sometimes it will attempt to load fires again that have just been loaded and ignited. This has no 
effect but to run code uselessly.  Fires with any item other than last night's charcoal are
not loaded, nor ignited twice.  Adds extra lines from verbose logging.  Working on a fix.


