//////////////////////////////
//
//	TopicComments table
//
//////////////////////////////

// Topic comment records.
TopicComments = new Mongo.Collection("topicComments");

// Don't allow direct manipulation of topics from the client.
TopicComments.deny({
	insert	: function(){return false},
	update	: function(){return false},
	remove	: function(){return false}
});


//////////////////////////////
//	Publications
//////////////////////////////

if (Meteor.isServer) {

	// Return all comments for a single topic.
	Meteor.publish("commentsForTopic", function(topicId) {
		return TopicComments.find({topicId:topicId});
	});
}



//////////////////////////////
//	Create new comment
//////////////////////////////
Meteor.methods({
	createTopicComment : function(topicId, attributes) {
		var user = User.getLoggedInUserOrDie();
		var commentId = TopicComments.createComment(topicId, attributes, user);
		return {
			_id : commentId
		};
	}
})

// Internal routine to create a comment.
TopicComments.createComment = function(topic, attributes, user, silent) {
	// Throw if user or topic not found.
	user = User.getUserOrDie(user);
	topic = Topics.getTopicOrDie(topic);

	// Make sure the fields we got are sufficient and valid.
	TopicComments.validateAttributesOrDie(attributes);

	var comment = {
		topicId		: topic._id,							// topic we're referencing
		comment		: attributes.comment,				// comment text

		authorId	: user._id,							// userId of commentor
		author		: User.getNameForUser(user),		// name of commentor
		created		: new Date()						// creation date
	}

	// Insert the record
	var commentId = TopicComments.insert(comment);

	if (commentId) {
		// Update the commentCount of the original topic
		Topics.update(topic._id, { $inc : {commentCount: 1} });

		// subscribe the user to the topic
		if (!silent) Topics.subscribeToTopic(user, topic._id);

		// Notify any subscribers
		if (!silent) Notifications.notifyTopicComment(user, topic._id, commentId, "created");
	}
	return commentId;
}



//////////////////////////////
//	Edit a comment
//////////////////////////////
Meteor.methods({
	editTopicComment : function(commentId, attributes) {
		var user = User.getLoggedInUserOrDie();

		// Validate attributes passed in.  It's OK if they didn't pass everything.
		Topics.validateAttributesOrDie(attributes, "NULL_OK");

		// Make sure we're only submitting the fields we can legally change.
		var otherFields = _.without(Object.keys(attributes), "comment", "topicId");
		if (otherFields.length > 0) {
			throw new Meteor.Error("topicComments-bad-input", "Invalid fields specified: "+otherFields);
		}

		TopicComments.editComment(commentId, attributes, user);
	}
});

// Internal routine to edit a comment.
// Does not do argument sanitation, but does make sure our data set remains consistent.
// If you pass a `user`, we'll die if that user isn't the owner of the record (or not an admin).
// Throws error if something goes wrong.
TopicComments.editComment = function(commentId, attributes, user) {
	// Forget it if the comment can't be found
	var comment = TopicComments.getCommentOrDie(commentId);

	// Forget it if the original topic can't be found
	var topic = Topics.getTopicOrDie(comment.topicId);

	// we can only edit our own topics (unless we're an admin)
	if (user) TopicComments.dieIfNotCommentOwner(commentId, user);

	// Go ahead and update
	var success = TopicComments.update(commentId, {$set: attributes});

	if (success) {
		// Notify any subscribers
		Notifications.notifyTopicComment(user, topic._id, commentId, "modified");
	}
	return success;
}


//////////////////////////////
//	Remove a comment
//////////////////////////////
Meteor.methods({
	removeTopicComment : function(commentId) {
		var user = User.getLoggedInUserOrDie();
		return TopicComments.removeComment(commentId, user);
	}
});

// Internal routine to remove a comment.
// Makes sure our data structures get updated correctly.
TopicComments.removeComment = function(comment, attributes, user) {
	// Forget it if the comment can't be found
	comment = TopicComments.getCommentOrDie(comment);

	// Forget it if the original topic can't be found
	var topic = Topics.getTopicOrDie(comment.topicId);

	// we can only edit our own topics (unless we're an admin)
	if (user) TopicComments.dieIfNotCommentOwner(comment._id, user);

	var success = TopicComments.remove(comment._id);
	if (success) {
		// Update the comment count of the original method
		Topics.update(topic._id, {$inc : { commentCount: -1 } });

	}

	return success;
}



//////////////////////////////
//	Utility functions
//////////////////////////////

// Return a comment or throw an error if it can't be found.
TopicComments.getCommentOrDie = function(commentId) {
	var comment = TopicComments.findOne(commentId);
	if (!comment) throw new Meteor.Error("topicComments-no-comment", "Comment not found.");
	return comment;
}


// Throw an error if the `user` is not the original author of the comment,
//  or is not an Admin.  You can pass a user object or a userId.
TopicComments.dieIfNotCommentOwner = function(comment, user) {
	if (typeof comment === "string") comment = TopicComments.findOne(comment);
	user = User.getUser(user);
	//	console.info("comment:",comment.authorId,"  user:",user._id);
	if (!comment || !user || (comment.authorId !== user._id && !User.isAdmin(user))) {
		throw new Meteor.Error("topicComments-not-yours", "You cannot edit comments created by someone else.");
	}
}

// Return all comments for a topic as an array.
TopicComments.getCommentsForTopic = function(topic) {
	topic = Topics.getTopicOrDie(topic);
	return TopicComments.find({topicId : topic._id}).fetch();
}


//////////////////////////////
//	Generic validation logic
//////////////////////////////

// Validate topic attributes.
// Returns an `errors` object with `field:"error message" if something is wrong.
// If everything is OK, `errors` will be an empty object.
TopicComments.validateAttributes = function(attributes, nullOK) {
	var errors = {};
	if (!attributes.comment && !nullOK) {
		errors.comment = "Your comment is empty!";
	}
	return errors;
}

// Validate topic attributes, throwing an error if the something is wrong.
// Use this to get a consistent error message.
TopicComments.validateAttributesOrDie = function(attributes, nullOK) {
	var errors = TopicComments.validateAttributes(attributes, nullOK);
	if (Object.keys(errors).length === 0) return;
	throw new Meteor.Error("topicComments-invalid-arguments", "Invalid arguments", errors);
}
