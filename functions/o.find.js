var _ = require('lodash');
var mongoosy = require('@momsfriendlydevco/mongoosy');
var minimatch = require('minimatch');
var timestring = require('timestring');
var siftShorthand = require('sift-shorthand');

module.exports = o => {
	o.cli
		.description('Fetch documents from a collection with an optional query')
		.usage('<collection> [query...]')
		.option('-1, --one', 'Fetch only the first document as an object (not an array)')
		.option('--id <id>', 'Alias of `--one _id=${id}` - i.e. return exactly one record by its ID')
		.option('-c, --count', 'Count documents rather than return them')
		.option('-s, --select <fields...>', 'Select a CSV of fields (may be specified multiple times', (v, total) => total.concat(v.split(/\s*,\s*/)), [])
		.option('-o, --sort <fields...>', 'Sort by a CSV of fields (sort decending with a "-" prefix, may be specified multiple times)', (v, total) => total.concat(v.split(/\s*,\s*/)), [])
		.option('-l, --limit <number>', 'Limit the result to the first number of documents')
		.option('-k, --skip <number>', 'Skip over the first number of documents')
		.option('-n, --dry-run', 'Dont actually run anything, return an empty array')
		.option('-d, --delay <timestring>', 'Add a delay to each record retrieval', v => timestring(v, 'ms'), 0)
		.option('-p, --pluck [field]', 'Return only an array of the single matching field')
		.option('-i, --ids', 'Shorthand for --pluck=_id')
		.option('--count-exact', 'Insist on the exact count of documents rather than the much quicker best estimate')
		.note('The select function is passed directly onto the aggregation projection, if you want more complex selection use `o select` or `o pluck`')
		.parse();

	return Promise.resolve()
		// Sanity checks {{{
		.then(()=> {
			if (o.cli.id) { o.cli.one = true; o.cli.args.push(`{_id: "${o.cli.id}"}`); }
			if (o.cli.count && (o.cli.limit || o.cli.skip)) throw new Error('Specifying --count with --limit or --skip makes no sense');
			if (o.cli.limit && o.cli.one) throw new Error('Specifying --limit and --one makes no sense');
			if (o.cli.limit && (o.cli.limit < 1 || !isFinite(o.cli.limit))) throw new Error('--limit must be a positive, finite integer');
			if (o.cli.skip && (o.cli.skip < 0 || !isFinite(o.cli.skip))) throw new Error('--skip must be a positive (or zero), finite integer');
			if (o.cli.ids) o.cli.pluck = '_id';
			if (/,/.test(o.cli.pluck)) throw new Error('Only one field can be specified in --pluck');
		})
		// }}}
		.then(()=> o.db.connect())
		// Compute aggregation query {{{
		.then(()=> o.input.query(o.cli.args.slice(1)))
		.then(query => {
			o.aggregation = {
				cursor: undefined, // Calculated in next step
				model: o.cli.args.shift(),
				query: undefined, // Final aggregation query to run
			};
			if (_.get(o, 'profile.mangle.collections.lowerCase')) o.aggregation.model = o.aggregation.model.toLowerCase();
			if (!o.db.models[o.aggregation.model]) throw new Error(`Unknown model "${o.aggregation.model}"`);

			var agg = [];
			o.log(3, 'Use query', query);

			// Query / $match
			if (!_.isEmpty(query)) {
				/**
				* Map string to OID types - because Mongo is a pain in the arse with comparisons
				* @param {*} item The item to transform
				* @returns {ObjectId|Object|array} The valid Mongo comparitor
				*/
				var setOID = item => {
					if (_.isString(item)) {
						return new mongoosy.Types.ObjectId(item);
					} else if (_.isObject(item) && (item.$eq || item.$ne)) { // Simple object assignment
						return {
							[_(item).keys().first()]: new mongoosy.Types.ObjectId(_(item).values().first()),
						};
					} else if (_.isObject(item) && (item.$in || item.$nin)) { // Array assignment
						var iterKey = _(item).keys().first();
						return {
							[iterKey]: item[iterKey].map(i => new mongoosy.Types.ObjectId(i))
						};
					}
				};

				o.profile.mangle.fields.objectIds.forEach(glob => {
					var [collection, path] = glob.split('.', 2);
					if (!minimatch(o.aggregation.model, collection)) return; // Not relevent for this collection
					if (query[path]) { // Root path or query is already using dotted notatoin
						query[path] = setOID(query[path]);
					} else if (_.get(query, path)) {
						_.set(query, setOID(_.get(query, path)));
					}
				});

				agg.push({$match: query});
			} else if (!o.cli.count) { // Not counting?
				agg.push({$match: {}}); // Match all (we need at least one stage in the aggregation pipline to keep Mongoose happy)
			}

			// Select / $project
			if (!_.isEmpty(o.cli.select)) agg.push({
				$project: o.cli.select.reduce((total, v) => Object.assign(total, {[v]: 1}), {})}
			);

			// Sort / $sort
			if (!_.isEmpty(o.cli.sort)) agg.push({
				$sort: _(o.cli.sort)
					.split(/\s*,\s*/)
					.mapKeys(v => v.replace(/^-/, ''))
					.mapValues(v => v.startsWith('-') ? -1 : 1)
					.value()
			});

			// Skip / $skip
			if (o.cli.skip) agg.push({$skip: parseInt(o.cli.skip)});

			// Limit / $limit
			if (o.cli.limit) agg.push({$limit: parseInt(o.cli.limit)});

			// Count
			if (o.cli.count) agg.push(o.cli.countExact || !_.isEmpty(query) ? {$count: 'count'} : { $collStats: {count: {}} });

			o.log(3, 'Use aggregation', agg);

			o.aggregation.query = agg;
		})
		// }}}
		// Execute the aggregation query and return a pointer {{{
		.then(()=> {
			if (o.cli.dryRun) {
				o.log(1, 'Dry run mode, not actually running the query');
				return undefined;
			} else {
				o.aggregation.cursor = o.db.models[o.aggregation.model]
					.aggregate(o.aggregation.query)
					.cursor()

				o.log(2, 'Receieved aggregation cursor');
			}
		})
		// }}}
		// Iterate over cursor until exhausted {{{
		.then(()=> o.cli.one || o.cli.count ? o.output.start() : o.output.startCollection())
		.then(()=> {
			if (o.cli.dryRun) return; // Don't actually run anything
			return o.aggregation.cursor.eachAsync(doc => {
				if (doc) { // Fetched a document
					if (o.cli.count) {
						return o.output.doc(doc.count);
					} else if (o.cli.pluck) {
						return o.output.doc(_.get(doc, o.cli.pluck));
					} else {
						doc._collection = o.aggregation.model;
						return o.output.doc(doc);
					}
				} else { // Exhausted cursor
					o.log(2, 'Aggregation exhausted');
					resolve();
				}
			}, {parallel: 1})
			iterateCursor();
		})
		.then(()=> o.cli.one || o.cli.count ? o.output.end() : o.output.endCollection())
		// }}}
};
