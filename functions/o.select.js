var _ = require('lodash');
var cli = require('commander');
module.exports = o => {
	o.cli
		.description('Select a series of fields from an input collection')
		.usage('<field...>')
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
				.value()
		)
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
