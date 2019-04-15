var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Extract a single field from a collection and return it as the mapped value')
		.usage('<field>')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one field must be specified to pluck');

	o.on('doc', doc =>
		o.output.doc(doc[o.cli.args[0]])
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
