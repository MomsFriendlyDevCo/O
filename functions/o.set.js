var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Select a series of fields from an input collection')
		.usage('<field...>')
		.option('--no-collection', 'Also filter out the `_collection` meta key, which marks the source of the record when using a subsequent `o save` function')
		.parse();

	if (!o.cli.args.length) throw new Error('Fields and values must be specified');

	var setFields = o.cli.args.reduce((fields, field) => { // Work out fields we are merging and compile templates
		if (/\$\{/.test(field)) { // Key = val via ES6 backticks
			var bits = field.split(/\s*=\s*/, 2);
			fields.push({type: 'template', key: bits[0], value: _.template(bits[1])});
		} else if (/=/.test(field)) { // Key = val
			var bits = field.split(/\s*=\s*/, 2);
			fields.push({type: 'assign', key: bits[0], value: bits[1]});
		} else {
			throw new Error(`Unknown set expression: "${field}"`);
		}
		return fields;
	}, []);
	o.log(1, 'Setting fields', setFields);

	o.on('doc', doc => {
		setFields.forEach(field => {
			if (field.type == 'assign') {
				_.set(doc, field.key, field.value);
			} else if (field.type == 'template') {
				console.warn('Apply template', field, 'with values', doc, '==', field.value(doc));
				_.set(doc, field.key, field.value(doc));
			}
		});
		return o.output.doc(doc);
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
