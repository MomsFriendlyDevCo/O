var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Extract a nested property and return it')
		.usage('<field>')
		.note('The field can include dotted notation for deeply nested structures')
		.note('Unlike `o select` this function can work with object input to extract nested collections')
		.parse();

	if (o.cli.args.length != 1) throw new Error('One field must be specified to get');

	o.log(1, 'Getting nested field', o.cli.args[0]);

	o.on('collection', collection => {
		var tree = collection.length == 1 ? collection[0] : collection;
		if (o.verbose) o.log(2, 'Will traverse', _.isArray(tree) ? 'array' : typeof tree, 'of size', _.size(tree), 'for key', o.cli.args[0]);
		o.output.any(_.get(tree, o.cli.args[0]))
	});

	return Promise.resolve()
		.then(()=> o.input.requestCollectionStream({blocking: true}))
};
