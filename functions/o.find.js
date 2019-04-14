var _ = require('lodash');
var glob = require('globby');
var monoxide = require('monoxide');
var promisify = require('util').promisify;
var timestring = require('timestring');
var siftShorthand = require('sift-shorthand');

module.exports = o => {
	o.cli
		.description('Fetch documents from a collection with an optional query')
		.name('o find')
		.usage('<collection> [query...]')
		.option('-1, --one', 'Fetch only the first document as an object (not an array)')
		.option('-c, --count', 'Count documents rather than return them')
		.option('-s, --select <fields...>', 'Select a CSV of fields (may be specified multiple times', (v, total) => total.concat(v.split(/\s*,\s*/)), [])
		.option('-o, --sort <fields...>', 'Sort by a CSV of fields (sort decending with a "-" prefix, may be specified multiple times)', (v, total) => total.concat(v.split(/\s*,\s*/)), [])
		.option('-l, --limit <number>', 'Limit the result to the first number of documents')
		.option('-k, --skip <number>', 'Skip over the first number of documents')
		.option('-n, --dry-run', 'Dont actually run anything, return an empty array')
		.option('-d, --delay <timestring>', 'Add a delay to each record retrieval', v => timestring(v), 0)
		.option('--explain', 'Show the aggregation query that is being run (use --dry-run to not actually do anything)')
		.parse(o.args);

	if (!o.profile.uri) throw new Error('No database URI specified');

	o.on('close', ()=> monoxide.disconnect())

	return Promise.resolve()
		// Sanity checks {{{
		.then(()=> {
			if (o.cli.count && (o.cli.limit || o.cli.skip)) throw new Error('Specifying --count with --limit or --skip makes no sense');
			if (o.cli.limit && o.cli.one) throw new Error('Specifying --limit and --one makes no sense');
			if (o.cli.limit && (o.cli.limit < 1 || !isFinite(o.cli.limit))) throw new Error('--limit must be a positive, finite integer');
			if (o.cli.skip && (o.cli.skip < 0 || !isFinite(o.cli.skip))) throw new Error('--skip must be a positive (or zero), finite integer');
		})
		// }}}
		// Connect to DB {{{
		.then(()=> promisify(monoxide.use)(['promises', 'iterators']))
		.then(()=> o.log(1, 'Connecting to', o.profile.uri.replace(/:\/\/(.*?):(.*?)\//, '://\1:***/')))
		.then(()=> monoxide.connect(o.profile.uri, o.profile.connectionOptions))
		.then(()=> o.log(1, 'Connected'))
		// }}}
		// Include all schema files {{{
		.then(()=> glob(o.profile.schemas))
		.then(schemaPaths => schemaPaths.forEach(path => {
			o.log(2, `Including schema file "${path}"`);
			require(path);
		}))
		// }}}
		// Compute aggregation query {{{
		.then(()=> {
			o.aggregation = {
				cursor: undefined, // Calculated in next step
				model: o.cli.args.shift(),
				query: undefined, // Calculated in this step
			};
			if (!monoxide.models[o.aggregation.model]) throw new Error(`Unknown model "${o.aggregation.model}"`);

			var agg = [];
			var query = siftShorthand(o.cli.args);
			o.log(3, 'Use query', query);

			if (!_.isEmpty(query)) agg.push({$match: query});
			if (!_.isEmpty(o.cli.select)) agg.push({$project: o.cli.select.reduce((total, v) => Object.assign(total, {[v]: 1}), {})});
			if (!_.isEmpty(o.cli.sort)) agg.push({$sort: o.cli.sort});
			if (o.cli.skip) agg.push({$skip: parseInt(o.cli.skip)});
			if (o.cli.limit) agg.push({$limit: parseInt(o.cli.limit)});
			if (o.cli.count) agg.push({$count: 'count'});
			o.aggregation.query = agg;
		})
		// }}}
		// Execute the aggregation query and return a pointer {{{
		.then(()=> {
			if (o.cli.explain) app.log(0, 'Aggregation query:', `db.${o.aggregation.model}.aggregate(${o.output.json(o.aggregation.query)})`);
			if (o.cli.dryRun) {
				o.log(1, 'Dry run mode, not actually running the query');
				return undefined;
			} else {
				return new Promise((resolve, reject) =>
					monoxide.models[o.aggregation.model].$mongoModel.aggregate(o.aggregation.query, {cursor: {batchSize: 0}}, (err, cursor) => {
						if (err) return reject(err);
						o.aggregation.cursor = cursor;
						resolve();
					})
				);
			}
		})
		// }}}
		// Iterate over cursor until exhausted {{{
		.then(()=> o.cli.one ? o.output.start() : o.output.startCollection())
		.then(()=> new Promise((resolve, reject) => {
			if (o.cli.dryRun) resolve(); // Don't actually run anything
			var iterateCursor = ()=> {
				o.aggregation.cursor.next()
					.then(doc => {
						if (doc) { // Fetched a document
							o.output.doc({
								...doc,
								_collection: o.aggregation.model,
							});
						} else { // Exhausted cursor
							resolve();
						}
					})
					.then(()=> setTimeout(iterateCursor, o.cli.delay)) // Queue next iteration
					.catch(reject)
			};
			iterateCursor();
		}))
		.then(()=> o.cli.one ? o.output.end() : o.output.endCollection())
		// }}}
};
