//////////////////////////////
//
//	Topics table
//
//////////////////////////////

// Topic records.
Topics = new Mongo.Collection("topics");

// Don't allow direct manipulation of topics from the client.
Topics.deny({
	insert	: function(){return false},
	update	: function(){return false},
	remove	: function(){return false}
});


//////////////////////////////
//	Publications
//////////////////////////////

if (Meteor.isServer) {

	// Publish all topics to the client.
	// You can pass options like "sort" and "limit".
	Meteor.publish("topics", function(options) {
		return Topics.find({}, options);
	});

	// Publish a single topic
	Meteor.publish("topic", function(topicId) {
		return Topics.find(topicId);
	});
}




//////////////////////////////
//	Create new topic
//////////////////////////////
Meteor.methods({
	createTopic : function(attributes) {
		var user = User.getLoggedInUserOrDie();
		// create the topic
		return Topics.createTopic(user, attributes);
	}
})

// Internal routine to create a topic.  `user` MUST be passed.
// NOTE: throws if attributes are invalid.
Topics.createTopic = function(user, attributes) {
	// Make sure we've got a valid user.
	user = User.getUserOrDie(user);

	// Validate attributes passed in.
	Topics.validateAttributesOrDie(attributes);

	// Make sure there's not already a topic with this title.
	Topics.dieIfTopicExists(attributes);

	// Add user data and creation time to the topic.
	var topic = {
		title	 		: attributes.title,				// title from form
		description		: attributes.description,		// description from form

		authorId		: user._id,						// userId of user
		author			: User.getNameForUser(user),	// name of user for display
		created			: new Date(),					// creation date

		status			: "unknown",					// is this data already available?
		tags			: [],							// list of tags for the topic.  See `Topics.updateTags()`
		commentCount	: 0,							// number of comments
		voteCount		: 0,							// number of votes
		linkCount		: 0,							// number of links about this description
		mergedWith		: []							// list of other topics merged with this one
	};

	// insert the record
	var topicId = Topics.insert(topic);

	// update tags separately
	if (attributes.tags) Topics.updateTags(topicId, attributes.tags);

	// Subscribe the user to notices for this topic.
	Topics.subscribeToTopic(user, topicId);

	// Vote for the post (they created it, after all!)
	Topics.upvoteTopic(user, topicId);

	// Return the topic id
	return topicId;
}


//////////////////////////////
//	Update topic
//////////////////////////////

Meteor.methods({
	editTopic : function(topicId, attributes) {
		// Make sure we're logged in.
		var user = User.getLoggedInUserOrDie();

		// Validate attributes passed in.  It's OK if they didn't pass everything.
		Topics.validateAttributesOrDie(attributes, "NULL_OK");

		// Make sure we're only submitting the fields we can legally change.
		var otherFields = _.without(Object.keys(attributes), "title", "description", "tags");
		if (otherFields.length > 0) {
			throw new Meteor.Error("topics-bad-input", "Invalid fields specified: "+otherFields);
		}

		var success = Topics.editTopic(topicId, attributes, user);
// TODO... better error handling???
		if (!success) {
			throw new Meteor.Error("topics-update-error", "There was an error updating that topic.");
		}

		return success;
	}
});


// Internal routine to edit a topic.
// Does not do argument sanitation, but does make sure our data set remains consistent.
// If you pass a `user`, we'll die if that user isn't the owner of the record (or not an admin).
// Throws error if something goes wrong.
Topics.editTopic = function(topicId, attributes, user) {
	// we can only edit our own topics (unless we're an admin)
	if (user) Topics.dieIfNotTopicOwner(topicId, user);

	// make sure there's not another topic with the same title.
	Topics.dieIfTopicExists(attributes, topicId);

	// handle tags separately
	var tags = attributes.tags;
	delete attributes.tags;

	// update everything other than tags
	var success = Topics.update(topicId, {$set : attributes});

	if (success) {
		// update tags separately to maintain TopicTags
		if (tags) Topics.updateTags(topicId, tags);

		// Notify any subscribers
		Notifications.notifyTopicChanged(user, topicId);
	}

	return success;
}


//TODO: add an explicit update method for this since we'll need to update the tags!


//////////////////////////////
//	Remove topic
//////////////////////////////

Meteor.methods({
	removeTopic : function(topicId) {
		// Make sure we're logged in.
		var user = User.getLoggedInUserOrDie();

		// get the original topic
		var topic = Topics.getTopicOrDie(topicId);

		// we can only remove our own topics (unless we're an admin)
		Topics.dieIfNotTopicOwner(topic, user);

		var success = Topics.removeTopic(topic);
		if (!success) {
			throw new Meteor.Error("topics-remove-error", "There was an error removing that topic.");
		}
		return success;
	}
});


