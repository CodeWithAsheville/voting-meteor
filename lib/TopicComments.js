//////////////////////////////
//
//	TopicComments table
//
//////////////////////////////

// Topic comment records.
TopicComments = new Mongo.Collection("topicComments");

//////////////////////////////
//	Create new comment
//////////////////////////////
Meteor.methods({
	createTopicComment : function(topicId, attributes) {
		// Make sure we're logged in.
		var user = User.getLoggedInUserOrDie();

		// get the topic
		var topic = Topics.getTopicOrDie(topicId);

		return TopicComments.createComment(topicId, attributes);
	}
})
