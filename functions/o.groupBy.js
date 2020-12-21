var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Group a collection by a single key, returning an object')
		.usage('<field>')
		.note('The field can include dotted notation for deeply nested structures')
		.parse();

	if (o.cli.args.length != 1) throw new Error('One field must be specified to get');

	o.log(1, 'Grouping by nested field', o.cli.args[0]);

	o.on('collection', collection => {
		o.output.any(_.groupBy(collection, o.cli.args[0]))
	});

	return Promise.resolve()
		.then(()=> o.input.requestCollectionStream({blocking: true}))
};
