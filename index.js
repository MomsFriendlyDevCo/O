var _ = require('lodash');
var bfj = require('bfj');
var bfjc = require('bfj-collections');
var commander = require('commander');
var commanderExtras = require('commander-extras');
var eventer = require('@momsfriendlydevco/eventer');
var fs = require('fs');
var fspath = require('path');
var glob = require('globby');
var monoxide = require('monoxide');
var os = require('os');
var promisify = require('util').promisify;
var temp = require('temp');

var o = {
	verbose: 0,
	functions: {}, // Key is short (basename) function name sans 'o.*.js` trimming, value is the require'd module export which should be {description$, help(), exec()}
	settings: {
		global: {
			includePaths: [
				fspath.join(__dirname, 'functions', '**', 'o.*.js'),
			],
		},
	},
	profile: {
		profile: undefined, // The currently active profile (if any)
		uri: undefined, // MongoDB URI to connect to
		connectionOptions: {}, // MongoDB extra connection details
		pretty: false, // Pretty print output?
		schemas: [], // Include these globs (globby compatible string / array) before running
		savePath: fspath.join(os.tmpdir(), 'o'),
		mangle: {
			collections: {
				lowerCase: true,
			},
			fields: {
				objectIds: ['*._id'], // COLLECTION.PATH glob
			},
		},
	},


	/**
	* Utility function to log to STDERR
	* This function automatically filters by verbosity level
	* @param {number} [level=0] Debugging verbosity level, the higher the number the rarer it is that users will see the output
	* @param {*} msg... Strings or objects to log
	*/
	log: (...msg) => {
		if (msg.length && typeof msg[0] == 'number') { // Supplied a verbosity number
			var verbosity = msg.shift();
			if (o.verbose < verbosity) return; // Not in a verbose-enough mode to output
		}
		console.warn.apply(o, msg);
	},


	/**
	* Run an O function
	* This can also be used within a function to redirect to another
	* @param {string} func The function name to run
	* @param {array} [args...] CLI arguments to pass
	*/
	run: (func, ...args) => {
		if (!o.functions[func]) throw new Error(`Unable to run non-existant function "${func}"`);

		o.log(4, 'Running function', func);

		o.cli = new commander.Command() // Setup a stub Commander Command
			.version(require('./package.json').version)
			.name(`o ${func}`)
			.usage('[arguments]')
			.option('-v, --verbose', 'Be verbose - use multiple to increase verbosity', (v, total) => total + 1, 0)

		// Sub-class the .parse function to always work with the rewritten argument array + inherit common parameters like verbose
		var originalParse = o.cli.parse;
		o.cli.parse = ()=> {
			originalParse.call(o.cli, [
				process.argv[0], // Original intepreter (usually node)
				o.functions[func].path, // Path to script (not this parent script)
				...args, // Rest of command line after the shorthand command name
			]);
			if(!o.verbose) o.verbose = o.cli.verbose || 0; // Inherit verbosity from command line
		};

		return Promise.resolve(require(o.functions[func].path))
			.then(module => {
				if (!_.isFunction(module)) throw new Error(`O module "${o.functions[func].path}" did not return a promise!`);
				return Promise.resolve(module.call(o, o));
			})
			.then(()=> o.emit('close'))
	},


	/**
	* Various database handling functionality
	*/
	db: {
		connect: ()=>
			Promise.resolve()
				// Queue up clean-up events {{{
				.then(()=> {
					o.on('close', ()=> monoxide.disconnect())
				})
				// }}}
				// Connect to the database {{{
				.then(()=> {
					if (!o.profile.uri) throw new Error('No database URI specified');
				})
				.then(()=> promisify(monoxide.use)(['promises', 'iterators']))
				.then(()=> o.log(2, 'Connecting to', o.output.obscure(o.profile.uri)))
				.then(()=> monoxide.connect(o.profile.uri, o.profile.connectionOptions))
				.then(()=> o.log(2, 'Connected'))
				// }}}
				// Include all schema files {{{
				.then(()=> glob(_.castArray(o.profile.schemas).map(p => o.utilities.resolvePath(p))))
				.then(paths => o.input.include(paths))
				.then(()=> o.db.models = monoxide.models)
				.then(()=> { // Load shema-less collections as raw models
					if (o.settings.skipRawCollections) return;
					var knownModels = new Set(_.map(o.db.models, m => m.$mongoModel.name));

					return monoxide.connection.db.collections()
						.then(collections => collections.filter(c => !knownModels.has(c.s.name)))
						.then(collections =>
							collections.map(c => {
								o.db.models[c.s.name] = {
									$rawCollection: true,
									$mongoModel: monoxide.connection.collection(c.s.name),
								};
								return c.s.name;
							})
						)
						.then(collectionNames => o.log(3, 'Loaded raw collections:', collectionNames.join(', ')))
				}),
				// }}}

		models: {}, // Eventual pointer to the available database models when the connection has finished
	},


	/**
	* Various methods of accepting data
	* @var {Object}
	*/
	input: {

		/**
		* Request that STDIN provides a stream of documents
		* When blocking this function flushes to disk then reads back the resultant file
		* NOTE: Binding to the collection emitter uses tons of RAM to cache the results, bind to the collectionFile event and process the output file manually if possible
		* @param {boolean} [blocking=false] Block the stream and wait for all documents before emitting anything, useful with 'collection*' emitters to work with an entire collection
		* @emits doc Emitted on each document, to output use `o.output.doc()`. If nothing binds to this event no documents are output (use `collections` or some other binding to handle output elsewhere). Called as (doc)
		* @emits collection Emitted with the full collection object when we have it. Subscribing to this emitter is not recommended as its very very memory intensive - try to work with the raw file in `collectionFile` instead. Called as (collectionDocs)
		* @emits collectionFile (only if blocking=true) Emitted when a collection temporary file name has been allocated. Called as (path)
		* @emits collectionStream Emitted when a valid read stream is found and streaming is about to start
		* @returns {Promise} A promise which resolves when the collection stream has completed
		*/
		requestCollectionStream: (blocking = false) => {
			if (process.stdin.isTTY) return new Error('Input stream is a TTY - should be a stream of document data');
			var collection = []; // Collection cache

			return Promise.resolve()
				.then(()=> {
					if (!blocking) {
						return process.stdin;
					} else {
						var tempFile = temp.path({prefix: 'o.', suffix: '.json'});
						o.log(3, 'Using blocking temporary file', tempFile);
						return Promise.resolve()
							.then(()=> o.on('close', ()=> fs.promises.unlink(tempFile))) // Clean up the tempFile when we exit
							.then(()=> o.emit('collectionFile', tempFile))
							.then(()=> new Promise((resolve, reject) => {
								var writeStream = fs.createWriteStream(tempFile)
									.on('close', ()=> resolve(fs.createReadStream(tempFile)))

								process.stdin.pipe(writeStream);
							})) // Exit with writeStream context
					}
				})
				.then(readStream => o.emit('collectionStream', readStream).then(()=> readStream))
				.then(readStream => new Promise((resolve, reject) => { // Start streaming from the input stream
					var docIndex = 0;
					var streamer = bfjc(readStream, {allowScalars: true, pause: false}) // Slurp STDIN via BFJ in collection mode and relay each document into an event emitter, we also handling our own pausing
						.on('bfjc', doc => {
							if (o.listenerCount('collection')) collection.push(doc);
							var resume = streamer.pause(); // Pause streaming each time we accept a doc and wait for the promise to resolve
							o.emit('doc', doc, docIndex++)
								.then(()=> resume()) // ... then continue
						})
						.on(bfj.events.end, resolve) // Resolve when the stream terminates
						.on(bfj.events.error, reject)
				}))
				.then(()=> o.emit('collection', collection))
		},


		/**
		* Includes external JS files in series
		* If a file returns a function it is executed, promises are resolved before continuing in series
		* @returns {Promise} A promise when all files are included
		*/
		include: paths =>
			o.utilities.promiseAllSeries(paths.map(path => ()=> {
				o.log(3, `Including schema file "${path}"`);

				var result = require(path);
				return Promise.resolve(_.isFunction(result) ? result() : result);
			})),
	},


	/**
	* Various methods of outputting data
	* @var {Object}
	*/
	output: {
		/**
		* Output an object similar to JSON.stringify but honoring pretty-print settings
		*/
		json: obj =>
			obj === undefined ? 'null'
			: o.profile.pretty ? JSON.stringify(obj, null, '\t')
			: JSON.stringify(obj),


		/**
		* Try to obscure things that look like passwords from strings
		* @param {string} input The input string to scan
		* @returns {string} The possibly mutated input string
		*/
		obscure: input =>
			input.replace(/:([^\/]+?)@/g, ':***@'),

		/**
		* Output a single document to STDOUT, following standard JSON encoding
		* @param {Object} doc The document to output
		* @returns {Promise} A promise which will resolve when the document has been sent to STDOUT
		*/
		doc: doc =>
			o.output.write(
				(o.output._docCount++ > 0 ? ',' : '') // Prefix with comma?
				+ o.output.json(doc)
			),


		/**
		* Output an entire collection as a series of docs
		* This really just calls o.output.doc() in series on every document
		* @param {array <Object>} docs
		* @returns {Promise} A promise for when the output finishes
		*/
		collection: docs =>
			o.utilities.promiseAllSeries(docs.map(doc => ()=> o.output.doc(doc))),


		/**
		* Output any artibrary type using logic to try to work out what it is
		* @param {*} input The input that needs to be output
		* @returns {Promise} A promise for when the output finishes
		*/
		any: input =>
			_.isArray(input) ? o.output.startCollection().then(()=> o.output.collection(input)).then(()=> o.output.endCollection())
			: _.isObject(input) ? o.output.doc(input)
			: o.output.write(o.output.json(input)),

		/**
		* Open the connection to STDOUT
		* @returns {Promise} A promise which returns when the output stream has started
		* NOTE: This is really just a stub right now, but may be more in the future
		*/
		start: ()=> Promise.resolve(),


		/**
		* Signal the start of a document array
		* @returns {Promise} A promise which will resolve when the output stream has been instanciated
		*/
		startCollection: ()=> {
			o.output._startedCollection = true;
			return o.output.start()
				.then(()=> o.output.write('['));
		},


		/**
		* Close the connection to STDOUT
		* @returns {Promise} A promise which returns when the output stream has terminated
		*/
		end: ()=> new Promise((resolve, reject) => {
			process.stdout.end(err => {
				if (err) return reject(err);
				resolve();
			});
		}),


		/**
		* Signal the end of a document array
		* @returns {Promise} A promise which will resolve when the output stream has terminated
		*/
		endCollection: ()=>
			Promise.resolve()
				.then(()=> o.output._startedCollection && o.output.write(']'))
				.then(()=> o.output._startedCollection = false)
				.then(()=> o.output.end()),


		/**
		* Output raw data to STDOUT
		* @param {string|Buffer} text The body text to output to STDOUT
		* @returns {Promise} A promise which will resolve when the stream write finishes
		*/
		write: text => new Promise((resolve, reject) => {
			var hasWritten = process.stdout.write(text, 'utf-8');
			if (!hasWritten) {
				process.stdout.once('drain', resolve);
			} else {
				process.nextTick(resolve);
			}
		}),


		_startedCollection: false,
		_docCount: 0,
	},


	/**
	* Various utlity functions
	* @example Evaluate a series of promises with a delay, one at a time, in order (note that the map returns a promise factory, otherwise the promise would execute immediately)
	*/
	utilities: {
		/**
		* Execute promises in series
		* Promise.allSeries(
		*   [500, 400, 300, 200, 100, 0, 100, 200, 300, 400, 500].map((delay, index) => ()=> new Promise(resolve => {
		*     setTimeout(()=> { console.log('EVAL', index, delay); resolve(); }, delay);
		*   }))
		* )
		* @var {Object}
		* @url https://github.com/MomsFriendlyDevCo/Nodash
		*/
		promiseAllSeries: promises =>
			promises.reduce((chain, promise) =>
				chain.then(()=>
					Promise.resolve(
						typeof promise == 'function' ? promise() : promise
					)
				)
				, Promise.resolve()
			),


		/**
		* Attempt to resolve a path to the full path honoring home shorthand
		*/
		resolvePath: path =>
			path
				.split(fspath.sep)
				.map(p => p == '~' ? os.homedir() : p) // Resolve '~'
				.join(fspath.sep),


		/**
		* Walk down an object by a path branching at each array
		* This function is similar to _.get() except that if any segment is an array an array of all matching endpoints are returned rather than one scalar
		* @param {Object} doc The input document
		* @param {string|array} path The path either in dotted notation or an array
		* @returns {*} Either the single endpoint of the path result or an array of matching endpoints
		*/
		getEndpoints: (doc, path) => {
			var recursed = false; // Encountered an array?
			var results = [];
			var segments = _.isString(path) ? path.split('.') : path;

			var examine = (node, segmentIndex) => {
				if (!node) { // Nothing else to iterate down
					return;
				} else if (segmentIndex == segments.length) { // Last item - return this node
					results.push(node);
				} else if (_.isArray(node)) { // Array, iterate down
					recursed = true;
					node.forEach(n => examine(n, segmentIndex));
				} else { // Scalar / object, walk down
					var nextKey = segments[segmentIndex];
					examine(node[nextKey], segmentIndex+1);
				}
			};

			examine(doc, 0);

			return (
				!results.length ? undefined
				: !recursed && results.length == 1 ? results[0]
				: results
			)
		},
	},
};
eventer.extend(o); // Glue eventer onto session object
module.exports = o;