// Internal routine to remove a topic.
// You should ALWAYS call this to make sure other data structures are updated properly.
Topics.removeTopic = function (topic) {
	// handle topic id or topic object
	topic = Topics.getTopicOrDie(topic);

	// Remove first
	var success = Topics.remove(topic._id);

	// If that worked
	if (success) {
//console.info("removing tags", topic.tags);
		// remove tags from the global list of tags.
		TopicTags.tagsRemovedFromTopic(topic.tags);

//console.info("removing subscriptions");
		// Remove all subscriptions to the topic.
		Topics.unsubscribeAll(topic._id);

//console.info("removing votes");
		// Remove all votes for the topic.
		Topics.removeAllVotes(topic._id);
	}

	return success;
}


//////////////////////////////
//	Add a vote to the topic.
//////////////////////////////
Meteor.methods({
	upvoteTopic : function(topicId) {
		// Make sure we're logged in.
		var user = User.getLoggedInUserOrDie();

		// make sure we can find the topic.
		var topic = Topics.getTopicOrDie(topicId);

		// Use predefined routine to vote for the topic.
		// Returns falsy value if user has already voted for the topic.
		var success = Topics.upvoteTopic(user, topicId);
		if (!success) {
			// NOTE: log the error but don't report to the user
			console.warn("NOTE: method upvoteTopic("+topicId+") called for "+user._id+" when they've already voted for it!");
		}
		return success;
	},

	downvoteTopic : function(topicId) {
		// Make sure we're logged in.
		var user = User.getLoggedInUserOrDie();

		// Use predefined routine to downvote.
		// Returns falsy value if user has not already voted for the topic.
		var success = Topics.downvoteTopic(user, topicId);
		if (!success) {
			// NOTE: log the error but don't report to the user
			console.warn("NOTE: method downvoteTopic("+topicId+") called for "+user._id+" but they haven't voted for it!");
		}
		return success;
	}
});

// Add a vote for some user for some topic.
// Returns `false` if the user has already voted for the topic.
// NOTE: doesn't do any validation!
Topics.upvoteTopic = function (user, topicId) {
	// make sure we can find the topic.
	var topic = Topics.getTopicOrDie(topicId);

	var success = Meteor.users.update(
		{
			_id 			: user._id,
			"topics.votes"	: {$nin: [topicId]}	// reject if topic already present
		},
		{
			$addToSet		: {"topics.votes": topicId}
		}
	);
//	console.warn("upvoteTopic :",user.username," topic:", topicId," returned ",success);

	// Update the topic's voteCount
	if (success) {
		Topics.update(topicId, { $inc : {voteCount: 1} });
	}

	return success;
}


// Remove a vote for some user for some topic.
// Returns `false` if the user has NOT already voted for the topic.
// NOTE: doesn't do any validation!
Topics.downvoteTopic = function (user, topicId) {
	// make sure we can find the topic.
	var topic = Topics.getTopicOrDie(topicId);

	var success = Meteor.users.update(
		{
			_id 			: user._id,
			"topics.votes"	: {$in: [topicId]}	// reject if topic NOT already present
		},
		{
			$pull			: {"topics.votes": topicId}	// remove topic
		}
	);

	// Update the topic's voteCount
	if (success) {
		Topics.update(topicId, { $inc : {voteCount: -1} });
	}

	return success;
}


// Remove all votes for some topic for all users (eg: when topic has been deleted).
Topics.removeAllVotes = function(topicId) {
	return Meteor.users.update(
		// only update if user has already subscribed
		{
			"topics.votes"	: {$in: [topicId]}	// skip if topic not already present
		},
		{
			$pull	: {"topics.votes": topicId}
		}
	);
}

// Return userIds of all voters for a topic.
// NOTE: only works on the server.
Topics.getVoters = function(topicId) {
	var voters = Meteor.users.find({"topics.votes" : {$in : [topicId] } }, {fields: {_id:1} } )
							 .fetch();
	return _.pluck(voters, "_id");
}


//////////////////////////////
//	Topic subscription (for receiving notices)
//////////////////////////////
Meteor.methods({

	// Subscribe to a topic.
	subscribeToTopic : function(topicId) {
		var user = User.getLoggedInUserOrDie();
		return Topics.subscribeToTopic(user, topicId);
	},

	// UNsubscribe from a topic.
	unsubscribeFromTopic : function(topicId) {
		var user = User.getLoggedInUserOrDie();
		return Topics.unsubscribeFromTopic(user, topicId);
	}
});



// Subscribe some `user` to a topic.
// Returns falsy value if they were already subscribed.
// NOTE: doesn't do any validation!
Topics.subscribeToTopic = function(user, topicId) {
	// throw if we can't find the topic
	var topic = Topics.getTopicOrDie(topicId);

	return Meteor.users.update(
		// only update if user hasn't already subscribed
		{	_id						: user._id,
			"topics.subscriptions"	: {$nin: [topicId]}	// skip if topic already present
		},
		{
			$addToSet	: {"topics.subscriptions": topicId}
		}
	);
}

