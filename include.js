function getColor(r) {
	if (r == 0) {
		return "user-black";
	} else if (r < 1200) {
		return "user-gray";
	} else if (r < 1400) {
		return "user-green";
	} else if (r < 1600) {
		return "user-cyan";
	} else if (r < 1900) {
		return "user-blue";
	} else if (r < 2100) {
		return "user-violet";
	} else if (r < 2400) {
		return "user-orange";
	} else if (r < 3000) {
		return "user-red";
	} else {
		return "user-legendary";
	}
}

function isDigit(c) {
	return '0'.charCodeAt(0) <= c.charCodeAt(0) && c.charCodeAt(0) <= '9'.charCodeAt(0);
}

function isLetter(c) {
	return c.toLowerCase() != c.toUpperCase() || c == "'";
}

function User(name, handle) {
	this.name = name;
	this.handle = handle;
	this.rating = 1500;
	
	this.str = function() {
		return "(" + this.name + " " + this.handle + " " + this.rating.toString() + ")";
	}
}

function Team(name) {
	this.name = name;
	this.users = [];
	
	this.addUser = function(user) {
		this.users.push(user);
	}
	
	this.sortUsers = function() {
		this.users.sort(function(a, b) {
			if (a.name < b.name) {
				return -1;
			} else if (a.name > b.name) {
				return 1;
			}
			return 0;
		});
	}
	
	this.subsetOfUsers = function(ids) {
		var res = "";
		for (var id of ids) {
			if (res != "") {
				res += ";";
			}
			res += this.users[id].name;
		}
		return res;
	}
	
	this.str = function() {
		var res = "";
		for (var user of this.users) {
			if (res != "") {
				res += ", ";
			}
			res += user.str();
		}
		return this.name + ": " + res;
	}
}