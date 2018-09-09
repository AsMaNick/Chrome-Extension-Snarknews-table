/*  Created in August 2017
	Updated in February 2018
	
	by
	Matvej Aslandukov    (@BigBag at codeforces.com),
	
	This extension comes with absolutely NO WARRANTY,
	use it on your own risk.
	
	No rights reserved.
*/

var handleWithUser = 0;
var userWithHandle = 1;
var teams = [];
var teamIds = {};
var allNames = new Set();
var showingType = handleWithUser;

function loadAllNicks() {
	chrome.extension.sendRequest(['data'], function(data) {
		teams = data['teams'];
		teamIds = data['teamIds'];
		showingType = data['showingType'];
		allNames = new Set();
		for (var team of teams) {
			for (var user of team.users) {
				allNames.add(user.name);
			}
		}
		updateNames();
	});
}

chrome.extension.sendRequest(['setCurrentSite', document.location.href], function(data) {
});
chrome.extension.sendRequest(['checkSite', [document.location.href, 'all']], function(data) {
	if (!data['blocked']) {
		if (!data['blocked']) {
			loadAllNicks();
		}
	}
});

function updateName(user) {
	var name = user.name;
	var handle = user.handle;
	if (showingType == userWithHandle) {
		name = user.handle;
		handle = user.name;
	}
	var result = "<a href=http://www.codeforces.com/profile/" + user.handle + " title=\"" + name + "\" class=\"" + getColor(user.rating) + "\">";
	if (handle.length > 17) {
		hanlde = hanlde.substr(0, 16) + "..." + hanlde.substr(hanlde.length - 1);
	}
	if (getColor(user.rating) == "user-legendary") {
		result += "<span class=\"legendary-user-first-letter\">" + handle[0] + "</span>";
		result += handle.substr(1);
	} else {
		result += handle;
	}
	result += "</a>";
	return result;
}

function getWinProbability(ra, rb) {
    return 1.0 / (1.0 + Math.pow(10.0, (rb - ra) / 400.0));
}

function getTeamRating(teamRatings) {
    var left = 1;
    var right = 11111;
    for (var it = 0; it < 100; ++it) {
        var r = (left + right) / 2.0;
        var rWinsProbability = 1.0;
        for (var i = 0; i < teamRatings.length; ++i) {
            rWinsProbability *= getWinProbability(r, teamRatings[i]);
		}
        var rating = Math.log10(1 / (rWinsProbability) - 1) * 400 + r;
        if (rating > r) {
            left = r;
		}
        else {
            right = r;
		}
    }
    return parseInt((left + right) / 2.0);
}

function getColoredRating(rating) {
	var result = "<a class=\"" + getColor(rating) + "\">";
	if (getColor(rating) == "user-legendary") {
		result += "<span class=\"legendary-user-first-letter\">" + rating.toString()[0] + "</span>";
		result += rating.toString().substr(1);
	} else {
		result += rating.toString();
	}
	result += "</a>";
	return result;
}

function listOfTeamsSnark(all_teams) {
	var res = '<br>';
	res += "<table class = 'standings'>";
	res += "<tr class='stand0'>";
	res += "<th class='stnd'> №";
	res += "<th class='stnd'> Team Name";
	res += "<th class='stnd'> Rating";
	res += "<th class='stnd'> Real place";
	res += "</tr>";
	all_teams.sort(function(a, b) {
		if (a[0] > b[0]) {
			return -1;
		} else if (a[0] < b[0]) {
			return 1;
		} else {
			return a[2] - b[2];
		}
	});
	for (var i = 0; i < all_teams.length; ++i) {
		cls = (1 ^ (((i / 10) >> 0) % 2)) * 2 + i % 2;
		res += "<tr class='stand0" + cls.toString() + "' style='text-align:center'>";
		res += "<td class='stnd'> " + (i + 1).toString() + ". </td>";
		res += "<td class='stnd'> " + all_teams[i][1] + " </td>";
		res += "<td class='stnd'> " + getColoredRating(all_teams[i][0] >> 0) + " </td>";
		res += "<td class='stnd'> " + all_teams[i][2] + " </td>";
		res += "</tr>";
	}
	res += "</table>";
	return res;
}

function getTeamId(allUsers) {
	allUsers.sort();
	var s = "";
	for (var user of allUsers) {
		if (s != "") {
			s += ";";
		}
		s += user;
	}
	if (teamIds[s] != undefined) {
		return teamIds[s];
	}
	return -1;
}

function modifyStandings(index, elem) {
	console.log(allNames);
	var text = elem.innerHTML, newText = "";
	text = elem.outerHTML;
	var last = 0;
	var position = text.indexOf("<tr");
	var allTeams = [];
	while (true) {
		for (var s of ["<tr", "<td", "<td", ">"]) {
			position = text.indexOf(s, position + 1);
			if (position == -1) {
				break;
			}
		}
		if (position == -1) {
			break;
		}
		++position;
		while (last < position) {
			newText += text[last];
			++last;
		}
		var lastName = "";
		var allUsers = [];
		var startPosition = position;
		var newTeam = "", rating = 0;
		while (position < text.length) {
			if (isLetter(text[position])) {
				lastName += text[position];
			} else {
				lastName = lastName;
				if (allNames.has(lastName)) {
					allUsers.push(lastName);
				}
				lastName = "";
				if (text[position] == "<") {
					break;
				}
			}
			newTeam += text[position];
			++position;
		}
		var teamId = getTeamId(allUsers);
		if (teamId != -1) {
			newTeam = "";
			var team = teams[teamId];
			var usedIds = new Array(team.users.length);
			var teamRatings = [];
			position = startPosition;
			while (position < text.length) {
				if (isLetter(text[position]) || (text[position] == " " && lastName != "")) {
					lastName += text[position];
				} else {
					var spaceIndex = lastName.indexOf(" "), addSpace = "", fullLastName = lastName;
					if (spaceIndex != -1) {
						if (spaceIndex + 1 == lastName.length) {
							lastName = lastName.slice(0, -1);
							addSpace = " ";
						} else {
							lastName = lastName.substring(spaceIndex + 1);
						}
					}
					if (allNames.has(lastName)) {
						for (var userId = 0; userId < team.users.length; ++userId) {
							var user = team.users[userId];
							if (!usedIds[userId] && lastName == user.name) {
								lastName = updateName(user);
								teamRatings.push(user.rating);
								usedIds[userId] = 1;
								break;
							}
						}
					} else {
						lastName = fullLastName;
					}
					newTeam += lastName + addSpace;
					lastName = "";
					if (text[position] == "<") {
						var addBracket = "";
						if (newTeam[newTeam.length - 1] == ")" || newTeam[newTeam.length - 1] == "]") {
							addBracket = newTeam[newTeam.length - 1];
							newTeam = newTeam.slice(0, -1);
						}
						rating = getTeamRating(teamRatings);
						newText += newTeam;
						newText += ", total = " + getColoredRating(rating) + addBracket;
						newTeam += addBracket;
						break;
					}
					newTeam += text[position];
				}
				++position;
			}
			last = position;
		}
		if (newTeam != "") {
			allTeams.push([rating, newTeam, allTeams.length + 1]);
		}
	}
	newText += text.substr(last);
	var href = document.location.toString();
	if (href.indexOf("yandex") == -1) {
		newText += listOfTeamsSnark(allTeams);
	}
	elem.outerHTML = newText;
}

function updateNames() {
	$(".standings").each(modifyStandings);
}