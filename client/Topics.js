//////////////////////////////
//
//	topics template
//
//////////////////////////////
Template.topics.helpers({

});


//////////////////////////////
//
//	topicItem template
//
//////////////////////////////
Template.topicItem.helpers({
	creationTime : function() {
		return this.created.getTime();
	},

	// Does the logged in user own this topic?
	isOwnTopic: function() {
		return this.authorId === Meteor.userId();
	},

	// Have we already voted for this topic?
	hasAlreadyVoted : function() {
		// `this` is the topic

		// get the ids of topics this user has voted for
		var user = Meteor.user();
		var votes = (user && user.topics ? user.topics.votes : null);
		if (!votes || votes.length === 0) return false;

		// check if that contains the topic id
		return votes.indexOf(this._id) > -1;
	},
});

Template.topicItem.events({
	"click .upvote" : function(e) {
		e.preventDefault();
		Meteor.call("upvoteTopic", this._id, function(error, result) {
			if (error) {
				throwError(error.reason);
			}
		});
	}
});

//////////////////////////////
//
//	topicPage template
//
//////////////////////////////
Template.topicPage.helpers({
	comments : function() {
		// `this` is the topic
		return TopicComments.find({topicId: this._id});
	}
});



//////////////////////////////
//
//	createTopic template
//
//////////////////////////////
Template.createTopic.events({
	'submit form': function(e) {
		e.preventDefault();

		// Get data from the form
		var topic = {
			url: $(e.target).find('[name=url]').val(),
			title: $(e.target).find('[name=title]').val()
		};

		var errors = validateTopic(topic);
		if (errors.title || errors.url) {
			return Session.set("createTopicErrors", errors);
		}

		// Call a custom method on the server to insert.
		Meteor.call("createTopic", topic, function(error, result) {
			// display error to user if there's a problem and abort
			if (error) {
				return throwError(error.reason);
			}

			// if a topic with the specified url already exists, let them know
			if (result.topicExists) {
				throwError("This link has already been topiced.");
			}
			Router.go("topicPage", {_id:result._id});
		});
	},

	// Cancel button.
	"click .cancel":function(e) {
		// `this` is the existing topic
		e.preventDefault();
		var currentTopicId = this._id;
		Router.go("topics");
	}
});

// Clear errors when we create the creatTopic form.
Template.createTopic.created = function() {
	Session.set("createTopicErrors", {});
}

// Show errors as necessary in the createTopic form.
Template.createTopic.helpers({
	errorMessage: function(field) {
		return Session.get("createTopicErrors")[field];
	},
	errorClass : function(field) {
		return (Session.get("createTopicErrors")[field] ? "has-error" : "");
	}
});


//////////////////////////////
//
//	editTopic template
//
//////////////////////////////
Template.editTopic.events({
	// Save button.
	'submit form': function(e) {
		// NOTE: `this` is the existing topic
		e.preventDefault();

		var currentTopicId = this._id;
		var topicProperties = {
			url 	: $(e.target).find("[name=url]").val(),
			title	: $(e.target).find("[name=title]").val()
		};

		var errors = validateTopic(topicProperties);
		if (errors.title || errors.url) {
			return Session.set("editTopicErrors", errors);
		}

		// Tell the server to update the record
		Topics.update(currentTopicId, {$set:topicProperties}, function(error) {
			// display error
			if (error) {
				throwError(error.reason);
			}
			else {
				Router.go("topicPage", {_id:currentTopicId});
			}
		});
	},

	// Cancel button.
	"click .cancel":function(e) {
		// `this` is the existing topic
		e.preventDefault();
		var currentTopicId = this._id;
		Router.go("topicPage", {_id:currentTopicId});
	},

	// Delete button.
	"click .delete":function(e) {
		// `this` is the existing topic
		e.preventDefault();
		if (confirm("Delete this topic?")) {
			var currentTopicId = this._id;
			Topics.remove(currentTopicId);
			Router.go("topics");
		}
	}
});

// Clear errors when we create the creatTopic form.
Template.editTopic.created = function() {
	Session.set("editTopicErrors", {});
}

// Show errors as necessary in the editTopic form.
Template.editTopic.helpers({
	errorMessage: function(field) {
		return Session.get("editTopicErrors")[field];
	},
	errorClass : function(field) {
		return (Session.get("editTopicErrors")[field] ? "has-error" : "");
	}
});
