var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Select a series of fields from an input collection')
		.usage('<field...>')
		.option('--no-collection', 'Also filter out the `_collection` meta key, which marks the source of the record when using a subsequent `o save` function')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one field must be specified to select');

	var includeFields = [];
	var excludeFields = [];
	o.cli.args.forEach(field => {
		if (field.startsWith('!')) {
			excludeFields.push(field);
		} else {
			includeFields.push(field);
		}
	})

	o.on('doc', doc =>
		o.output.doc(
			_(doc)
				.pick(includeFields)
				.omit(excludeFields)
				.thru(d => o.cli.collection && doc._collection ? _.set(d, '_collection', doc._collection) : d)
				.value()
		)
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
