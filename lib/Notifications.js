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
		return Notifications.find({userId: this.userId});
	});
}


//////////////////////////////
//	Create generic notifications
//////////////////////////////

// Server-side routine to create a new generic notification.
// NOTE: doesn't do ANY argument sanitation.
Notifications.createNotification = function(user, type, id, message, route) {
	user = User.getUserOrDie(user);

	Notifications.insert({
		userId	: user._id,					// recipient
		type	: type,						// notification type
		itemId	: id,						// id of the item
		message	: message,					// notification message to display
		route	: route,					// route to show when notification is selected
		created	: new Date()				// creation date
	});
}




//////////////////////////////
//	Create topic notifications
//////////////////////////////


// Send a notice to all topic subscribers other than `user.
Notifications._notifyTopicSubscribers = function(topic, message, route, changerUserId) {
	var subscribers = Topics.getSubscribers(topic);
	subscribers.forEach(function(subscriberId) {
		// don't notify the changer
		if (subscriberId === changerUserId) return;
		Notifications.createNotification(subscriberId, "topic", topic._id, message, route);
	});
}

// Send a notice to all administrators.
Notifications._notifyAdministrators = function(topic, message, route, changerUserId) {
	var admins = User.getAllAdmins();
	admins.forEach(function(adminId) {
		// don't notify the changer
		if (adminId === changerUserId) return;
		Notifications.createNotification(adminId, "topic", topic._id, message, route);
	});
}


//////////////////////////////
//	Specific topic notificatoins
//////////////////////////////


// Send notices to all admins that a topic has been created by some `changer`.
Notifications.notifyTopicCreated = function(changer, topic) {
	// throw if we can't find the topic or user
	changer = User.getUserOrDie(changer);
	topic = Topics.getTopicOrDie(topic);

	var message = "<b>New topic:</b> "+topic.title+"";
	var route = Router.routes.topicPage.path({_id: topic._id});

	// Actually send the message to all administrators.
	Notifications._notifyAdministrators(topic, message, route, changer._id);
}

// Send notices to all subscribers that a topic has been changed by some `changer`.
Notifications.notifyTopicChanged = function(changer, topic) {
	// throw if we can't find the topic or user
	changer = User.getUserOrDie(changer);
	topic = Topics.getTopicOrDie(topic);

	var message = "<b>" + User.getNameForUser(changer) + "</b> has updated the topic \""+topic.title+".\"";
	var route = Router.routes.topicPage.path({_id: topic._id});

	// Actually send the message to all subscribers.
	Notifications._notifyTopicSubscribers(topic, message, route, changer._id);
}

// Send notices to all subscribers that a comment has been added or changed for a topic.
Notifications.notifyTopicComment = function(changer, topic, commentId, action) {
	// throw if we can't find the topic or user
	changer = User.getUserOrDie(changer);
	topic = Topics.getTopicOrDie(topic);

	var message;
	if (action === "created") {
		message = "<b>" + User.getNameForUser(changer) + "</b> has commented on your topic \""+topic.title+".\"";
	} else {
		message = "<b>" + User.getNameForUser(changer) + "</b> has updated their comment on your topic \""+topic.title+".\"";
	}
	var route = Router.routes.topicPage.path({_id: topic._id});

	// Actually send the message to all subscribers.
	Notifications._notifyTopicSubscribers(topic, message, route, changer._id);
}


// Send notices to all subscribers and admins that two topics have been merged.
Notifications.notifyTopicMerge = function(changer, parentTopic, childTopic) {
	// throw if we can't find the topics or user
	changer = User.getUserOrDie(changer);
	parentTopic = Topics.getTopicOrDie(parentTopic);
	childTopic = Topics.getTopicOrDie(childTopic);

	var message = "<b>" + User.getNameForUser(changer) + "</b> has merged topic \""+childTopic.title+"\""
				+ " with \""+parentTopic.title + ".\"";
	var route = Router.routes.topicPage.path({_id: parentTopic._id});

	// get the list of users to send to:
	//	- subscribers to parent
	//	- subscribers to child
	//	- admins
	var recipients = _.uniq( _.flatten( [	Topics.getSubscribers(parentTopic),
											Topics.getSubscribers(childTopic),
											User.getAllAdmins() ]) );

	// Actually send the messages.
	recipients.forEach(function(recipientId) {
		// Don't notify the changer.
		if (recipientId === changer._id) return;
		Notifications.createNotification(recipientId, "topic", parentTopic._id, message, route);
	});
}





//////////////////////////////
//	Mark a notification as read
//////////////////////////////
Meteor.methods({
	markNotificationAsRead : function(notificationId) {
		notification = Notifications.getNotificationOrDie(notificationId);

		// forget it if it's not my notification
		user = User.getLoggedInUserOrDie();
		if (user._id !== notification.userId) {
			throw new Meteor.Error("notifications-not-yours", "You cannot mark someone else's comments as read.");
		}

		Notifications.removeNotifcation(notificationId);
	}
});


// Remove one particular comment.
Notifications.removeNotifcation = function(notificationId) {
	Notifications.remove(notificationId);
}

// Remove topic comments for ALL USERS for
Notifications.removeAllForTopic = function(topic) {
	// throw if we can't find the topic
	topic = Topics.getTopicOrDie(topic);
	Notifications.remove({type:"topic", itemId:topic._id});
}

// Mark ALL notifications for a topic as read for ONE user.
// You can pass a user object or a userId.
Notifications.removeAllForTopicAndUser = function(user, topic) {
	// throw if we can't find the topic or user
	user = User.getUser(user);
	topic = Topics.getTopicOrDie(topic);
	Notifications.remove({type:"topic", itemId:topic._id, userId:user._id});
}


//////////////////////////////
//	Utility methods
//////////////////////////////
Notifications.getNotificationOrDie = function(notificationId) {
	var notification = Notifications.findOne(notificationId);
	if (!notification) throw new Meteor.Error("notifications-not-found", "Notification not found.");
	return notification;
}



