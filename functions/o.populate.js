var _ = require('lodash');
var monoxide = require('monoxide');
var plur = require('plur');
var promisify = require('util').promisify;
var siftShorthand = require('sift-shorthand');

module.exports = o => {
	o.cli
		.description('Extend a sub-object field by its ID')
		.option('--collection <name>', 'Use the specified collection name instead of the document._collection meta property')
		.usage('<paths[=mapping]...>')
		.note('Paths can be specified in dotted notation format')
		.note('Adding a mapping will populate the full object at the specified path instead of overwriting the original')
		.note('If no schema is available to determine the reference the field name is tried followed by its plural before giving up')
		.parse();

	var paths = siftShorthand.values(o.cli.args);

	if (!paths) throw new Error('At least one path must be specified to populate a document');

	o.on('doc', doc => {
		var collection = o.cli.collection || _.get(doc, '_collection');
		if (!collection) throw new Error('Unable to determine collection for document, set doc._collection or use `--collection <name>`');
		if (!o.db.models[collection]) throw new Error(`Invalid or non-initialized collection "${collection}"`);

		return Promise.all(
			_(paths)
				.pickBy((v, k) => v) // Remove negative paths (i.e. `path,pathWithMapping=otherPath,!negative`
				.map((mapping, path) => {
					var population = { // Collection we are populating against
						path: _.isString(mapping) ? mapping : path,
						match: {_id: monoxide.utilities.objectID(_.get(doc, path))},
						model: _.get(o, ['db', 'models', collection, '$mongooseModel', 'schema', 'paths', path, 'options', 'ref']),
					};

					// No model available - try and guess it from context
					if (!population.model) {
						var lastSegment = _.last(path.split('.'));
						var plural = plur(lastSegment, 2);
						if (o.db.models[lastSegment]) { // Matches exact
							population.model = lastSegment;
						} else if (o.db.models[plural]) { // Found plural
							population.model = plural;
						} else {
							throw new Error(`Unable to determine population remote model. Tried looking for "${lastSegment}" and "${plural}" but couldnt find a matching model`);
						}
					}

					if (!population.path) throw new Error('Unable to determine population local path');
					if (!population.match) throw new Error('Unable to determine population match criteria');

					return Promise.resolve()
						.then(()=> new Promise((resolve, reject) => o.db.models[population.model].$mongoModel.aggregate([
							{$match: population.match},
							{$limit: 1},
						], (err, cursor) => {
							if (err) return reject(err);
							resolve(cursor);
						})))
						.then(cursor => cursor.next())
						.then(res => {
							if (res) _.set(doc, population.path, res);
						})
				})
		)
			.then(()=> o.output.doc(doc))
	});

	return Promise.resolve()
		.then(()=> o.db.connect())
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
