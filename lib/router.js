//////////////////////////////
//
//	Main router configuration.
//
//////////////////////////////
Router.configure({
	layoutTemplate 		: "layout",
	loadingTemplate		: "loading",
	notFoundTemplate 	: "notFound",
	waitOn : function(){ return [
			// subscribe to all topics
			Meteor.subscribe("topics"),
			// subscribe to all notices for the logged-in user
			Meteor.subscribe("notifications")
	] }
});


//////////////////////////////
//
//	Routes
//
//////////////////////////////

// Show list of topics








// Homepage
// Default:  show list of posts sorted by newest
Router.route('/', {});
