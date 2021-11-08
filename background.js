var teams = [];
var teamIds = {};
var loaded = false;
var loading = false;
var lastLoaded = 0;
var showingType = 0;
var blockedSites = new Set();
var currentSite = "";
var filledData = {};

function makeAllRequests(startTeam) {
    var maxTeams = 150;
    var allHandles = "";
    for (var teamId = startTeam; teamId < teams.length && teamId < startTeam + maxTeams; ++teamId) {
        for (var user of teams[teamId].users) {
            allHandles += user.handle + ";";
        }
    }
    console.log(allHandles);
    // recieving user ratings
    $.getJSON("http://codeforces.com/api/user.info?handles=" + allHandles, function(data) {
        var teamId = startTeam, userId = 0;
        for (var user of data.result) {
            if (typeof user.rating === "undefined") {
                teams[teamId].users[userId].rating = 0;
            } else {
                teams[teamId].users[userId].rating = user.rating;
            }
            teams[teamId].users[userId].handle = user.handle;
            ++userId;
            if (userId == teams[teamId].users.length) {
                ++teamId;
                userId = 0;
            }
        }
        // recieving team_ids
        for (var teamId = startTeam; teamId < teams.length && teamId < startTeam + maxTeams; ++teamId) {
            var team = teams[teamId];
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
        if (startTeam + maxTeams < teams.length) {
            makeAllRequests(startTeam + maxTeams);
        } else {
            loaded = true;
            loading = false;
            lastLoaded = Date.now();
        }
    }).fail(function(jqxhr, textStatus, error) {
        loading = false;
    });
}

function loadTeams() {
    if (loading) {
        return;
    }
    $.getJSON("https://sheets.googleapis.com/v4/spreadsheets/1KPV1mk9sCnpimqQVcbaZdCQlwq9pxL86uUERQCTsAp8/values/AllTeams?alt=json&key=AIzaSyDbLmGMZKFkc-R9mWCRBrn50ZCyhFpYsLA", function(data) {
        loaded = false;
        loading = true;
        // recieving teams
        allTeams = data.values;
        teams = [];
        for (var i = 1; i < allTeams.length; ++i) {
            var teamJson = allTeams[i];
            var teamName = teamJson[1];
            var names = [];
            var handles = [];
            for (var j = 2; j + 1 < teamJson.length; j += 2) {
                names.push(teamJson[j]);
                handles.push(teamJson[j + 1]);
            }
            
            var team = new Team(teamName);
            for (var j = 0; j < names.length; ++j) {
                if (names[j] != "") {
                    team.addUser(new User(names[j], handles[j]));
                }
            }
            team.sortUsers();
            teams.push(team);
        }
        teamIds = {};
        makeAllRequests(0);
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
