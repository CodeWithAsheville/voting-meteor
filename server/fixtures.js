//////////////////////////////
//
//	Test data & rudamentary smoke test for internal APIs
//
//////////////////////////////
if (Topics.find().count() === 0) {

	console.info("Creating sample records");

	var owenId = Accounts.createUser({
        username	: 'owen',
        email		: 'o@w.com',
        password	: 'olamola',
    });
	var owen = Meteor.users.findOne(owenId);

	var adminID = Accounts.createUser({
        username	: 'admin',
        email		: 'admin@codeforasheville.org',
        password	: 'GEUY32ab',
        roles		: ['admin']
    });

	var admin = Meteor.users.findOne(adminID);

	var landlordId = Topics.createTopic(owen, {
		title			: "Landlord complaints",
		description		: "Complaints of renters against their landlords",
		reference_url	: "http://www.codeforasheville.org",
		tags			: "housing"
	});
	console.warn("LANDLORD ID: ",landlordId);

	Topics.createTopic(owen, {
		title		: "City Budgets",
		description	: "Full explanation of city budget.",
		tags		: "finances"
	});

	Topics.createTopic(owen, {
		title		: "Campaign spending",
		description	: "Full account of spending of each candidate for a public office.",
		tags		: "elections finances"
	});


	var bobId = Accounts.createUser({
        username	: 'bob',
        email		: 'bob@w.com',
        password	: 'olamola',
    });
	var bob = Meteor.users.findOne(bobId);

	var bobTopics = [];
	for (var i = 1; i <= 5; i++) {
		bobTopics[i] = Topics.createTopic(bob, {
			title	 	: "Bob topic "+i,
			description	: "Testing"
		});
	}

	//////
	// Make a couple of changes
	//////

	console.info("Testing record editing");

	// Have owen change title of his own record.
	try {
		Topics.editTopic(landlordId, {description:"Complaints of both landlords and renters"}, owen);
		console.info("YAY!  Owen can change his own record!");
	} catch (e) {
		console.warn("BOO!  Error updating record:", e.reason || e);
	}

	// Have owen change tags of his own record.
	try {
		var newTags = "rentals landlords";
		Topics.editTopic(landlordId, {tags:newTags}, owen);
		var updatedTags = Topics.findOne(landlordId).tags.join(" ");
		if (updatedTags === newTags) {
			console.info("YAY!  Owen can change his tags!");
		}
		else {
			console.warn("BOO!  Owen can't change his tags!");
		}
	} catch (e) {
		console.warn("BOO!  Error updating tags:", e.reason || e);
	}

	// Have bob try to change owen's record
	try {
		Topics.editTopic(landlordId, {title:"BAD BAD BAD"}, bob);
		console.warn("BOO!  Bob is able to change owen's record!");
	} catch (e) {
		console.info("YAY!  Bob can't change owen's records:", e.reason || e);
	}




	//////////
	// Create and then remove a topic
	//////////

	console.info("Testing record removal");

	var tempTopic1 = Topics.createTopic(owen, {
		title		: "DELETE ME 1",
		description	: "TEST POST WHICH SHOULD BE DELETED",
		tags		: "TEST_TAG"
	});

	var tempTopic2 = Topics.createTopic(owen, {
		title		: "DELETE ME 2",
		description	: "TEST POST WHICH SHOULD BE DELETED",
		tags		: "TEST_TAG"
	});

	// Make sure TEST_TAG is in the list of TopicTags exactly twice
	var tag = TopicTags.findOne({tag:"TEST_TAG"});
	if (!tag) {
		console.warn("BOO!  TEST_TAG not found in TopicTags");
	} else if (tag.count !== 2) {
		console.warn("BOO!  TEST_TAG expected tag count of 2, got: "+tag.count);
	} else {
		console.info("YAY!  TEST_TAG count of 2 as expected!");
	}

	// Remove first record
	try {
		Topics.removeTopic(tempTopic1);
		console.info("YAY!  deleted temp topic 1");
	} catch (e) {
		console.warn("BOO!  Error removing temp topic 1: ",e);
	}
	// make sure tag count got decrememnted
	var tag = TopicTags.findOne({tag:"TEST_TAG"});
	if (!tag || tag.count !== 1) {
		console.warn("BOO!  TEST_TAG expected tag count of 1, got: "+tag);
	} else {
		console.info("YAY!  TEST_TAG count is 1 as expected.");
	}

	// Remove second record
	try {
		Topics.removeTopic(tempTopic2);
		console.info("YAY!  deleted temp topic 2");
	} catch (e) {
		console.warn("BOO!  Error removing temp topic 2: ",e);
	}
	// make sure tag got removed entirely
	var tag = TopicTags.findOne({tag:"TEST_TAG"});
	if (tag) {
		console.warn("BOO!  TEST_TAG should have been deleted!  Got: ",tag);
	} else {
		console.info("YAY!  TEST_TAG got deleted!");
	}

	//////////
	// Do some voting
	//////////

	console.info("Testing voting");

	// try to vote for a bogus topic
	try {
		var success = Topics.upvoteTopic(bob, "BOGUS_TOPIC");
		if (success) console.info("BOO!  Able to vote for a bogus topic!");
		else		 console.warn("YAY!  Unable to vote for bogus topic.");
	} catch (e) {
		console.info("YAY!  Unable to vote for bogus topic.  ", e.reason || e);
	}

	// have bob vote for owen's topic
	try {
		var success = Topics.upvoteTopic(bob, landlordId);
		if (success) console.info("YAY!  Bob is able to vote for owen's topic.");
		else		 console.warn("BOO!  Bob is not able to vote for owen's topic: ",success);
	} catch (e) {
		console.warn("BOO!  Bob is not able to vote for owen's topic: ", e.reason || e);
	}

	// have bob try to vote for owen's topic again, which should fail
	try {
		var success = Topics.upvoteTopic(bob, landlordId);
		if (success) console.warn("BOO!  Bob is able to vote for owen's topic twice.")
		else		 console.info("YAY!  Bob is not able to vote for owen's topic twice: ",success);
	} catch (e) {
		console.info("YAY!  Bob is unable to vote for owen's topic twice!");
	}

	// have owen try to vote for his own topic -- which should fail.
	try {
		var success = Topics.upvoteTopic(owen, landlordId);
		if (success) console.warn("BOO!  Owen is able to vote for his own topic twice.")
		else		 console.info("YAY!  Owen is not able to vote for his own topic twice: ",success);
	} catch (e) {
		console.info("YAY!  Owen is unable to vote for his topic: ", e.reason || e);
	}

	// have owen downvote his topic, then vote for it again
	try {
		var success = Topics.downvoteTopic(owen, landlordId);
		if (success) console.info("YAY!  Owen is able to downvote his topic.")
		else		 console.warn("BOO!  Owen is not able to downvote his topic: ",success);
	} catch (e) {
		console.info("BOO!  Owen is unable to downvote his topic: ", e.reason || e);
	}
	try {
		var success = Topics.upvoteTopic(owen, landlordId);
		if (success) console.info("YAY!  Owen is able to upvote his topic again.")
		else		 console.warn("BOO!  Owen is not able to upvote his topic again: ",success);
	} catch (e) {
		console.warn("BOO!  Owen is unable to upvote his topic again: ", e.reason || e);
	}
	var voteCount = Topics.findOne(landlordId).voteCount;
	var voters = Topics.getVoters(landlordId);
	if (voteCount === voters.length) {
		console.info("YAY!  voteCount matches the number of voters ("+voteCount+").");
	} else {
		console.warn("BOO!  expected voteCount of ",voters.length,", found: ", voteCount);
	}


	//////////
	// Subscribe/unsubscribe
	//////////
	console.info("Testing subscription");

	// try to subscribe to a bogus topic
	try {
		var success = Topics.subscribeToTopic(bob, "BOGUS_TOPIC");
		if (success) console.info("BOO!  Able to subscribe to a bogus topic!");
		else		 console.warn("YAY!  Unable to subscribe to bogus topic.");
	} catch (e) {
		console.info("YAY!  Unable subscribe to bogus topic.  ", e.reason || e);
	}

	// subscribe bob to Owen's post
	try {
		var success = Topics.subscribeToTopic(bob, landlordId);
		if (success) console.info("YAY!  Bob is able to subscribe to owen's topic.");
		else		 console.warn("BOO!  Bob is unable to subscribe to owen's topic.");
	} catch (e) {
		console.warn("BOO!  Bob is unable to subscribe to owen's topic.", e.reason || e);
	}

	var subscribers = Topics.getSubscribers(landlordId);
	if (subscribers.length === 2) {
		console.info("YAY!  2 subscribers to topic as expected.");
	} else {
		console.warn("BOO!  Expected 2 subscribers to topic, found ",subscribers.length, " data:",subscribers);
	}

	// have owen try to subscribe to his own topic -- which should fail.
	try {
		var success = Topics.subscribeToTopic(owen, landlordId);
		if (success) console.warn("BOO!  Owen is able to subscribe to his own topic twice.")
		else		 console.info("YAY!  Owen is not able to subscribe to his own topic twice: ",success);
	} catch (e) {
		console.info("YAY!  Owen is unable to subscribe to his topic: ", e.reason || e);
	}

	// have owen unsubscribe from  his topic, then subscribe to it again
	try {
		var success = Topics.unsubscribeFromTopic(owen, landlordId);
		if (success) console.info("YAY!  Owen is able to unsubscribe from his topic.")
		else		 console.warn("BOO!  Owen is not able to unsubscribe from his topic: ",success);
	} catch (e) {
		console.info("BOO!  Owen is unable to unsubscribe from his topic: ", e.reason || e);
	}
	try {
		var success = Topics.subscribeToTopic(owen, landlordId);
		if (success) console.info("YAY!  Owen is able to subscribe to his topic again.")
		else		 console.warn("BOO!  Owen is not able to subscribe to his topic again: ",success);
	} catch (e) {
		console.warn("BOO!  Owen is unable to subscribe to his topic again: ", e.reason || e);
	}




	//////////
	// Comments
	//////////

	console.info("Testing comments");
	// try to comment on a bogus topic
	try {
		var success = TopicComments.createComment("BOGUS_TOPIC", {comment:"YAY!"}, owen);
		if (success) console.info("BOO!  Able to comment on a bogus topic!");
		else		 console.warn("YAY!  Unable to comment on bogus topic.");
	} catch (e) {
		console.info("YAY!  Unable comment on bogus topic.  ", e.reason || e);
	}

	// have Bob comment on owen's post 2 times
	try {
		var success = TopicComments.createComment(landlordId, {comment:"YAY 2!"}, bob);
		if (success) console.info("YAY!  Bob is able to comment on owen's topic.");
		else		 console.warn("BOO!  Bob is unable to comment on owen's topic.");
	} catch (e) {
		console.warn("BOO!  Bob is unable to comment on owen's topic.", e.reason || e);
	}
	try {
		var success = TopicComments.createComment(landlordId, {comment:"YAY 3!"}, bob);
		if (success) console.info("YAY!  Bob is able to comment on owen's topic.");
		else		 console.warn("BOO!  Bob is unable to comment on owen's topic.");
	} catch (e) {
		console.warn("BOO!  Bob is unable to comment on owen's topic.", e.reason || e);
	}

	var commentCount = Topics.findOne(landlordId).commentCount;
	if (commentCount === 2) {
		console.info("YAY!  2 comments on topic as expected.");
	} else {
		console.warn("BOO!  Expected 2 comments on topic, found ",commentCount);
	}
}
