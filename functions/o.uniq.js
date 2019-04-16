var _ = require('lodash');
var siftShorthand = require('sift-shorthand');
module.exports = o => {
	o.cli
		.description('Return a uniq set of document (by entire object or by one or more fields)')
		.usage('[fields...]')
		.option('-m, --memory', 'Use in-memory caching instead of disk, this is extremely RAM intensive and large collections could run out of memory')
		// .note('If no fields are specified the top level element is used for comparison')
		.parse();

	var fields = _(siftShorthand.values(o.cli.args)).pickBy(v => v).map((v, k) => k).value();
	if (o.verbose) o.log(1, 'Uniq by', fields.join(', '));

	if (o.cli.memory) { // Use memory method
		o.on('collection', docs =>
			o.output.collection(
				_.uniqWith(docs,
					fields.length
						? (a, b) => _.isEqual(
							fields.map(f => _.get(a, f)).join('-'),
							fields.map(f => _.get(b, f)).join('-')
						)
						: _.isEqual
				)
			)
		);
	} else { // Cache documents to disk storing their sort criteria, then reassemble and output
		throw new Error('Only `o uniq --memory` is supported at the moment');
	}

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream(blocking = true))
		.then(()=> o.output.endCollection())
};
