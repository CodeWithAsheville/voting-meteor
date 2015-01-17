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

// Show single topic
Router.route("/topics/:_id", {
  name: "topicPage",
  waitOn : function() {
  	return [
  		Meteor.subscribe("topic", this.params._id),
  		Meteor.subscribe("commentsForTopic", this.params._id)
  	];
  },
  data: function(){ return Topics.findOne(this.params._id); }
});

// create a new topic
Router.route("/create", {name: "createTopic"});

// Edit a topic.
Router.route("/topics/:_id/edit", {
	name : "editTopic",
	waitOn : function() {
  		return Meteor.subscribe("singleTopic", this.params._id);
	},
	data : function(){return Topics.findOne(this.params._id); }
});


// Topics sorted by top votes
Router.route("/best", {
	name : "topTopics",
	template : "topics",
	waitOn 	: function() {
		return Meteor.subscribe("topics", {	sort : {voteCount:-1, submitted: -1, _id: -1} });
	}
});


// Default view -- show all topics sorted by date
Router.route("/", {
	name	: "topics",
	waitOn 	: function() {
		return Meteor.subscribe("topics", {	sort : {submitted: -1, _id: -1} });
	}
});


