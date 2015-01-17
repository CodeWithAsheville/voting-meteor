//////////////////////////////
//
//	Notifications table
//
//////////////////////////////

// Topic records.
Notifications = new Mongo.Collection("notifications");

// Don't allow direct manipulation of notifications from the client.
Notifications.deny({
	insert	: function(){return false},
	update	: function(){return false},
	remove	: function(){return false}
});


//////////////////////////////
//	Publications
//////////////////////////////

if (Meteor.isServer) {

	// Publish all unread notifications to the client for the current user.
	Meteor.publish("notifications", function() {
		return Notifications.find({userId: this.userId, read:false});
	});
}



//////////////////////////////
//	Create new notifications
//////////////////////////////

// Server-side routine to create a new generic notification.
// NOTE: doesn't do ANY argument sanitation.
Notifications.createNotification = function(user, type, message, route) {
	user = User.getUserOrDie(user);

	Notifications.insert({
		userId	: user._id,					// recipient
		type	: type,						// notification type
		message	: message,					// notification message to display
		route	: route,					// route to show when notification is selected
		read	: false,					// hasn't yet been read
		created	: new Date()				// creation date
	});
}


// Send a notice to all topic subscribers other than `user.
Notifications.notifyTopicSubscribers = function(topicId, message, route, exceptUserId) {
	var subscribers = Topics.getSubscribers(topicId);
	subscribers.forEach(function(subscriberId) {
		// don't notify the changer
		if (subscriberId === exceptUserId) return;
		Notifications.createNotification(subscriberId, "topic", message, route);
	});
}

// Send notices to all subscribers that a topic has been changed by some `user`.
Notifications.notifyTopicChanged = function(user, topicId) {
	user = User.getUserOrDie(user);
	var topic = Topics.getTopicOrDie(topicId);

	var message = "<b>" + User.getNameForUser(user) + "</b> has updated the topic \""+topic.title+".\"";
	var route = "";	//Router.routes.topic.path({_id: topicId});

	Notifications.notifyTopicSubscribers(topicId, message, route, user._id);
}


// Send notices to all subscribers that a comment has been added or changed for a topic.
Notifications.notifyTopicComment = function(user, topicId, commentId, action) {
	user = User.getUserOrDie(user);
	var topic = Topics.getTopicOrDie(topicId);

	var message;
	if (action === "created") {
		message = "<b>" + User.getNameForUser(user) + "</b> has commented on your topic \""+topic.title+".\"";
	} else {
		message = "<b>" + User.getNameForUser(user) + "</b> has updated their comment on your topic \""+topic.title+".\"";
	}
	var route = "";	//Router.routes.topic.path({_id: topicId});

	Notifications.notifyTopicSubscribers(topicId, message, route, user._id);
}



//////////////////////////////
//	Notification update
//////////////////////////////

Meteor.methods({
	readNotification : function(notificationId) {
		var notification = Notifications.getNotificationOrDie(notificationId);
		var success = Notifications.update(notificationId, {$set : {read:true} });
		return success;
	}
});



//////////////////////////////
//	Utility methods
//////////////////////////////
Notifications.getNotificationOrDie = function(notificationId) {
	var notification = Notifications.findOne(notificationId);
	if (!notification) throw new Meteor.Error("notifications-not-found", "Notification not found.");
	return notification;
}
