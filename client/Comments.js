//////////////////////////////
//
//	commentItem template
//
//////////////////////////////
Template.commentItem.helpers({
	createdAsText : function(){
		return this.created.toLocaleDateString() + " at " + this.created.toLocaleTimeString();
	},

	// Does the logged in user own this topic?
	isOwnCommentOrAdmin: function() {
		return this.authorId === Meteor.userId() || User.isAdmin(Meteor.user() );
	}
});

Template.commentItem.events({
	"click .remove" : function(e, template) {
		e.preventDefault();
		var commentId = this._id;
		Meteor.call("removeTopicComment", commentId, function(error, result) {
			if (error) throwError(error.reason);
		});
	}

});

//////////////////////////////
//
//	createComment template
//
//////////////////////////////

// Clear errors when we create the creatTopic form.
Template.createComment.created = function() {
	Session.set("createCommentErrors", {});
}

// Show errors as necessary in the createComment form.
Template.createComment.helpers({
	errorMessage: function(field) {
		return Session.get("createCommentErrors")[field];
	},
	errorClass : function(field) {
		return (Session.get("createCommentErrors")[field] ? "has-error" : "");
	}
});

// Submit the createComment form.
Template.createComment.events({
	"submit form": function(e, template) {
		e.preventDefault();

		// Prepare the data to post
		var $comment = $(e.target).find("[name=comment]");
		var comment = {
			comment 	: $comment.val().trim()
		}

		// make sure they actually typed something
		var errors = {};
		if (!comment.comment) {
			errors.comment = "Please write something.";
			return Session.set("createCommentErrors", errors);
		}

		// Call server "insertComment" method
		Meteor.call("createTopicComment", template.data._id, comment, function(error, result) {
			if (error) {
				throwError(error.reason);
			} else {
				// clear field to prepare for next comment
				$comment.val("");
			}
		});
	}
});
