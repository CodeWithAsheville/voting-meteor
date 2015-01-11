//////////////////////////////
//
//	Main router configuration.
//
//////////////////////////////
Router.configure({
	layoutTemplate 		: "layout",
	loadingTemplate		: "loading",
	notFoundTemplate 	: "notFound"
	// waitOn : function(){ [Meteor.subscribe("topics")]}
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
