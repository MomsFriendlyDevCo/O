var _ = require('lodash');
var sift = require('sift').default;
var siftShorthand = require('sift-shorthand');

module.exports = o => {
	o.cli
		.description('Filter a document stream using MongoDB / Sift syntax')
		.usage('<queries...>')
		.parse();

	if (!o.cli.args.length) throw new Error('At least one query string must be specified to filter');

	var siftQuery = siftShorthand(o.cli.args);
	o.log(1, 'Filtering with query', siftQuery);
	var sifter = sift(siftQuery);

	o.on('doc', doc => {
		if (sifter(doc)) o.output.doc(doc);
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
