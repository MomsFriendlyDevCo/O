var _ = require('lodash');
var mongoosy = require('@momsfriendlydevco/mongoosy');
var plur = require('plur');
var promisify = require('util').promisify;

module.exports = o => {
	o.cli
		.description('Extend a sub-object field by its ID')
		.option('--collection <name>', 'Use the specified collection name instead of the document._collection meta property')
		.option('--select <fields>', 'Only pull the specified fields')
		.option('--no-cache', 'Disable catching already-fetched values, caching can dramatically speed up population across duplicate populations at the cost of memory')
		.usage('<path[@collection][=field]...>')
		.note('Paths can be specified in dotted notation format, arrays are automatically resolved')
		.note('Adding a \'@collection\' specifier will use that collection instead of guessing')
		.note('Adding a specific \'=field\' will only retrieve that one field value rather than populating the full object')
		.note('If no schema is available to determine the reference the field name is tried followed by its plural before giving up')
		.parse();

	var valueCache = {}; // Lookup for already fetched population endpoints

	var paths = o.cli.args; // NOTE: We don't use siftShorthand here as we want the raw input otherwise dotted notation gets screwed up
	if (o.verbose) o.log(1, 'Populate', paths.join(', '));

	if (!paths) throw new Error('At least one path must be specified to populate a document');

	o.on('doc', doc => {
		var collection = o.cli.collection || _.get(doc, '_collection');
		if (!collection) throw new Error('Unable to determine collection for document, set doc._collection or use `--collection <name>`');
		if (!o.db.models[collection]) throw new Error(`Invalid or non-initialized collection "${collection}"`);
		o.log(3, 'Populate doc', doc._id);

		return Promise.all(paths.map(path => {
			var population = { // Collection we are populating against
				path, // In array form from dotted path
				as: undefined, // What to save the key as, defaults to path
				matches: {}, // Calculated below from endpoints, Key= ID to lookup, values = addresses to update with that value
				model: undefined, // Calculated below
				select: o.cli.select ? o.cli.select.split(/\s*,\s*/) : undefined,
			};

			var parsedPath = /^(?<path>.+?)(@(?<model>.+?))?(=(?<as>.+))?$/.exec(path);
			if (!parsedPath) throw new Error(`Unable to parse path "${path}"`);
			population = {...population, ...parsedPath.groups};

			if (!population.model && _.has(o, ['db', 'models', collection, 'schema', 'paths', population.path, 'options', 'ref'])) { // Try and guess model from schema ref
				population.model = _.get(o, ['db', 'models', collection, 'schema', 'paths', population.path, 'options', 'ref']);
			} else {
				var lastSegment = _.last(path.split('.'));
				var plural = plur(lastSegment, 2);
				if (o.db.models[lastSegment]) { // Matches exact
					population.model = lastSegment;
				} else if (o.db.models[plural]) { // Found plural
					population.model = plural;
				} else {
					throw new Error(`Unable to determine population remote model. Tried looking against the schema ref and for "${lastSegment}" and "${plural}" but couldnt find a matching model`);
				}
			}
			//
			// Split path into array notation so its easier to digest
			population.path = population.path.split('.');
			if (!population.as) population.as = population.path;

			var walk = (root, pathOffset = 0, nodePath = []) => {
				var key = population.path[pathOffset];
				var target = root[key];
				if (_.isArray(target)) { // Iterate down array
					target.forEach((node, index) => walk(node, pathOffset + 1, nodePath.concat([key, index])));
				} else if (_.isObject(target)) {
					walk(target, pathOffset + 1, nodePath.concat([key]));
				} else if (pathOffset >= population.path.length - 1) {
					if (!target) return; // Segment doesn't exist
					if (!population.matches[target]) population.matches[target] = [];
					population.matches[target].push(nodePath.concat([key]));
				} else {
					// Implies Exhausted path - path segment probably doesn't exist within the document
					// throw new Error(`Cannot iterate into population path "${nodePath.concat([key]).join('.')}"`)
				}
			}
			walk(doc, 0);

			// Resolve all cached values if we have them
			if (o.cli.cache) {
				Object.keys(population.matches)
					.filter(key => valueCache[`${population.model}-${key}`]) // Have a cache key?
					.forEach(key => {
						o.log(2, `Resolved lookup of ${key} from cache`);
						var subDocValue = valueCache[`${population.model}-${key}`];
						population.matches[key].forEach(path => _.set(doc, population.as, subDocValue));
						delete population.matches[key]; // Remove from resolve stack
					})
			}

			if (!Object.keys(population.matches).length) return Promise.resolve(); // Nothing needs lookup - presumably already fixed everything via cache

			var docCount = 0;
			return o.db.models[population.model]
				.find({_id: {$in: Object.keys(population.matches).map(oid => new mongoosy.Types.ObjectId(oid))}})
				.select(population.select)
				.cursor()
				.eachAsync(subDoc => {
					var subDocValue = population.select ? _.get(subDoc, population.select) : subDoc;
					if (o.cli.cache) valueCache[`${population.model}-${subDoc._id}`] = subDocValue; // Cache this value if enabled
					o.log(2, 'Got population', `#${++docCount}`, subDoc._id, '=', subDocValue);

					// Replace all endpoints with this value
					population.matches[subDoc._id].forEach(path => _.set(doc, population.as, subDocValue));
				})
				.then(()=> {
					o.log(2, 'Aggregation exhausted after finding', docCount, 'documents');
				})
		}))
			.then(()=> o.output.doc(doc))
	});

	return Promise.resolve()
		.then(()=> o.db.connect())
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
