//////////////////////////////
//
//	Test data & rudamentary smoke test for internal APIs
//
//////////////////////////////
if (Topics.find().count() === 0) {


	// Smoke test function.
	// Pass a function to execute, an expected value and a message.
	// We'll show a success or failure message.
	// Pass `expected` as the `ERROR` constant if you're expecting an error.
	var ERROR = "ERROR";
	var TRUTHY = "TRUTHY";
	var FALSY = "FALSY";
	function smokeTest(message, expected, handler) {
		if (expected === ERROR) {
			try {
				var result = handler();
				console.warn("FAIL:  "+message+" (expected an error, got:",result,")");
			} catch (e) {
				console.info("PASS:  "+message);
			}
		} else {
			try {
				var result = handler();
				if ( 	(expected === TRUTHY && !!result)
					||  (expected === FALSY && !result)
					||  (result === expected)
				) {
					console.info("PASS:  "+message);
				} else {
					console.warn("FAIL:  "+message+"  (expected ",expected,")");
				}
			} catch (e) {
				console.info("FAIL:  "+message+" (error:",(e.reason||e),")");
			}
		}
	}


	console.info("Creating sample records");

	var owenId = Accounts.createUser({
        username	: 'owen',
        email		: 'o@w.com',
        password	: 'olamola',
    });
	var owen = Meteor.users.findOne(owenId);

	var adminId = Accounts.createUser({
        username	: 'admin',
        email		: 'admin@cfa.org',
        password	: 'admin',
        roles		: ['admin']
    });

	// make the admin user an actual admin
	User.makeAdmin(adminId);
	smokeTest("Admin was made an admin", true, function(){return User.isAdmin(adminId)});


	var landlordId = Topics.createTopic(owen, {
		title			: "Landlord complaints",
		description		: "Complaints of renters against their landlords",
		reference_url	: "http://www.codeforasheville.org",
		tags			: "housing"
	});
//	console.info("LANDLORD ID: ",landlordId);

	Topics.createTopic(owen, {
		title		: "City Budgets",
		description	: "Full explanation of city budget.",
		tags		: "finances"
	});

	Topics.createTopic(owen, {
		title		: "Campaign spending",
		description	: "Full account of spending of each candidate for a public office. \
Long long long description. \
Long long long description. \
Long long long description. \
Long long long description. \
Long long long description. \
Long long long description. \
Long long long description. \
END of description.",
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
	smokeTest("Owen changed his own record.", TRUTHY,
		function() {
			return Topics.editTopic(landlordId, {description:"Complaints of both landlords and renters"}, owen);
		});

	// Have owen change tags of his own record.
	smokeTest("Owen changed his own tags.", TRUTHY,
		function() {
			var newTags = "rentals landlords";
			Topics.editTopic(landlordId, {tags:newTags}, owen);
			var updatedTags = Topics.findOne(landlordId).tags.join(" ");
			return updatedTags === newTags;
		});

	// Have bob try to change owen's record
	smokeTest("Bob can't change Owen's record.", ERROR,
		function() {
			return Topics.editTopic(landlordId, {title:"BAD BAD BAD"}, bob);
		});




	//////////
	// Create and then remove a topic
	//////////

	console.info("Testing record removal & tag count");

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
	smokeTest("Found 2 instances of TEST_TAG", TRUTHY, function() {
		var tag = TopicTags.findOne({tag:"TEST_TAG"});
		if (!tag) return false;
		return tag.count === 2;
	});

	// Remove first record
	smokeTest("Deleted first topic", TRUTHY, function() {
		return Topics.removeTopic(tempTopic1);
	});

	// Make sure TEST_TAG is in the list of TopicTags exactly twice
	smokeTest("Found 1 instances of TEST_TAG", TRUTHY, function() {
		var tag = TopicTags.findOne({tag:"TEST_TAG"});
		if (!tag) return false;
		return tag.count === 1;
	});

	// Remove second record
	// Remove first record
	smokeTest("Deleted second topic", TRUTHY, function() {
		return Topics.removeTopic(tempTopic2);
	});

	// make sure tag got removed entirely
	smokeTest("TEST_TAG was removed entirely", TRUTHY, function() {
		var tag = TopicTags.findOne({tag:"TEST_TAG"});
		return tag === undefined;
	});

	//////////
	// Do some voting
	//////////

	console.info("Testing voting");

	// try to vote for a bogus topic
	smokeTest("Upvoting bogus topic", ERROR, function() {
		var success = Topics.upvoteTopic(bob, "BOGUS_TOPIC");
		if (success) throw new Meteor.Error("Vote succeeded.");
	});

	// have bob vote for owen's topic
	smokeTest("Vote for someone else's topic", TRUTHY, function() {
		return Topics.upvoteTopic(bob, landlordId);
	});

	// have bob try to vote for owen's topic again, which should fail
	smokeTest("Upvoting for same topic twice", FALSY, function() {
		return Topics.upvoteTopic(bob, landlordId);
	});

	// have owen try to vote for his own topic -- which should fail.
	smokeTest("Upvoting for own topic twice", FALSY, function() {
		return Topics.upvoteTopic(owen, landlordId);
	});

	// have owen downvote his topic, then vote for it again
	smokeTest("Downvoting topic", TRUTHY, function() {
		return Topics.downvoteTopic(owen, landlordId);
	});
	smokeTest("Upvoting topic again", TRUTHY, function() {
		return Topics.upvoteTopic(owen, landlordId);
	});

	// make sure vote count is as expected
	smokeTest("Vote count matches", TRUTHY, function() {
		var voteCount = Topics.findOne(landlordId).voteCount;
		var voters = Topics.getVoters(landlordId);
		return (voteCount === voters.length);
	});


	//////////
	// Subscribe/unsubscribe
	//////////
	console.info("Testing subscription");

	// try to subscribe to a bogus topic
	smokeTest("Subscribing to bogus topic", ERROR, function() {
		return Topics.subscribeToTopic(bob, "BOGUS_TOPIC");
	});

	// subscribe bob to Owen's topic
	smokeTest("Subscribe to other's topic", TRUTHY, function() {
		return Topics.subscribeToTopic(bob, landlordId);
	});
	smokeTest("# of subscribers as expected", 2, function() {
		return Topics.getSubscribers(landlordId).length;
	});

	// have owen try to subscribe to his own topic -- which should fail.
	smokeTest("Subscribe to own topic", FALSY, function() {
		return Topics.subscribeToTopic(owen, landlordId);
	});

	// have owen unsubscribe from  his topic, then subscribe to it again
	smokeTest("Unsubscribe from topic", TRUTHY, function() {
		return Topics.unsubscribeFromTopic(owen, landlordId);
	});
	smokeTest("Subscribe to topic again", TRUTHY, function() {
		return Topics.subscribeToTopic(owen, landlordId);
	});



	//////////
	// Comments
	//////////

	console.info("Testing comments");
	// try to comment on a bogus topic
	smokeTest("Commenting on bogus topic", ERROR, function() {
		return TopicComments.createComment("BOGUS_TOPIC", {comment:"Yay!"}, owen);
	});

	// have Bob comment on owen's topic 2 times
	smokeTest("Commenting on other's topic", TRUTHY, function() {
		return TopicComments.createComment(landlordId, {comment:"YAY 2!"}, bob);
	});
	smokeTest("Commenting on other's topic again", TRUTHY, function() {
		return TopicComments.createComment(landlordId, {comment:"YAY 3!"}, bob);
	});
	smokeTest("# of comments as expected", 2, function() {
		return Topics.findOne(landlordId).commentCount;
	});
}