// Unsubscribe some user from a topic.
// Returns falsy value if they were already subscribed.
// NOTE: doesn't do any validation!
Topics.unsubscribeFromTopic = function(user, topicId) {
	// throw if we can't find the topic
	var topic = Topics.getTopicOrDie(topicId);

	return Meteor.users.update(
		// only update if user has already subscribed
		{	_id						: user._id,
			"topics.subscriptions"	: {$in: [topicId]}	// skip if topic not already present
		},
		{
			$pull	: {"topics.subscriptions": topicId}
		}
	);
}

// Unsubscribe some topic for all users (eg: when topic has been deleted).
// NOTE: this is called AFTER the topic has been removed.
Topics.unsubscribeAll = function(topicId) {
	return Meteor.users.update(
		// only update if user has already subscribed
		{
			"topics.subscriptions"	: {$in: [topicId]}	// skip if topic not already present
		},
		{
			$pull	: {"topics.subscriptions": topicId}
		}
	);
}

// Return userIds of all subscribers for a topic.
// NOTE: only works on the server.
Topics.getSubscribers = function(topicId) {
	var subscribers = Meteor.users.find({"topics.subscriptions" : {$in : [topicId] } }, {fields: {_id:1} })
								  .fetch();
	return _.pluck(subscribers, "_id");
}


//////////////////////////////
//	Tag maintenance.
//////////////////////////////

// Update a list of tags in the database for some topic.
// Maintains the global list of `TopicTags`.
Topics.updateTags = function(topicId, newTags) {
	newTags = TopicTags.splitTags(newTags);

	var topic = Topics.getTopicOrDie(topicId);
	var currentTags = topic.tags || [];

	var tagsToAdd	 = _.difference(newTags, currentTags);
	var tagsToRemove = _.difference(currentTags, newTags);
//console.info("updateTags()  : ",newTags);
//console.info("Tags to add   : ",tagsToAdd);
//console.info("Tags to remove: ",tagsToRemove);

	if (tagsToAdd.length === 0 && tagsToRemove.length === 0) return;

	// Update the topic itself
	Topics.update(topicId, {$set: {tags:newTags}});

	// Update the TopicTags table
	TopicTags.tagsAddedToTopic(tagsToAdd);
	TopicTags.tagsRemovedFromTopic(tagsToRemove);
}



//////////////////////////////
//	Utility functions
//////////////////////////////

// Return a topic or throw an error if it can't be found.
Topics.getTopicOrDie = function(topicId) {
	var topic = Topics.findOne(topicId);
	if (!topic) throw new Meteor.Error("topics-no-topic", "Topic not found.");
	return topic;
}


// Throw an error if the `user` is not the original author of the topic,
//  or is not an Admin.  You can pass a user object or a userId.
Topics.dieIfNotTopicOwner = function(topic, user) {
	if (typeof topic === "string") topic = Topics.findOne(topic);
	user = User.getUser(user);
//	console.info("topic:",topic.authorId,"  user:",user._id);
	if (!topic || !user || (topic.authorId !== user._id && !User.isAdmin(user))) {
		throw new Meteor.Error("topics-not-yours", "You cannot edit topics created by someone else.");
	}
}

// Throw an error if the the topic is already defined.
// Pass `ignoreTopicId` and we'll skip the error if it matches the existing topic.
Topics.dieIfTopicExists = function(attributes, ignoreTopicId) {
	// only checking title
	if (!("title" in attributes)) return;

	var existingTopic = Topics.findOne({title:attributes.title});

	if (!existingTopic) return;
	if (existingTopic._id === ignoreTopicId) return;

	var errors = {title:"A topic with that name already exists."};
	throw new Meteor.Error("topics-duplicate-title", "A topic with this title already exists.", errors);
}

//////////////////////////////
//	Generic validation logic
//////////////////////////////

// Validate topic attributes.
// Returns an `errors` object with `field:"error message" if something is wrong.
// If everything is OK, `errors` will be an empty object.
Topics.validateAttributes = function(attributes, nullOK) {
	var errors = {};
	if (!attributes.title && !nullOK) {
		errors.title = "Please specify a title for this topic.";
	}

	if (!attributes.description && !nullOK)	{
		errors.description = "Please specify a description for this topic.";
	}
	return errors;
}

// Validate topic attributes, throwing an error if the something is wrong.
// Use this to get a consistent error message.
Topics.validateAttributesOrDie = function(attributes, nullOK) {
	var errors = Topics.validateAttributes(attributes, nullOK);
	if (Object.keys(errors).length === 0) return;
	throw new Meteor.Error("topics-invalid-arguments", "Invalid arguments", errors);
}
