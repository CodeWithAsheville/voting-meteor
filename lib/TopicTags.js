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
//	Map of titles for pre-defined tags
//////////////////////////////

TopicTags.TAG_TITLES = {
	"Animals" 				: "Animals & Pets",
	"Budget" 				: "City Budget",
	"Civic Jobs" 			: "Civic Jobs",
	"Crime" 				: "Crime",
	"Elections" 			: "Elections",
	"Housing" 				: "Housing",
	"Inspections"		 	: "Inspections",
	"Parking" 				: "Parking",
	"Parks" 				: "Parks",
	"Public Transportation" : "Public Transportation",
	"Water" 				: "Water",
	"Zoning" 				: "Zoning",
}

// Return the special name for a tag from the list above.
TopicTags.getTitle = function(tag) {
	return (TopicTags.TAG_TITLES[tag] || tag);
}


//////////////////////////////
//	Publications
//////////////////////////////
if (Meteor.isServer) {

	// Publish all tags to the client for a tag map.
	Meteor.publish("topicTags", function() {
		return TopicTags.find();
	});
}


//////////////////////////////
//	Tag maintenance
//////////////////////////////

// Given a set of tags as a string or an array, return a normalized list of tags.
TopicTags.splitTags = function(tags) {
	if (typeof tags === "string") {
		tags = tags.trim().split(/\s*,\s*/);
	}
	return _.compact( _.uniq(tags || []) );
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
		// NOTE: Only show the error if we can't find it on the server,
		//		 the client is not likely to have it in any case.
		else if (Meteor.isServer) {
			console.warn("TopicTags.tagsRemovedFromTopic(): expected tag ",tag," not found!");
		}
	});
}

