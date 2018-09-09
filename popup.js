var lastLoaded = 0;

function toString(number, needLength) {
	var result = '';
	while (number != 0 || result.length < needLength) {
		result += (number % 10).toString();
		number /= 10;
		number >>= 0;
	}
	result = result.split("").reverse().join("");
	return result;
}

function getTime(date) {
	if (date == 0) {
		return 'never';
	}
	date = new Date(date);
	var result = toString(date.getDate(), 2) + '.' + toString(date.getMonth() + 1, 2) + '.' + toString(date.getFullYear(), 4) + ', ';
	result += toString(date.getHours(), 2) + ':' + toString(date.getMinutes(), 2) + ':' + toString(date.getSeconds(), 2);
	return result;
}

function updateLastLoaded() {
	chrome.extension.sendRequest(['lastLoaded'], function(data) {
		lastLoaded = data['lastLoaded'];
		var elem = document.getElementById('lastLoaded');
		elem.innerHTML = 'Last update of all users: ' + getTime(lastLoaded) + '.';
	});
}

updateLastLoaded();
setInterval(function() { updateLastLoaded(); }, 3000);
	
function stopOnThisSite() {
	var elem = document.getElementById("2");
	if (elem.innerHTML == "Disable on this site") {
		chrome.extension.sendRequest(['blockSite', 'current'], function(data) {
		});
		elem.innerHTML = "Enable on this site";
	} else {
		chrome.extension.sendRequest(['unblockSite', 'current'], function(data) {
		});
		elem.innerHTML = "Disable on this site";
	}
}

function stopEverywhere() {
	var elem = document.getElementById("3");
	if (elem.innerHTML == "Disable everywhere") {
		chrome.extension.sendRequest(['blockSite', 'all'], function(data) {
		});
		elem.innerHTML = "Enable everywhere";
	} else {
		chrome.extension.sendRequest(['unblockSite', 'all'], function(data) {
		});
		elem.innerHTML = "Disable everywhere";
	}
}

function changeShowingType() {
	chrome.extension.sendRequest(['updateShowingType'], function(data) {
	});
}

function setShowingType() {
	chrome.extension.sendRequest(['getShowingType'], function(data) {
		var showingType = data['showingType'];
		if (showingType == 0) {
			document.getElementById("showingType0").checked = true;
		} else {
			document.getElementById("showingType1").checked = true;
		}
	});
}

function setDisableSites() {
	chrome.extension.sendRequest(["checkSite", ["current"]], function(data) {
		if (data['blocked']) {
			document.getElementById("2").innerHTML = "Enable on this site";
		} else {
			document.getElementById("2").innerHTML = "Disable on this site";
		}
	});
	chrome.extension.sendRequest(["checkSite", ["all"]], function(data) {
		if (data['blocked']) {
			document.getElementById("3").innerHTML = "Enable everywhere";
		} else {
			document.getElementById("3").innerHTML = "Disable everywhere";
		}
	});
}

function writeError(error) {
	document.getElementById("error").innerHTML = error;
}

function clearError() {
	writeError("");
}

function addNewTeam() {
	clearError();
	var users = [];
	var handles = [];
	for (var i = 1; i <= 5; ++i) {
		var user = document.getElementById("user" + i.toString()).value;
		var handle = document.getElementById("handle" + i.toString()).value;
		if (user != "" && handle != "") {
			users.push(user);
			handles.push(handle);
		}
	}
	var teamName = document.getElementById("teamName").value;
	if (teamName == "") {
		writeError("Team name shouldn't be empty");
	} else if (users.length > 0) {
		var allHandles = handles.join(";");
		$.getJSON("http://codeforces.com/api/user.info?handles=" + allHandles, function(data) {
			var team = {}, teamWithLink = {};
			for (var i = 0; i < users.length; ++i) {
				team["name" + (i + 1).toString()] = users[i]; 
				team["handle" + (i + 1).toString()] = handles[i]; 
				teamWithLink["name" + (i + 1).toString()] = users[i]; 
				teamWithLink["handle" + (i + 1).toString()] = "=HYPERLINK(\"https://codeforces.com/profile/" + handles[i] + "\"; \"" + handles[i] + "\")"; 
			}
			team["teamName"] = document.getElementById("teamName").value;
			teamWithLink["teamName"] = document.getElementById("teamName").value;
			//$.post("https://script.google.com/macros/s/AKfycbx7l3M86xfk9znJWdskgJBPklB73yRJ40FGFAnxDQrEC-eKiBlc/exec", team);
			$.post("https://script.google.com/macros/s/AKfycbx7l3M86xfk9znJWdskgJBPklB73yRJ40FGFAnxDQrEC-eKiBlc/exec", teamWithLink);
		}).fail(function(jqxhr, textStatus, error) {
			writeError("User not found on the codeforces, try again");
		});
	} else {
		writeError("There should be at least one user in the team");
	}
}

function changeTeam() {
	var filledData = {};
	for (var id of ["teamName", "user1", "user2", "user3", "user4", "user5", "handle1", "handle2", "handle3", "handle4", "handle5"]) {
		filledData[id] = document.getElementById(id).value;
	}
	chrome.extension.sendRequest(["setFilledData", filledData], function(data) {
	});
}

function setFilledData() {
	chrome.extension.sendRequest(["getFilledData"], function(filledData) {
		for (var id of ["teamName", "user1", "user2", "user3", "user4", "user5", "handle1", "handle2", "handle3", "handle4", "handle5"]) {
			if (id in filledData) {
				document.getElementById(id).value = filledData[id];
			}
		}
	});
}

function reloadTeams() {
	chrome.extension.sendRequest(["reloadTeams"], function(data) {
	});
}

setShowingType();
setDisableSites();
setFilledData();

document.addEventListener('DOMContentLoaded', function () {	
	document.getElementById("2").addEventListener('click', stopOnThisSite);
	document.getElementById("3").addEventListener('click', stopEverywhere);
	document.getElementById("showingType0").addEventListener('change', changeShowingType);
	document.getElementById("showingType1").addEventListener('change', changeShowingType);
	document.getElementById("addTeamButton").addEventListener('click', addNewTeam);
	document.getElementById("reloadTeams").addEventListener('click', reloadTeams);
	for (var id of ["teamName", "user1", "user2", "user3", "user4", "user5", "handle1", "handle2", "handle3", "handle4", "handle5"]) {
		document.getElementById(id).addEventListener('input', changeTeam);
	}
});