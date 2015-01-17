//////////////////////////////
//
//	generic helpers
//
//////////////////////////////

// Is the current user logged in?
UI.registerHelper("isLoggedIn", function() {
	return (typeof Meteor.userId() === "string");
});

UI.registerHelper("isAdmin", function(user) {
	var user = Meteor.user();
	console.log(user._id);

	// PRC Testing for a specific ID
	if(user._id == 'z4Svc2ZeK7dvT5zFo'){
		console.log('success admin');
		return true;
	}
	return user.isAdmin();
});

// Simple pluralizer, eg: 	`{{pluralize votes "vote" "votz"}}`
// If you don't pass the `plural` argument, we'll just add `s` to the `singular`.
UI.registerHelper("pluralize", function(count, singular, plural) {
	if (typeof count !== "number") count = 0;
	if (count === 1) return "1 "+singular;
	if (!plural) plural = singular + "s";
	return count + " " +plural;
});

UI.registerHelper("dateTime", function(date) {
	if (!date || !date.toLocaleDateString) return "";
	return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
});

UI.registerHelper("trimString", function(string, length){
	if (string.length > length){
		return string.substring(0, length) + "...";
	}
	return string;
});


//////////////////////////////
//
//	layout template
//
//////////////////////////////
Template.layout.helpers({});



//////////////////////////////
//
//	errors template
//
//////////////////////////////
Template.errors.helpers({
	errors: function() {
		return Errors.find();
	}
});


//////////////////////////////
//
//	error template
//
//////////////////////////////

// Delete the error 3 seconds after it's displayed (after it fades out).
Template.error.rendered = function() {
	var error = this.data;
	Meteor.setTimeout(function () {
		Errors.remove(error._id);
	}, 3000);
};
