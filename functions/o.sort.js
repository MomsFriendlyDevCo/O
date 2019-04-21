var _ = require('lodash');
var siftShorthand = require('sift-shorthand');
module.exports = o => {
	o.cli
		.description('Sort a collection of documents by given fields (this function BLOCKS)')
		.usage('[fields...]')
		.option('-m, --memory', 'use in-memory caching instead of disk')
		.note('Memory caching is extremely RAM intensive and large collections cause out-of-memory errors')
		.note('If no fields are specified the top level element is used for comparison')
		.note('Omit the field if the input is just an array of strings or numbers to compare those directly')
		.parse();

	var fields = siftShorthand.values(o.cli.args, {merge: _.merge}); // Flatten dotted notation
	if (o.verbose) o.log(1, 'Sorting by ', _.size(fields) ? _.map(fields, (v, k) => (v ? '+' : '-') + k).join(', ') : 'entire document');

	if (o.cli.memory) { // Use memory method
		o.on('collection', docs =>
			o.output.collection(
				_.size(fields)
					? _.orderBy(docs, ..._.unzip(_.map(fields, (v, k) => [i => _.get(i, k), v ? 'asc' : 'desc'])))
					: _.sortBy(docs)
			)
		);
	} else { // Cache documents to disk storing their sort criteria, then reassemble and output
		throw new Error('Only `o sort --memory` is supported at the moment');
	}

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream(blocking = true))
		.then(()=> o.output.endCollection())
};
