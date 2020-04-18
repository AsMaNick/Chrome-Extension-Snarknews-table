/*	Created in August 2017
	Updated in September 2018
	
	by
	Matvej Aslandukov (@BigBag at codeforces.com),
	
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
		loadAllNicks();
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
		handle = handle.substr(0, 16) + "..." + handle.substr(handle.length - 1);
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

function listOfTeamsSnark(allTeams) {
	var res = '<br>';
	res += "<table class='standings'>";
	res += "<tr class='stand0'>";
	res += "<th class='stndExt'> №";
	res += "<th class='stndExt'> Team Name";
	res += "<th class='stndExt'> Rating";
	res += "<th class='stndExt'> Real place";
	res += "</tr>";
	allTeams.sort(function(a, b) {
		if (a[0] > b[0]) {
			return -1;
		} else if (a[0] < b[0]) {
			return 1;
		} else {
			return a[2] - b[2];
		}
	});
	var groupColor = 1, groupClass = 0;
	for (var i = 0; i < allTeams.length; ++i) {
		if (i && getColor(allTeams[i][0]) != getColor(allTeams[i - 1][0])) {
			groupColor ^= 1;
			groupClass = 0;
		} else {
			groupClass ^= 1;
		}
		res += "<tr class='standExt" + (2 * groupColor + groupClass).toString() + "' style='text-align:center'>";
		res += "<td class='stndExt'> " + (i + 1).toString() + ". </td>";
		res += "<td class='stndExt'> " + allTeams[i][1] + " </td>";
		res += "<td class='stndExt'> " + getColoredRating(allTeams[i][0] >> 0) + " </td>";
		res += "<td class='stndExt'> " + allTeams[i][2] + " </td>";
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

function isYandex() {
	var href = document.location.toString();
	return href.indexOf("yandex") != -1;
}

function updateLastName(lastName) {
    if (allNames.has(lastName)) {
        return lastName;
    }
    var spaceIndex = lastName.lastIndexOf(" ");
    if (spaceIndex != -1) {
        if (allNames.has(lastName.substring(spaceIndex + 1))) {
            lastName = lastName.substring(spaceIndex + 1);
        } else if (allNames.has(lastName.substring(0, spaceIndex))) {
            lastName = lastName.substring(0, spaceIndex);
        }
    }
    return lastName;
}

function modifyStandings(index, elem) {
	var text = elem.innerHTML, newText = "";
	if (!isYandex()) {
		text = elem.outerHTML;
	}
	var last = 0;
	var position = text.indexOf("<tr");
	var allTeams = [];
	var lookFor = ["<tr", "<td", "<td", ">"];
	if (isYandex()) {
		lookFor = ["<tr", "<span class=\"user__first-letter\">", "</span>"];
	}
	text = text.split('<font color="#ff0000">').join('<font color="#000000" style="font-weight: bold">')
	while (true) {
		for (var s of lookFor) {
			position = text.indexOf(s, position + 1);
			if (position == -1) {
				break;
			}
		}
		if (position == -1) {
			break;
		}
		if (!isYandex() && text.substr(position + 1, 5) == '<font') { // for PTZ red color
			position = text.indexOf('>', position + 1);
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
			if (isLetter(text[position]) || (text[position] == " " && lastName != "") || (text[position] == "-" && lastName != "" && isLetter(text[position + 1]))) {
				lastName += text[position];
			} else {
				lastName = lastName;
				while (lastName[lastName.length - 1] == " ") {
					lastName = lastName.slice(0, -1);
				}
                lastName = updateLastName(lastName);
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
				if (isLetter(text[position]) || (text[position] == " " && lastName != "") || (text[position] == "-" && lastName != "" && isLetter(text[position + 1]))) {
					lastName += text[position];
				} else {
					var addSpace = "", fullLastName = lastName;
					while (lastName[lastName.length - 1] == " ") {
						addSpace = " ";
						lastName = lastName.slice(0, -1);
					}
					var spaceIndex = lastName.lastIndexOf(" ");
					lastName = updateLastName(lastName);
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
	if (!isYandex()) {
		newText += listOfTeamsSnark(allTeams);
		elem.outerHTML = newText;
	} else {
		elem.innerHTML = newText;
	}
}

function updateNames() {
	$(".standings").each(modifyStandings);
}