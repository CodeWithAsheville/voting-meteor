//////////////////////////////
//
//	Global methods for interacting with Meteor usersin our app.
//
//////////////////////////////

User = {};

// Look up a user in `Meteor.users()` and return it.
// Throws an execption if the user specified is not valid.
// Use this so we get a consistent error message on lookup failure.
//
// You can pass a userId or a user object.
// NOTE: this does NOT check the `Meteor.user()`!
User.findUserOrDie = function(user){
	if (typeof user === "string") user = Meteor.users.findOne(user);
	if (!user) {
		throw new Meteor.Error("authentication-no-user", "User not found.");
	}
	return user;
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
//	- null		: the logged in user
//	- string	: user with that userId
//	- otherwise we assume you've passed a valid user and we'll simply return it.
//
// Returns `undefined` if no such user found (or no-one logged in).
User.getUser = function(user) {
	if (user) {
		if (typeof user === "string") return Meteor.users.findOne(user);
		return user;
	}
	return Meteor.user();
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
	return user.roles && user.roles.contains("admin");
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


// Some routine is attempting to modify a user's record.
// Make sure that either:
//		- the logged in user is updating their own record, or
//		- the logged in user is an admin
// Pass a more descriptive error message if desired.
User.dieIfNotMeOrAdmin = function(user, message) {
	user = Meteor.getUser(user);
	if (user && (user._id === Meteor.userId() || User.isAdmin(user))) return true;

	if (!message) message = "You cannot edit data for another user.";
	throw new Meteor.Error("authentication-not-you",  message);
}



// Some routines will only work on the current user's record,
// unless the logged in user is an admin, in which case they can operate on anything.
// Pass in a `userId` and get the user in question back.
//TODOC
User.getUserToUpdate = function(userId, errorMessage) {
	throwIfNotLoggedIn();

	// If not specified, assume we're operating on our own user record.
	if (!userId) return Meteor.user();

	// Find the user in question, bailing if not found.
	var user = Meteor.users.findOne(userId);
	if (!user) throw new Meteor.Error("authentication-no-user", "User not found.");

	// If the userId is for the logged in user, we're OK.
	var loggedInUserId = Meteor.userId();
	if (userId === loggedInUserId) return user;

	// if the logged in user is an administrator, we're OK
	if (User.isAdmin(loggedInUserId)) return user;

	// not cool, man!
	if (!errorMessage) errorMessage = "You cannot edit data for another user.";
	throw new Meteor.Error("authentication-not-you", errorMessage);
}
