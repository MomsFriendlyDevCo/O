var _ = require('lodash');

module.exports = o => {
	o.cli
		.description('Transform an array-of-arrays into a collection by named fields')
		.usage('<field...>')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one field name must be specified');

	o.on('doc', doc =>
		o.output.doc(
			o.cli.args.reduce((t, k, i) => {
				t[k] = doc[i];
				return t;
			}, {})
		)
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream({bfj: {allowArrays: true}}))
		.then(()=> o.output.endCollection())
};
