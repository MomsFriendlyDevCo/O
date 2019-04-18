var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Select a series of fields from an input collection')
		.usage('<field...>')
		.option('--no-meta', 'Also filter out the `_id` and `_collection` meta keys')
		.option('--no-id', 'Also filter out the `_id` meta key')
		.option('--no-collection', 'Also filter out the `_collection` meta key, which marks the source of the record when using a subsequent `o save` function')
		.note('Fields can be prefixed with "!" to omit instead of include')
		.note('`o select` and `o pluck` can both iterate down tree structures to obtain multiple results')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one field must be specified to select');
	if (o.cli.meta === false) o.cli.id = o.cli.collection = false;

	var includeFields = [];
	var excludeFields = [];
	o.cli.args.forEach(field => {
		if (field.startsWith('!')) {
			excludeFields.push(field);
		} else {
			includeFields.push(field);
		}
	})
	if (includeFields.length && excludeFields.length) throw new Error('Specifying both include and exclusion fields makes no sense');

	o.on('doc', doc =>
		o.output.doc(
			_(doc)
				.thru(v => includeFields.length ? includeFields.reduce((total, path) => _.set(total, path, o.utilities.getEndpoints(doc, path)), {}) : v)
				.thru(v => excludeFields.length ? _.omit(v, excludeFields) : v)
				.thru(d => o.cli.id && doc._id ? _.set(d, '_id', doc._collection) : _.omit(d, '_id'))
				.thru(d => o.cli.collection && doc._collection ? _.set(d, '_collection', doc._collection) : _.omit(d, '_collection'))
				.value()
		)
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
