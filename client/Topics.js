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
var itemHelpers = {
	creationTime : function() {
		return this.created.getTime();
	},

	// Does the logged in user own this topic?
	isOwnTopic: function() {
		return this.authorId === Meteor.userId();
	},

	// Does the logged in user own this topic?
	isOwnTopicOrAdmin: function() {
		return this.authorId === Meteor.userId() || User.isAdmin(Meteor.user() );
	},

	// Have we already voted for this topic?
	hasAlreadyVoted : function() {
		// `this` is the topic

		// get the ids of topics this user has voted for
		var user = Meteor.user();
		var votes = (user && user.topics ? user.topics.votes : null);
		if (!votes || votes.length === 0) return false;

		// check if list contains the topic id
		return votes.indexOf(this._id) > -1;
	},

	// Have we already subscribed to the topic?
	hasAlreadySubscribed : function() {
		// `this` is the topic

		// get the ids of topics this user has voted for
		var user = Meteor.user();
		var subscriptions = (user && user.topics ? user.topics.subscriptions : null);
		if (!subscriptions || subscriptions.length === 0) return false;

		// check if list contains the topic id
		return subscriptions.indexOf(this._id) > -1;
	},

	tagsList : function(charLimit, showNone) {
		var tags = (this.tags || []).join(", ");
		if (!tags) return (showNone ? "(none)" : "");
		if (charLimit && tags.length > charLimit) tags = tags.substr(0, (charLimit-3)) + "...";
		return tags;
	}
};
Template.topicItem.helpers(itemHelpers);
Template.singleTopic.helpers(itemHelpers);

// In the below, `this` is the existing topic.
var itemEvents = {
	"click .upvote" : function(e) {
		e.preventDefault();
		Meteor.call("upvoteTopic", this._id, function(error, result) {
			if (error) {
				throwError(error.reason);
			}
		});
	},

	"click .remove" : function(e) {
		e.preventDefault();
		if (!confirm("Delete this topic?")) return;

		Meteor.call("removeTopic", this._id, function(error, result) {
			if (error) return throwError(error.reason);
			// go to the list of topics
			Router.go("topics");
		});
	},

	"click .subscribe" : function(e) {
		e.preventDefault();
		Meteor.call("subscribeToTopic", this._id);
	},

	"click .unsubscribe" : function(e) {
		e.preventDefault();
		Meteor.call("unsubscribeFromTopic", this._id);
	}
}
Template.topicItem.events(itemEvents);
Template.singleTopic.events(itemEvents);

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
//	topicFormControls template
//
//////////////////////////////

// Tags for which we have checkboxen
var knownTags = [
	"Animals",
	"Budget",
	"Civic Jobs",
	"Crime",
	"Elections",
	"Housing",
	"Inspections",
	"Parking",
	"Parks",
	"Public Transportation",
	"Water",
	"Zoning"
];
Template.topicFormControls.helpers({
	hasTag : function(tagName) {
		var tags = this.tags || [];
		return (tags.indexOf(tagName) > -1);
	},

	otherTags : function() {
		var args = [ (this.tags || []) ].concat(knownTags);
		return _.without.apply(_, args).join(", ");
	}
});

// Clear errors when we create the form.
Template.topicFormControls.created = function() {
	Session.set("topicForm", {});
}

// Show errors as necessary in the form.
Template.topicFormControls.helpers({
	errorMessage: function(field) {
		return Session.get("topicForm")[field];
	},
	errorClass : function(field) {
		return (Session.get("topicForm")[field] ? "has-error" : "");
	}
});

// Return values
Template.topicFormControls.getTopicFormValues = function($form) {
	var properties = {
		description 	: $form.find("[name=description]").val(),
		title			: $form.find("[name=title]").val(),
		referenceUrl	: $form.find("[name=referenceUrl]").val()
	};

	// Get tags from checkboxen and otherTags field
	var tags = TopicTags.splitTags($form.find("[name=otherTags]").val());
	$form.find("input.tag[type=checkbox]").each(function(index, checkbox) {
		if (checkbox.checked) tags.push(checkbox.getAttribute("value"));
	});
	properties.tags = tags.sort();

	return properties;
}


//////////////////////////////
//
//	createTopic template
//
//////////////////////////////
Template.createTopic.events({
	'submit form': function(e) {
		e.preventDefault();

		// Get data from the form
		var properties = Template.topicFormControls.getTopicFormValues($(e.target));

		var errors = Topics.validateAttributes(properties);
		if (errors.title || errors.description) {
			return Session.set("topicForm", errors);
		}

		// Call a custom method on the server to insert.
		// `result` is topic id
		Meteor.call("createTopic", properties, function(error, result) {
			// display error to user if there's a problem and abort
			if (error) {
				return throwError(error.reason);
			}
			Router.go("topicPage", {_id:result._id});
		});
	},

	// Cancel button.
	"click .cancel":function(e) {
		// `this` is the existing topic
		e.preventDefault();
		Router.go("topics");
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
		var properties = Template.topicFormControls.getTopicFormValues($(e.target));

		var errors = Topics.validateAttributes(properties);
		if (errors.title || errors.description) {
			return Session.set("editTopicErrors", errors);
		}

		// Call a custom method on the server to insert.
		Meteor.call("editTopic", currentTopicId, properties, function(error, result) {
			// display error to user if there's a problem and abort
			if (error) {
				return throwError(error.reason);
			}
			Router.go("topicPage", {_id:result._id});
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
	"click .remove":function(e) {
		// `this` is the existing topic
		e.preventDefault();
		if (!confirm("Delete this topic?")) return;

		Meteor.call("removeTopic", this._id, function(error, result) {
			if (error) return throwError(error.reason);
			// return to the list of topic
			Router.go("topics");
		});
	}
});


//////////////////////////////
//
//	mergeTopics template
//
//////////////////////////////
Template.mergeTopics.events({
	// Save button.
	'submit form': function(e) {
		// NOTE: `this` is the existing topic
		e.preventDefault();

		var parentTopicId = this._id;
		var childTopicId = $(e.target).find("[name=childTopicId]").val().trim();

		// if field is empty, go back to topic's page
		if (!childTopicId) {
			return throwError("Please enter a topic id.");
		}

		Meteor.call("mergeTopics", parentTopicId, childTopicId, function(error, result) {
			// display error to user if there's a problem and abort
			if (error) {
				return throwError(error.reason);
			}
			// go to parent topic
			Router.go("topicPage", {_id:parentTopicId});
		});
	},

	// Cancel button.
	"click .cancel":function(e) {
		// `this` is the existing topic
		e.preventDefault();
		var currentTopicId = this._id;
		Router.go("topicPage", {_id:currentTopicId});
	},
});

// Clear errors when we create the creatTopic form.
Template.mergeTopics.created = function() {
	Session.set("editTopicErrors", {});
}

// Show errors as necessary in the editTopic form.
Template.mergeTopics.helpers({
	errorMessage: function(field) {
		return Session.get("editTopicErrors")[field];
	},
	errorClass : function(field) {
		return (Session.get("editTopicErrors")[field] ? "has-error" : "");
	}
});
