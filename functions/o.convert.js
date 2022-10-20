var _ = require('lodash');

module.exports = o => {
	o.cli
		.description('Convert between various data types')
		.option('--from <format>', 'Specify the input format to convert FROM')
		.option('--to <format>', 'Specify the input format to convert TO')
		.option('--c2o', 'Alias for `--from=collection --to=object`')
		.option('--o2c', 'Alias for `--from=object --to=collection`')
		.option('--key <name>', 'Specify the key name [to=object]', 'id')
		.option('--key-as <name>', 'Specify what should happen with object keys [to=collection]')
		.option('--key-from <name>', 'Specify where to take the object key from [to=object]')
		.option('--no-remove-key', 'Dont remove the source key from the rest of the body when converting from an object')
		.note('Valid formats are: "collection", "object"')
		.note('When using --to=object you can specify the numeric index offset using --key-from=INDEX')
		.parse();

	return Promise.resolve()
		// Sanity checks {{{
		.then(()=> {
			// Aliases
			if (o.cli.o2c) Object.assign(o.cli, {from: 'object', to: 'collection'});
			if (o.cli.c2o) Object.assign(o.cli, {from: 'collection', to: 'object'});

			// Checks
			if (!o.cli.from || !o.cli.to) throw new Error('Both --from=<format> and --to=<format> (or one of their shortcuts) must be specified');

			// Valid converstion?
			if (
				![
					['object', 'collection'],
					['collection', 'object'],
				].some(([from, to]) => o.cli.from == from && o.cli.to == to)
			) throw new Error(`Unsupported type conversion: ${o.cli.from} => ${o.cli.to}`);

			// Checks > To=Object
			if (o.cli.to == 'object') {
				if (!o.cli.key) throw new Error('--key needs to have a value when converting to objects');
				if (!o.cli.keyFrom) throw new Error('--key-from needs to be specified when converting to objects');
			}
		})
		// }}}
		.then(obj => {
			if (o.cli.from == 'object' && o.cli.to == 'collection') {
				// Convert object -> collection {{{
				return Promise.resolve()
					.then(()=> o.output.startCollection())
					.then(()=> o.input.requestObject())
					.then(obj => Object.entries(obj).map(([key, body]) =>
						o.utilities.omitNullish({
							...(o.cli.keyAs // Include key if the user has specified --key-as
								? {
									[o.cli.keyAs]: key
								}
								: {}
							),
							...body,
						}))
					)
					.then(o.output.collection)
					.then(()=> o.output.endCollection())
				// }}}
			} else if (o.cli.from == 'collection' && o.cli.to == 'object') {
				// Convert collection -> object {{{
				return o.input.requestArray()
					.then(items => Object.assign({}, ...items.map((item, itemIndex) => ({
						[o.cli.key == 'INDEX' ? itemIndex : item[o.cli.keyFrom]] // Set key from offset or extracted key value
						:
						o.cli.removeKey && o.cli.keyFrom != 'INDEX' // Optionally omit the source key (default)
							? _.omit(item, o.cli.keyFrom)
							: item,
					}))))
					.then(o.output.object)
				// }}}
			} else {
				// Edge cases {{{
				throw new Error('Unknown operation');
				// }}}
			}
		})
};
