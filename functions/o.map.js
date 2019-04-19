var _ = require('lodash');
var siftShorthand = require('sift-shorthand');

module.exports = o => {
	o.cli
		.description('Run a stream of documents though a Javascript function')
		.usage('<_.lodashFunc>...')
		.note('Use "#" in the arg list to designate where the document should be placed in the input parameters (e.g. (`_.keys(#)`)')
		.note('If no brackets are used the document is placed in the one and only input parameter (e.g. `_.keys`)')
		.note('Named string functions beginning with `_.` are run via Lodash')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one function must be supplied');

	var guessArgument = v =>
		v == '#' ? '#'
		: /^(['"]).*\1$/.test(v) ? _.trim(v, '"\'')
		: v == 'true' ? true
		: v == 'false' ? false
		: v == 'null' ? null
		: v == 'undefined' ? undefined
		: v;

	var funcs = o.cli.args.map(arg => {
		var matcher;
		if (matcher = /^_\.(?<func>.+?)(\((?<args>.+)\))?$/.exec(arg)) {
			// Lodash function {{{
			if (!_[matcher.groups.func]) throw new Error(`Lodash function "_.${matcher.groups.func}" is not valid`);
			if (matcher.groups.args) { // Has parameters
				var args = matcher.groups.args
					.split(/\s*,\s*/)
					.map(v => guessArgument(v))

				return doc => Promise.resolve(
					_[matcher.groups.func].apply(o,
						args.map(a => a == '#' ? doc : a) // Replace '#' placeholder with the input document
					)
				);
			} else { // No parameters
				return doc => Promise.resolve(_[matcher.groups.func](doc));
			}
			// }}}
		} else {
			throw new Error(`Unknown function type: "${arg}"`);
		}
	});

	o.on('doc', doc =>
		o.utilities.promiseAllSeries(funcs.map(func => ()=>
			func(doc)
				.then(res => doc = res)
		))
			.then(doc => o.output.doc(doc))
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
