// Local (client-only) collection
Errors = new Mongo.Collection(null);


// Global `throwError` function to add to the list of errors.
throwError = function(message) {
	Errors.insert({message:message});
}
