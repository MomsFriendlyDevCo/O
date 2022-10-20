var _ = require('lodash');
var hanson = require('hanson');

module.exports = o => {
	o.cli
		.description('Set fields within a collection of documents')
		.usage('<field=value...>')
		.option('--key <name>', 'Enter single key-set mode, this is a workaround when accepting large JSON blobs on the command line')
		.note('Fields can be specified in dotted notation format')
		.note('Fields containing any ES6 tags will be evaluated with the current document context e.g. `bar=${foo}` copies the value of `foo` into `bar`')
		.note('When --key is specified only one key can be set and all other command line parameters are assumed to be one JSON blob')
		.parse();

	if (!o.cli.args.length) throw new Error('Fields and values must be specified');

	var setFields = [];

	if (o.cli.key) {
		setFields = [{type: 'assign', key: o.cli.key, value: hanson.parse(o.cli.args.join(' '))}];
	} else {
		var setFields = o.cli.args.reduce((fields, field) => { // Work out fields we are merging and compile templates
			if (/\$\{/.test(field)) { // Key = val via ES6 backticks
				var bits = field.split(/\s*=\s*/, 2);
				fields.push({type: 'template', key: bits[0], value: _.template(bits[1])});
			} else if (/^.+?={/.test(field)) { // Raw key = JSON / HanSON object merge
				var bits = field.split(/\s*=\s*/, 2);
				fields.push({type: 'assign', key: bits[0], value: hanson.parse(bits[1])});
			} else if (/^{/.test(field)) { // Raw JSON / HanSON object merge
				fields.push({type: 'merge', value: hanson.parse(field)});
			} else if (/=/.test(field)) { // Key = val
				var bits = field.split(/\s*=\s*/, 2);
				fields.push({type: 'assign', key: bits[0], value: bits[1]});
			} else {
				throw new Error(`Unknown set expression: "${field}"`);
			}
			return fields;
		}, []);
	}

	if (o.verbose == 1 ) o.log(1, 'Setting fields', setFields.map(f => f.key).join(', '));
	if (o.verbose > 1) o.log(2, 'Setting fields', _(setFields).mapKeys(v => v.key).mapValues(v => v.value).value());

	o.on('doc', doc => {
		setFields.forEach(field => {
			if (field.type == 'assign') {
				_.set(doc, field.key, field.value);
			} else if (field.type == 'template') {
				_.set(doc, field.key, field.value(doc));
			} else if (field.type == 'merge') {
				_.merge(doc, field.value);
			}
		});
		return o.output.doc(doc);
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
