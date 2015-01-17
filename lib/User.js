//////////////////////////////
//
//	Global methods for interacting with Meteor usersin our app.
//
//////////////////////////////

User = {};

// Subscription to get the custom user data for a user.
// NOTE: if you're logged in, this will merge the data with `Meteor.user()`.
if (Meteor.isServer) {
	Meteor.publish('userData', function() {
		// If not logged in, return data for a bogus user
		// TODO:  some way we can avoid this???
		if (!this.userId) return Meteor.users.find("BOGUS_ID");
		return Meteor.users.find(this.userId, {fields: {
			roles : 1,
			topics: 1
		}});
	});
}

// Make someone an admin user
User.makeAdmin = function(userId) {
	Meteor.users.update(
		{
			_id 			: userId,
			"roles"			: {$nin: ["admin"]}	// reject if role already present
		},
		{
			$addToSet	: { roles : "admin" }
		}
	);
}


// Return the logged-in user.
// Throw an execption if not logged in.
// Use this so we get a consistent message.
User.getLoggedInUserOrDie = function(){
	var user = Meteor.user();
	if (!user) {
		throw new Meteor.Error("authentication-log-in", "Please log in.");
	}
	return user;
}

// Return a user given one of the following:
//	- string	: user with that userId
//	- otherwise we assume you've passed a valid user and we'll simply return it.
//
// Returns a falsy value (generally `undefined`) if no user found.
User.getUser = function(user) {
	if (user) {
		if (typeof user === "string") return Meteor.users.findOne(user);
		return user;
	}
}

// Return a user as per `User.getUser()`.
// If no user found, throws an exception.
// Use this to get consistent error messages.
User.getUserOrDie = function(user) {
	user = User.getUser(user);
	if (!user) {
		throw new Meteor.Error("authentication-no-user", "User not found.");
	}
	return user;
}

// Is the specified user an administrator?
// You can pass a userId or a user record or null for the logged in user.
User.isAdmin = function(user) {
	user = User.getUser(user);
	if (!user) return false;
	return user.roles && user.roles.indexOf("admin") > -1;
}


// Get the "authorName" for a user:
//	- if they logged in via email, this is the bit before the "@"
// If you pass `userId`, we'll return their name.
// Otherwise we'll use the logged in user.
// You can pass a userId or a user record or null for the logged in user.
User.getNameForUser = function(user) {
	user = User.getUserOrDie(user);

	var name = user.username;
	if (!name && user.emails) {
		name = user.emails[0].address;
		// strip off the bit after the @
		name = name.substr(0, name.indexOf("@"));
	}
	if (!name) {
		throw new Meteor.Error("authentication-no-username", "Unable to figure out name for user: "+user._id);
	}
	return name;
}

