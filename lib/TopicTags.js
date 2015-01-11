//////////////////////////////
//
//	TopicTags table
//
//////////////////////////////

// List of all tags used in topics.
TopicTags = new Mongo.Collection("topicTags");

// Don't allow direct manipulation of topic tags from the client.
TopicTags.deny({
	insert	: function(){return false},
	update	: function(){return false},
	remove	: function(){return false}
});


//////////////////////////////
//	Tag maintenance
//////////////////////////////

// Given a set of tags as a string or an array, return a normalized list of tags.
TopicTags.splitTags = function(tags) {
	if (typeof tags === "string") return _.uniq(tags.trim().split(/\s+/));
	return tags || [];
}

// Update the TopicTags table with a list of tags which were ADDED to some topic.
TopicTags.tagsAddedToTopic = function(tags) {
	tags = TopicTags.splitTags(tags);
	if (!tags || tags.length === 0) return;

	tags.forEach(function(tag) {
		// if this tag is already known, just update its count
		var existingTag = TopicTags.findOne({tag:tag});
		if (existingTag) {
			//console.info("updating tag: ",tag, " existing: ",existingTag);
			TopicTags.update(existingTag._id, {
				$inc : {count:1}
			});
		}
		// otherwise add it
		else {
			var id = TopicTags.insert({
				tag 	: tag,
				count	: 1
			});
			//console.info("added tag: ",tag, " new tag id: ",id);
		}
	});
}

// Update the TopicTags table with a list of tags which were REMOVED from some topic.
TopicTags.tagsRemovedFromTopic = function(tags) {
	tags = TopicTags.splitTags(tags);
	if (!tags || tags.length === 0) return;

	tags.forEach(function(tag) {
		// if this tag is already known:
		var existingTag = TopicTags.findOne({tag:tag});
		if (existingTag) {
			// if it's count is 1, just remove it.
			if (existingTag.count <= 1) {
				//console.info("removing tag: ",existingTag.tag, " id: ", existingTag._id);
				TopicTags.remove(existingTag._id);
			} else {
				//console.info("decrementing count for: ",existingTag.tag, " id: ", existingTag._id);
				// otherwise decrement its count
				TopicTags.update(existingTag._id, {
					$inc : {count:-1}
				});
			}
		}
		else {
			console.warn("TopicTags.tagsRemovedFromTopic(): expected tag ",tag," not found!");
		}
	});
}

