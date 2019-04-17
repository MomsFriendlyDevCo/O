var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Set fields within a collection of documents')
		.usage('<field=value...>')
		.note('Fields can be specified in dotted notation format')
		.note('Fields containing any ES6 tags will be evaluated with the current document context e.g. `bar=${foo}` copies the value of `foo` into `bar`')
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
