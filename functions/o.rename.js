var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Change keys within a collection')
		.usage('<from/to...>')
		.option('-d, --discard', 'Remove all fields not explicitly recognised here')
		.note('Fields of the form "FROM/TO" are renamed')
		.note('Fields prefixed with "!" or "-" are omitted')
		.note('Fields prefixed with "+" are kept (in discard mode only)')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one field must be specified to operate on');

	// Compose an object of key => toField||null
	var operations = _.chain(o.cli.args)
		.map(arg => {
			var match;
			if (/^(\!\-)/.test(arg)) { // FORM: !FIELD || -FIELD
				if (/\//.test(arg)) throw new Error('Rename field definitions cannot both omit AND rename');
				return [ arg.substr(1), null ];
			} else if (/^\+/.test(arg)) { // FORM: +FIELD
				if (/\//.test(arg)) throw new Error('Rename field definitions cannot both include AND rename');
				return [ arg.substr(1), arg.substr(1) ];
			} else if (match = /^(?<from>.+?)\/(?<to>.+)$/.exec(arg)?.groups) { // Form: FROM/TO
				return [ match.from, match.to ];
			} else {
				throw new Error(`Cannot parse rename argument "${arg}"`);
			}
		})
		.fromPairs()
		.value()

	if (!Object.keys(operations).length) throw new Error('No rename / omit operations to perform');
	o.log(1, 'Performing', Object.keys(operations).length, 'rename / omit operations');

	o.on('doc', doc => {
		o.output.doc(
			_(doc)
				.toPairs()
				.map(([key, val]) => {
					if (operations[key] === null) { // Omit field
						return;
					} else if (operations[key]) { // Rename field
						return [ operations[key], val ];
					} else if (o.cli.discard) { // Unknown field in discard mode
						return;
					} else { // Unknown field without discard
						return [ key, val ];
					}
				})
				.filter(Boolean) // Remove duds
				.fromPairs()
				.value()
		)
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
