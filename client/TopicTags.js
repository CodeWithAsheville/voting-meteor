

//////////////////////////////
//
//	topicTags template
//
//////////////////////////////
Template.topicTags.helpers({});


//////////////////////////////
//
//	tagCloud template
//
//////////////////////////////
Template.tagCloud.helpers({});



//////////////////////////////
//
//	tagCloudItem template
//
//////////////////////////////
Template.tagCloudItem.helpers({

	// Where to go to show this tag?
	tagAnchor : function() {
		return Router.routes.topicsForTag.path({tags: this.tag});
	},


	// Return the relative size of this tag as a number from 0..4
	tagSize : function() {
		// TODO: it is REALLY inefficient recalculating min and max each time!!
		var allTags = Template.parentData(1).allTags.fetch();

		var counts = _.pluck(allTags, "count");
		var min = Math.min.apply(Math, counts);
		var max = Math.max.apply(Math, counts);

		// if all tags are the same, return a median value
		//	(otherwise we'll divide-by-zero below).
		if (max === min) return 2;

		// convert to percentage of the total
		var percent = ((this.count - min) / (max-min)) * 100;
		// and divide into 5 buckets
		return Math.round(percent / 25);
	},

	// Look up the title in the map of pre-defined tag names.
	tagTitle : function() {
		return TopicTags.getTitle(this.tag);
	},

	// Is this tag selected in the parent view?
	tagSelected : function() {
		// Figure out the tags parameter in the parent view
		var selectedTags = Template.parentData(1).tags;
		if (!selectedTags) return;

		// return true if our tag is included!
		if (selectedTags.indexOf(this.tag) > -1) return "selected";
	}


});



//////////////////////////////
//
//	topicTagsSelector template
//
//////////////////////////////
Template.topicTagsSelector.helpers({
	titledTagsOptions : function() {
		var selectedTags = this.tags || [];
		// get the sorted list of names
		var namedTags = TopicTags.TAG_TITLES;
		var keys = Object.keys(namedTags).sort();

		return keys.map(function(key) {
			var selected = (selectedTags.indexOf(key) > -1);
			return "<option value='"+key+"' " + (selected ? "selected" : "")+">"+TopicTags.TAG_TITLES[key]+"</option>";
		}).join("\n");
	}


});
