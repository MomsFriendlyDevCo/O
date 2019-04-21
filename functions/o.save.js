var _ = require('lodash');
var monoxide = require('monoxide');

module.exports = o => {
	o.cli
		.description('Save a changed document (requires either a collection specifying OR the _collection meta key in each document)')
		.option('-n, --dry-run', 'Dont actually save anything, just say what would be saved')
		.usage('[collection]')
		.parse();

	if (o.cli.args.length > 1) throw new Error('Only one collection name can be used to save documents');

	o.on('doc', doc => {
		var collection = _.get(doc, '_collection') || o.cli.args[0];

		if (!collection) {
			throw new Error(`No idea where to save incomming document ${doc._id}, either specify a collection or ensure it has a _collection meta key`);
		} else if (o.cli.dryRun) {
			o.log(0, `Would save document ${collection} / # ${doc._id}`);
			return o.output.doc(doc);
		} else { // Actual save

			o.log(1, `Saving document ${collection} / # ${doc._id}`);
			if (_.get(o, 'profile.mangle.collections.lowerCase')) collection = collection.toLowerCase();
			return monoxide.save({
				$collection: collection,
				$id: doc._id,
				...doc,
			})
				.then(res => o.output.doc(res))
				.then(()=> o.log(2, `Saved document ${collection} / # ${doc._id}`))
		}

	});

	return Promise.resolve()
		.then(()=> o.db.connect())
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
