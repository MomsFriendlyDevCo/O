var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Extract a single field from a collection and return it as the mapped value')
		.usage('<field>')
		.option('--flatten', 'Flatten any complex endpoints into multiple returns')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one field must be specified to pluck');

	o.on('doc', doc => {
		var value = o.utilities.getEndpoints(doc, o.cli.args[0]);
		if (_.isArray(value) && o.cli.flatten) {
			value.forEach(v => o.output(v));
		} else {
			o.output.doc(value)
		}
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
