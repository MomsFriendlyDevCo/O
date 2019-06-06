var _ = require('lodash');
var siftShorthand = require('sift-shorthand');
var vm = require('vm');

module.exports = o => {
	o.cli
		.description('Run a stream of documents though a Javascript function')
		.usage('[--collection] <_.lodashFunc | ES6 arrow func>...')
		.option('-c, --collection', 'Run the function on the entire collection rather than on individual documents')
		.note('Use "#" in the arg list to designate where the document should be placed in the input parameters (e.g. (`_.keys(#)`)')
		.note('If no brackets are used the document is placed in the one and only input parameter (e.g. `_.keys`)')
		.note('Named string functions beginning with `_.` are run via Lodash')
		.note('Using --collection causes the entire collection to be held in memory (and blocks) which could cause out-of-memory errors on large data sets')
		.note('All functions are run in series as promise resolutions - i.e. returning a promise will stall for resolution before continuing to next function')
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

				o.log(1, `Map via lodash: _.${matcher.groups.func}(${args.join(', ')})`);
				return doc => Promise.resolve(
					_[matcher.groups.func].apply(o,
						args.map(a => a == '#' ? doc : a) // Replace '#' placeholder with the input document
					)
				);
			} else { // No parameters
				o.log(1, `Map via lodash: _.${matcher.groups.func}(#)`);
				return doc => Promise.resolve(_[matcher.groups.func](doc));
			}
			// }}}
		} else if (matcher = /^(?<document>[a-z0-9_\$]+?)\s*=>/i.exec(arg)) { // ES6 arrow function
			// ES6 Arrow function {{{
			o.log(1, `Map via ES6 arrow function using "${matcher.groups.document}" as document`);
			try {
				var script = new vm.Script(arg);
			} catch (e) {
				throw new Error(`Error while compiling script "${arg}" - ${e.toString()}`);
			}
			return doc => {
				// Run the function passing in a context
				var res = script.runInContext(vm.createContext({
					doc, // Set a global called doc
					[matcher.groups.document]: doc,
				}));

				// If script hands back a function (acting as a function factory) - run the function with the doc as the argument
				if (_.isFunction(res)) res = res(doc);

				return Promise.resolve(res);
			};
			// }}}
		} else {
			throw new Error(`Unknown function type: "${arg}"`);
		}
	});


	if (!o.cli.collection) { // Per-document mode
		o.on('doc', doc =>
			o.utilities.promiseAllSeries(funcs.map(func => ()=>
				func(doc)
					.then(res => doc = res)
			))
				.then(doc => o.output.doc(doc))
		);
	} else { // Entire collection slurp mode
		o.on('collection', collection =>
			o.utilities.promiseAllSeries(funcs.map(func => ()=>
				func(collection)
					.then(res => collection = res)
			))
				.then(doc => o.output.any(collection))
		)
	}

	return Promise.resolve()
		.then(()=> o.cli.collection ? o.output.start() : o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.cli.collection ? o.output.end() : o.output.endCollection())
};
