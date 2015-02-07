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
			Meteor.subscribe("notifications"),
			// extra data for the logged-in user
			Meteor.subscribe("userData")
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
			Meteor.subscribe("commentsForTopic", this.params._id),
		];
	},
	data: function(){ return Topics.findOne(this.params._id);	}
});

// create a new topic
Router.route("/create", {name: "createTopic"});

// create a new topic
Router.route("/instructions", {name: "instructions"});

// Edit a topic.
Router.route("/topics/:_id/edit", {
	name : "editTopic",
	waitOn : function() {
  		return Meteor.subscribe("topic", this.params._id);
	},
	data : function(){return Topics.findOne(this.params._id); }
});

// Merge a topic.
Router.route("/topics/:_id/merge", {
	name : "mergeTopics",
	waitOn : function() {
		return [
			  		Meteor.subscribe("topic", this.params._id),
			  		Meteor.subscribe("topics", {})
		  		];

	},
	data : function(){
		return {
					topics: Topics.find({}, {sort : {created: -1}}),
					parent_topic: Topics.findOne(this.params._id)
			 };

	}
});


// Topics sorted by top votes
Router.route("/best", {
	name : "topTopics",
	template : "topics",
	waitOn 	: function() {
		return [
					Meteor.subscribe("topics", {sort: {voteCount:-1, created:-1} })
				];
	},
	data : function() {
		return {
					topics: Topics.find({}, {sort: {voteCount:-1, created:-1} }),
					viewName	: "topTopics",
					viewTitle	: "Top topics"
				};
	}
});

// Show all topics in a tag cloud
Router.route("/tags", {
	name	: "allTopics",
	template : "topicTags",
	waitOn 	: function() {
		return Meteor.subscribe("topicTags");
	},
	data : function() {
		return {
					allTags: TopicTags.find()
				};
	}
});


// Topics by tag
Router.route("/tags/:tags", {
	name	: "topicsForTag",
	template : "topics",
	waitOn 	: function() {
		return [
			Meteor.subscribe("topicTags"),
			Meteor.subscribe("topicsForTag", this.params.tags)
		]
	},
	data : function() {
		var tags = this.params.tags.split(",");
		return {
					topics: Topics.find({ tags : {$in : tags } },
										 {sort : {created: -1}}
										),
					viewName	: "topicsForTag",
					viewTitle	: "Topics for "+tags.join(", "),
					tags		: tags,
					allTags		: TopicTags.find()
				};
	}
});


// Default view -- show all topics sorted by date
Router.route("/", {
	name	: "topics",
	waitOn 	: function() {
		return Meteor.subscribe("topics", {	sort : {created: -1} });
	},
	data : function() {
		return {
					topics: Topics.find({}, {sort : {created: -1}}),
					viewName	: "topics",
					viewTitle 	: "All topics"
				};
	}
});



//////////////////////////////
//
//	Route helpers
//
//////////////////////////////


// Show the "notFound" template if no data found for postPage.
Router.onBeforeAction('dataNotFound', {only: 'topicPage'});

// Don't allow certain actions unless logged in.
function requireLogin() {
	if (!Meteor.user()) {
		if (Meteor.loggingIn()) {
			this.render(this.loadingTemplate);
		} else {
			this.render("accessDenied");
		}
	} else {
		this.next();
	}
};
Router.onBeforeAction(requireLogin, {only:"createPost"});
