#!/usr/bin/env node

var _ = require('lodash');
var bfj = require('bfj');
var bfjc = require('bfj-collections');
var commander = require('commander');
var eventer = require('@momsfriendlydevco/eventer');
var fs = require('fs');
var fspath = require('path');
var glob = require('globby');
var hanson = require('hanson');
var ini = require('ini');
var monoxide = require('monoxide');
var promisify = require('util').promisify;
var temp = require('temp');

// BUGFIX: Tell fs.promises to STFU about experimental support {{{
if (Object.getOwnPropertyDescriptor(fs, 'promises')) Object.defineProperty(module.exports, 'promises', {get() { return fs.promises }})
// }}}

var o = { // Create initial session
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
		uri: undefined, // MongoDB URI to connect to
		connectionOptions: {}, // MongoDB extra connection details
		pretty: false, // Pretty print output?
		hanson: true, // Parse JSON via hanSON first
		schemas: [], // Include these globs (globby compatible string / array) before running
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
				.then(()=> o.db.models = monoxide.models),
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
		* NOTE: Binding to the collection emitter uses tons of RAM, bind to the collectionFile event and process the output file manually if possible
		* @param {boolean} [blocking=false] Block the stream and wait for all documents before emitting anything, useful with 'collection*' emitters to work with an entire collection
		* @emits doc Emitted on each document, to output use `o.output.doc()`. If nothing binds to this event no documents are output (use `collections` or some other binding to handle output elsewhere). Called as (doc)
		* @emits collection Emitted with the full collection object when we have it. Subscribing to this emitter is not recommended as its very very memory intensive - try to work with the raw file in `collectionFile` instead. Called as (collectionDocs)
		* @emits collectionFile (only if blocking=true) Emitted when a collection temporary file name has been allocated. Called as (path)
		* @returns {Promise} A promise which resolves when the collection stream has completed
		*/
		requestCollectionStream: (blocking = false) => {
			if (process.stdin.isTTY) return reject('Input stream is a TTY - should be a stream of document data');
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
				.then(readStream => new Promise((resolve, reject) => { // Start streaming from the input stream
					var docIndex = 0;
					var streamer = bfjc(readStream, {pause: false}) // Slurp STDIN via BFJ in collection mode and relay each document into an event emitter, we also handling our own pausing
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
			o.profile.pretty
				? JSON.stringify(obj, null, '\t')
				: JSON.stringify(obj),


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
		* @param {array} docs
		*/
		collection: docs =>
			o.utilities.promiseAllSeries(docs.map(doc => ()=> o.output.doc(doc))),


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
	},
};

Promise.resolve()
	// Read in config file (if any) {{{
	.then(()=> process.env.HOME &&
		fs.promises.readFile(fspath.join(process.env.HOME, '.o'))
			.then(contents => ini.decode(contents))
			.then(contents => _.merge(o.settings, contents))
			.catch(()=> {}) // Ignore non-existant config files
	)
	.then(()=> process.env.O_PROFILE && _.merge(o.profile, JSON.parse(process.env.O_PROFILE)))
	// }}}
	// Discover all `o` functions {{{
	.then(()=> glob(o.settings.global.includePaths))
	.then(paths =>
		o.functions = _(paths)
			.mapKeys(path => fspath.basename(path).replace(/^o\./, '').replace(/\.js$/, ''))
			.mapValues(path => ({path}))
			.value()
	)
	// }}}
	// Create commander UI {{{
	.then(()=> {
		var func = process.argv.slice(2).find(a => !a.startsWith('-')); // Find first probable command

		if (!func) { // No commands given - display universal help
			o.cli = commander
				.version(require('./package.json').version)
				.name('o')
				.usage('<function> [arguments]')
				.option('-v, --verbose', 'Be verbose - use multiple to increase verbosity', (v, total) => total + 1, 0)
				.on('--help', ()=> {
					console.log('');
					console.log('Available commands:');
					console.log('');
					_.forEach(o.functions, (v, k) => console.log('  o', k));
					console.log('(Use `o <function> --help` for help with individual commands)');
					console.log('');
				})
				.parse(process.argv)
		} else if (o.functions[func]) { // Pass control to sub-command
			o.log(4, 'Running sub-command', func);
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
					...process.argv.slice(3), // Rest of command line after the shorthand command name
				]);
				o.verbose = o.cli.verbose;
			};

			eventer.extend(o); // Glue eventer onto session object

			return Promise.resolve(require(o.functions[func].path))
				.then(module => {
					if (!_.isFunction(module)) throw new Error(`O module "${o.functions[func].path}" does not return a promise!`);
					return Promise.resolve(module.call(o, o));
				})
				.then(()=> o.emit('close'))
		} else {
			throw new Error(`Unknown O function: ${func}`);
		}
	})
	// }}}
	.catch(e => {
		o.log(0, e)
		process.exit(1);
	})
