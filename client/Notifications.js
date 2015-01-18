//////////////////////////////
//
//	notifications template
//
//////////////////////////////
Template.notifications.helpers({
	// List of unread notifications for this user.
	notifications : function() {
		return Notifications.find({userId: Meteor.userId()});
	},
	// Number of unread notifications for this user.
	notificationCount : function() {
		return Notifications.find({userId: Meteor.userId()})
							.count();
	}
});



//////////////////////////////
//
//	notificationItem template
//
//////////////////////////////
Template.notificationItem.helpers({
	// Return path to the page for the notification
	notificationPostPath : function() {
		return this.postId;
		return Router.routes.postPage.path({_id: this.postId});
	}
});

Template.notificationItem.events({
	// When they select a notification, mark it as read.
	"click a" : function() {
		Meteor.call("markNotificationAsRead", this._id);
	}

});
