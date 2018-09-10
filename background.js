var teams = [];
var teamIds = {};
var loaded = false;
var loading = false;
var lastLoaded = 0;
var showingType = 0;
var blockedSites = new Set();
var currentSite = "";
var filledData = {};

function loadTeams() {
	if (loading) {
		return;
	}
	$.getJSON("https://spreadsheets.google.com/feeds/list/1KPV1mk9sCnpimqQVcbaZdCQlwq9pxL86uUERQCTsAp8/od6/public/values?alt=json", function(data) {
		loaded = false;
		loading = true;
		// recieving teams
		allTeams = data.feed.entry;
		teams = [];
		for (var i = 0; i < allTeams.length; ++i) {
			var teamJson = allTeams[i];
			var teamName = teamJson.gsx$teamname.$t;
			var names = [];
			var handles = [];
			names.push(teamJson.gsx$name1.$t);
			names.push(teamJson.gsx$name2.$t);
			names.push(teamJson.gsx$name3.$t);
			names.push(teamJson.gsx$name4.$t);
			names.push(teamJson.gsx$name5.$t);
			handles.push(teamJson.gsx$handle1.$t);
			handles.push(teamJson.gsx$handle2.$t);
			handles.push(teamJson.gsx$handle3.$t);
			handles.push(teamJson.gsx$handle4.$t);
			handles.push(teamJson.gsx$handle5.$t);
			
			var team = new Team(teamName);
			for (var j = 0; j < names.length; ++j) {
				if (names[j] != "") {
					team.addUser(new User(names[j], handles[j]));
				}
			}
			team.sortUsers();
			teams.push(team);
		}
		// recieving user ratings
		var allHandles = "";
		for (var team of teams) {
			for (var user of team.users) {
				allHandles += user.handle + ";";
			}
		}
		$.getJSON("http://codeforces.com/api/user.info?handles=" + allHandles, function(data) {
			var teamId = 0, userId = 0;
			for (var user of data.result) {
				teams[teamId].users[userId].rating = user.rating;
				teams[teamId].users[userId].handle = user.handle;
				++userId;
				if (userId == teams[teamId].users.length) {
					++teamId;
					userId = 0;
				}
			}
			
			// recieving team_ids
			teamIds = {};
			for (var teamId = 0; teamId < teams.length; ++teamId) {
				var team = teams[teamId];
				console.log(team.str());
				for (var i = 0; i < team.users.length; ++i) {
					for (var j = i + 1; j < team.users.length; ++j) {
						teamIds[team.subsetOfUsers([i, j])] = teamId;
						for (var k = j + 1; k < team.users.length; ++k) {
							teamIds[team.subsetOfUsers([i, j, k])] = teamId;
							for (var q = k + 1; q < team.users.length; ++q) {
								teamIds[team.subsetOfUsers([i, j, k, q])] = teamId;
								for (var w = q + 1; w < team.users.length; ++w) {
									teamIds[team.subsetOfUsers([i, j, k, q, w])] = teamId;
								}
							}
						}
					}
				}
				if (team.users.length == 1) {
					teamIds[team.subsetOfUsers([0])] = teamId;
				}
			}
			loaded = true;
			loading = false;
			lastLoaded = Date.now();
		}).fail(function(jqxhr, textStatus, error) {
			loading = false;
		});
	}).fail(function(jqxhr, textStatus, error) {
		loading = false;
	});
}

function getSite(request) {
	if (request == 'current') {
		return currentSite;
	}
	return request;
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if (request[0] == 'data') {
		var data = {};
		if (loaded) {
			data['teams'] = teams;
			data['teamIds'] = teamIds;
			data['showingType'] = showingType;
		} else {
			data['teams'] = [];
			data['teamIds'] = {};
			data['showingType'] = 0;
		}
		sendResponse(data);
	} else if (request[0] == 'lastLoaded') {
		var data = {'lastLoaded': lastLoaded};
		sendResponse(data);
	} else if (request[0] == 'updateShowingType') {
		showingType ^= 1;
	} else if (request[0] == 'getShowingType') {
		var data = {'showingType': showingType};
		sendResponse(data);
	} else if (request[0] == 'setCurrentSite') {
		currentSite = request[1];
	} else if (request[0] == 'blockSite') {
		blockedSites.add(getSite(request[1]));
	} else if (request[0] == 'unblockSite') {
		blockedSites.delete(getSite(request[1]));
	} else if (request[0] == 'checkSite') {
		var data = {'blocked': false};
		for (var site of request[1]) {
			if (blockedSites.has(getSite(site))) {
				data['blocked'] = true;
				break;
			}
		}
		sendResponse(data);
	} else if (request[0] == 'setFilledData') {
		filledData = request[1];
	} else if (request[0] == 'getFilledData') {
		sendResponse(filledData);
	} else if (request[0] == 'reloadTeams') {
		loadTeams();
	}
});

function checkNeedLoad() {
	var milliSecondsSinceLastLoad = (Date.now() - lastLoaded);
	if (milliSecondsSinceLastLoad > 6 * 60 * 60 * 1000) { // reload teams every 6 hours.
		loadTeams();
	}
}

loadTeams();
setInterval(function() { checkNeedLoad(); }, 10 * 60 * 1000); // try reload teams every 10 minutes
