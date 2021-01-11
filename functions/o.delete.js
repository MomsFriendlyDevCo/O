var _ = require('lodash');
var mongoosy = require('@momsfriendlydevco/mongoosy');

module.exports = o => {
	o.cli
		.description('Delete all documents from a query (requires either a specific collection OR the _collection meta key in each document)')
		.option('-t, --thru', 'Return the document that was delted rather than an empty output - this can be used with `o save` to re-insert documents')
		.option('-n, --dry-run', 'Dont actually delete anything, just say what would be deleted')
		.usage('[collection]')
		.parse();

	if (o.cli.args.length > 1) throw new Error('Only one collection name can be used to delete documents');

	o.on('doc', doc => {
		var collection = _.get(doc, '_collection') || o.cli.args[0];

		if (!collection) {
			throw new Error(`No idea from which collection to delete incomming document ${doc._id}, either specify a collection or ensure it has a _collection meta key`);
		} else if (o.cli.dryRun) {
			o.log(0, `Would delete document ${collection} / # ${doc._id}`);
			return Promise.resolve()
				.then(()=> o.cli.thru && o.output.doc(doc))
		} else { // Actual save

			o.log(1, `Deleting document ${collection} / # ${doc._id}`);
			if (_.get(o, 'profile.mangle.collections.lowerCase')) collection = collection.toLowerCase();
			return mongoosy.models[collection].deleteOne({_id: doc._id})
				.then(()=> o.cli.thru && o.output.doc(doc))
				.then(()=> o.log(2, `Deleted document ${collection} / # ${doc._id}`))
		}

	});

	return Promise.resolve()
		.then(()=> o.db.connect())
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
