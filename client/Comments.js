//////////////////////////////
//
//	commentItem template
//
//////////////////////////////
Template.commentItem.helpers({
	createdAsText : function(){
		return this.created.toLocaleDateString() + " at " + this.created.toLocaleTimeString();
	}
});


//////////////////////////////
//
//	createComment template
//
//////////////////////////////

// Clear errors when we create the creatPost form.
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
		var $body = $(e.target).find("[name=body]");
		var comment = {
			body 	: $body.val().trim(),
			postId	: template.data._id
		}

		// make sure they actually typed something
		var errors = {};
		if (!comment.body) {
			errors.body = "Please write something.";
			return Session.set("createCommentErrors", errors);
		}

		// Call server "insertComment" method
		Meteor.call("createTopicComment", comment, function(error, commentId) {
			if (error) {
				throwError(error.reason);
			} else {
				// clear field to prepare for next comment
				$body.val("");
			}
		});
	}
});
