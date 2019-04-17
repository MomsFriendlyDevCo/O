var _ = require('lodash');
var siftShorthand = require('sift-shorthand');
module.exports = o => {
	o.cli
		.description('Sort a collection of documents by given fields (this function BLOCKS)')
		.usage('<fields...>')
		.option('-m, --memory', 'use in-memory caching instead of disk')
		.note('Memory caching is extremely RAM intensive and large collections cause out-of-memory errors')
		.parse();

	var fields = siftShorthand.values(o.cli.args);
	if (!_.keys(fields).length) throw new Error('At least one field must be specified to sort');
	if (o.verbose) o.log(1, 'Sorting by', _.map(fields, (v, k) => (v ? '+' : '-') + k).join(', '));

	if (o.cli.memory) { // Use memory method
		o.on('collection', docs =>
			o.output.collection(_.orderBy(docs, ..._.unzip(_.map(fields, (v, k) => [k, v ? 'asc' : 'desc']))))
		);
	} else { // Cache documents to disk storing their sort criteria, then reassemble and output
		throw new Error('Only `o sort --memory` is supported at the moment');
	}

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream(blocking = true))
		.then(()=> o.output.endCollection())
};
