// MagmaFires for Magma for Rust
// Lights all empty fires at nightfall with enough Wood to burn until dawn.
// by mikec (gomagma forums) MC MC (Steam)
// :: In Rust We Trust :: Plugin Dev server for Magma :: net.connect 23.239.114.234:28025 ::
var MagmaFires = {
	Name: 'MagmaFires',
	Version: 1.1,
	Hour: 18.8,
	dsGet: function (key) { return DataStore.Get(this.Name, key); },
	dsAdd: function (key, val) { DataStore.Add(this.Name, key, val); },
	set Verbose (flag) { this.dsAdd('Verbose', flag); },
	get Verbose () { if(this.dsGet('Verbose') == 'on') { return true; } return false; },
	set Furnace (flag) { this.dsAdd('Furnace', flag); },
	get Furnace () { if(this.dsGet('Furnace') == 'on') { return true; } return false; },
	set Campfire (flag) { this.dsAdd('Campfire', flag); },
	get Campfire () { if(this.dsGet('Campfire') == 'on') { return true; } return false; },
	get On () { if(this.dsGet('State') == 'on') { return true; } return false; },
	set On (flag) { this.dsAdd('State', flag); },
	get Off () { if(this.dsGet('State') == 'on') { return false; } return true; },
	get Restrict () { return String(this.dsGet('Restrict')); },
	set Restrict (steamid) { this.dsAdd('Restrict', String(steamid)); },
	get RestrictValid () { if(parseInt(this.Restrict, 10) > 76561197960265728 && String(this.Restrict).length == 17) { return true; } return false; },
	get Ignite () { if(this.dsGet('Ignite') == 'active') { return true; } return false; },
	set Ignite (flag) { this.dsAdd('Ignite', flag); }
};
(function () {
	var firename = { Furnace: 'Furnace(Clone)', Campfire: 'Campfire(Clone)' };
	
	function rustHour(rustDayOrNight) {
		return parseFloat(rustDayOrNight) / 12;
	}
	
	function howMuchWood(kind, rustNight) {
		var woodPerMin;
		switch(kind) {
		case firename.Campfire: 
			woodPerMin = 0.625;
			break;
		default:
			woodPerMin = 2.5;
			break;
		}
		return Math.round(woodPerMin * rustHour(rustNight) * 10.7); // 18.8 to 5.5
	}
	
	function validSteamID(id) {
		if(parseInt(id, 10) > 76561197960265728 && String(id).length == 17) { return true; }
		return false;
	}
	
	function vLog(msg) { 
		if(MagmaFires.Verbose) {
			Plugin.Log('vLog' + MagmaFires.Name, msg);
		}
	}
	
	function doLoop(f, arr) {
		for(var i=0; i < arr.length; i++) {
			f(arr[i]);
		}
	}
	
	function getMsgFrom(player) {
		return function(msg) { player.MessageFrom(MagmaFires.Name, msg); };
	}
	
	function showHelp(player) {
		var msgFrom = getMsgFrom(player);
		var statusDetail = 'Fires are';
		statusDetail += MagmaFires.On ? ' ON' : ' OFF';
		statusDetail += MagmaFires.RestrictValid ? ' For fires owned by ' + MagmaFires.Restrict : ' For all owner\'s fires.';
		statusDetail += ' Furnaces' + (MagmaFires.Furnace ? ' ON.' : ' OFF.') + ' Campfires' + (MagmaFires.Campfire ? ' ON.' : ' OFF.');
		statusDetail += MagmaFires.Verbose ? ' vLog ON.' : '';
		var helpText = [
		'/fires on, /fires off - turn this plugin on or off',
		'/fires furnace - enable/disable furnaces for all actions',
		'/fires campfire - enable/disable campfires for all actions',
		'/fires restrict <steamID> - only empty fires owned by <steamID> ignite at dusk',
		'/fires clear - remove material in all eligible fires on the server',
		statusDetail
		];
		doLoop(msgFrom, helpText);
	}
	
	function rustHourMsec(rustDayOrNight) {
		return parseFloat(rustDayOrNight) / 12 * 60 * 1000;
	}
		
	function timerInterval(rustNight) {
		return parseFloat(rustNight) / 72 * 60 * 1000; // 10 night-time rust minutes
	}
	
	function getXYZ(obj) {
		var xyz = '';
		xyz += String(System.Math.Round(obj.transform.position.x, 1)) + ',';
		xyz += String(System.Math.Round(obj.transform.position.y, 1)) + ',';
		xyz += String(System.Math.Round(obj.transform.position.z, 1));
		return xyz;
	}
	
	function addIfEligible(params, object) {
		for(var kind in firename) {
			if(String(object.name) == firename[kind] && MagmaFires[kind]) {
				if(MagmaFires.RestrictValid) {
					if(MagmaFires.Restrict == String(object.ownerID)) {
						params.Add(object);
						return;
					}
				} else {
					params.Add(object);
					return;
				}
			} 
		}
	}

	function getFires() {
		var type, depobjs;
		if(Util.TryFindType('DeployableObject', type)) {
			depobjs = UnityEngine.Resources.FindObjectsOfTypeAll(type);
		}
		var fires = new ParamsList();
		for(var i=0; i < depobjs.Length; i++) {
			addIfEligible(fires, depobjs[i]);
		}
		return fires.ToArray();
	}
	
	function getFireInventory(fire) {
		var inv;
		switch(String(fire.name)) {
		case firename.Campfire:
			inv = fire.GetComponent('CampfireInventory');
			break;
		default:
			inv = fire.GetComponent('Inventory');
			break;
		}
		return inv;
	}
	
	function clearFires() {
		var fires = getFires();
		var count=0, inv;
		for(var i=0; i < fires.Length; i++) {
			inv = getFireInventory(fires[i]);
			inv.Clear();
			count++;
		}
		return count; 
	}
	
	function getDictionary() {
		var type, dictionary;
		if(Util.TryFindType('ResourceTypeItemDataBlock', type)) {
			dictionary = Facepunch.Bundling.LoadAll(type);
		}
		return dictionary;
	}

	function getDataBlock(id) {
		var dict = getDictionary();
		for(var i=0; i < dict.Length; i++) {
			if(String(dict[i].uniqueID) == id) {
				vLog('Got ' + dict[i].name + ', id=' + String(dict[i].uniqueID));
				return dict[i];
			}
		}
	}
	
	function loadFireIfEmpty(fire, fuel, waste, rustNight) {
		var wasLoaded = false;
		var inv = getFireInventory(fire);
		var remove = inv.FindItem(waste);
		var fuelamt = howMuchWood(fire.name, rustNight);
		switch(inv.occupiedSlotCount) {
		case 0:
			if(fuelamt >= 1) { inv.AddItemAmount(fuel, fuelamt); }
			wasLoaded = true;
			vLog('Added ' + fuelamt + ' ' + fuel.name + ' to ' + fire.name + ' ' + String(fire.ownerID) + '@' + getXYZ(fire));
			break;
		case 1:
			if(remove === null) {
				vLog('Something besides ' + waste.name + ' is in ' + fire.name + ' ' + String(fire.ownerID) + '@' + getXYZ(fire));
			} else {
				inv.RemoveItem(remove);  // remove last night's charcoal
				vLog('Removed ' + waste.name + ' from ' + fire.name + ' ' + String(fire.ownerID) + '@' + getXYZ(fire));
				if(fuelamt >= 1) { inv.AddItemAmount(fuel, fuelamt); }
				wasLoaded = true;
				vLog('Added ' + fuelamt + ' ' + fuel.name + ' to ' + fire.name + ' ' + String(fire.ownerID) + '@' + getXYZ(fire));
			}
			break;
		default:
			vLog('Something besides ' + waste.name + ' is in ' + fire.name + ' ' + String(fire.ownerID) + '@' + getXYZ(fire));
			break;
		}
		return wasLoaded;
	}

	function loadFuelToFires(fires, rustNight) {
		var charcoalID = '775271474', woodID = '1359255965';
		var fuel = getDataBlock(woodID);
		var waste = getDataBlock(charcoalID);
		vLog('loadFuelToFires: fires=' + fires.Length + ', fuel=' + String(fuel) + ', waste=' + String(waste));
		var loaded = new ParamsList();
		for(var i=0; i < fires.Length; i++) {
			if(String(fires[i]._carrier.name).indexOf('(Clone)') == -1) {
				vLog('Carrier undefined. Skipped ' + fires[i].name + ' ' + String(fires[i].ownerID) + '@' + getXYZ(fires[i]) + ' on the ground.');
				continue; 
			}
			if(loadFireIfEmpty(fires[i], fuel, waste, rustNight)) {
				loaded.Add(fires[i]); 
			}
		}
		return loaded.ToArray();
	}
	
	function igniteFires(fires) {
		vLog('Igniting ' + fires.Length + ' fires.');
		var fire, fbbl;
		for(var i=0; i < fires.Length; i++) {
			fire = fires.Get(i);
			fbbl = fire.GetComponent('FireBarrel');
			fbbl.SetOn(true);
			vLog('Ignited fire ' + String(fire.ownerID) + '@' + getXYZ(fire));
		}
	}
		
	MagmaFires.Help = function(player) { showHelp(player); };
	
	MagmaFires.StartIgnitionTimer = function(rustNight) {
		var timerName = 'MagmaFiresIgnition';
		var interval = timerInterval(rustNight);
		try { Plugin.KillTimer(timerName); } catch(err) { vLog('KillTimer (probably harmless): ' + err); }
		vLog('Starting Timer ' + timerName + ' on ' + interval + 'ms');
		DataStore.Flush('DestroyMode'); // deactivate destroy mode to avoid ka-boom
		Plugin.CreateTimer(timerName, interval).Start();	
	};
	
	MagmaFires.IgnitionTime = function(rustDay, rustNight, rustTime) {
		if(rustTime > MagmaFires.Hour) {
			if(MagmaFires.Ignite) {
				vLog('Removed Ignite active flag.');
				MagmaFires.Ignite = 'inactive';
			}
			return false; // too late
		}
		if((MagmaFires.Hour - rustTime) > 1) {
			return false; // not close enough for fine time check
		}
		var nightMsec, dayMsec;
		if(rustTime >= 18) {
			nightMsec = rustHourMsec(rustNight) * (MagmaFires.Hour - rustTime);
			dayMsec = 0;
		} else {
			nightMsec = rustHourMsec(rustNight) * (MagmaFires.Hour - 18);
			dayMsec = rustHourMsec(rustDay) * (18 - rustTime);
		}
		if(nightMsec + dayMsec < timerInterval(rustNight)) {
			return true;
		}
		vLog('About ' + Math.floor((MagmaFires.Hour - rustTime) * 60) + ' Rust minutes to go.');
		return false;
	};
	
	MagmaFires.Command = function(player, args) {
		if(!player.Admin) { return true; } // pretend command doesn't exist
		if(args.Length < 1) { return false; }  // show help on return
		var msgFrom = getMsgFrom(player);
		switch(args[0]) {
		case 'on':
		case 'off':			
			MagmaFires.On = args[0];
			msgFrom(MagmaFires.On ? 'ON. Fires ignite automatically at dusk and burn through the night.' : 'OFF. No fires ignite automatically.');
			return true;
		case 'restrict':
			if(args.Length != 2) {
				return false;
			}
			MagmaFires.Restrict = args[1];
			msgFrom(MagmaFires.RestrictValid ? 'MagmaFires restricted to those owned by SteamID ' + MagmaFires.Restrict + '.' : 'Restrict is off, or invalid SteamID. Same thing.');
			return true;
		case 'clear':
			var	num = clearFires();
			msgFrom('Emptied ' + num + ' fires' + (MagmaFires.RestrictValid ? ' owned by ' + MagmaFires.Restrict : ' for all owners') + '.');
			return true;
		case 'verbose':
			if(MagmaFires.Verbose) {
				MagmaFires.Verbose = 'off';
			} else {
				MagmaFires.Verbose = 'on';
			}
			msgFrom(MagmaFires.Verbose ? 'Verbose Log ON.' : 'Verbose Log OFF.');
			return true;
		case 'furnace':
			if(MagmaFires.Furnace) {
				MagmaFires.Furnace = 'off';
			} else {
				MagmaFires.Furnace = 'on';
			}
			msgFrom(MagmaFires.Furnace ? 'Will light Furnaces at dusk.' : 'Will Not light Furnaces at dusk.');
			return true;
		case 'campfire':
			if(MagmaFires.Campfire) {
				MagmaFires.Campfire = 'off';
			} else {
				MagmaFires.Campfire = 'on';
			}
			msgFrom(MagmaFires.Campfire ? 'Will light Campfires at dusk.' : 'Will Not light Campfires at dusk.');
			return true;
		default:
			return false;
		}
	};
	
	MagmaFires.IgniteFires = function(rustNight) {
		vLog('Ignition time has arrived.');
		MagmaFires.Ignite = 'active';
		Util.Log(System.DateTime.Now.ToString() + ' MagmaFiresIgnitionCallback:IgniteFires');	
		vLog('Getting fires' + (MagmaFires.RestrictValid ? ' owned by ' + MagmaFires.Restrict : ' for all owners') + '.');
		var fires = getFires();
		var loadedFires = loadFuelToFires(fires, rustNight);
		igniteFires(loadedFires);
	};
	
}());

function On_ServerInit() {
	try { DataStore.Load(); } catch(ignore) {}
}

function On_PluginInit() {
	MagmaFires.StartIgnitionTimer(World.NightLength);
}

function On_Command(Player, cmd, args) {
	if(cmd == 'fires') {
		if(!MagmaFires.Command(Player, args)) {
			MagmaFires.Help(Player);
		}
	}
}

function MagmaFiresIgnitionCallback() {
	if(MagmaFires.Off) { 
		return; // do nothing until fires are on
	}
	if(!MagmaFires.IgnitionTime(World.DayLength, World.NightLength, World.Time)) { 
		return; // not time yet
	}
	MagmaFires.IgniteFires(World.NightLength);
}
