#!/usr/bin/env node

var _ = require('lodash');
var bfj = require('bfj');
var bfjc = require('bfj-collections');
var commander = require('commander');
var eventer = require('@momsfriendlydevco/eventer');
var fs = require('fs').promises;
var fspath = require('path');
var glob = require('globby');
var hanson = require('hanson');
var ini = require('ini');
var monoxide = require('monoxide');
var promisify = require('util').promisify;

var session = { // Create initial session
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
			if (session.verbose < verbosity) return; // Not in a verbose-enough mode to output
		}
		console.warn.apply(session, msg);
	},


	/**
	* Various database handling functionality
	*/
	db: {
		connect: ()=>
			Promise.resolve()
				// Queue up clean-up events {{{
				.then(()=> {
					session.on('close', ()=> monoxide.disconnect())
				})
				// }}}
				// Connect to the database
				.then(()=> promisify(monoxide.use)(['promises', 'iterators']))
				.then(()=> session.log(1, 'Connecting to', session.profile.uri.replace(/:\/\/(.*?):(.*?)\//, '://\1:***/')))
				.then(()=> monoxide.connect(session.profile.uri, session.profile.connectionOptions))
				.then(()=> session.log(1, 'Connected'))
				// }}}
				// Include all schema files {{{
				.then(()=> glob(session.profile.schemas))
				.then(schemaPaths => schemaPaths.forEach(path => {
					session.log(2, `Including schema file "${path}"`);
					require(path);
				}))
				.then(()=> session.db.models = monoxide.models),
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
		* @emits doc Emitted as (doc) on each found JSON collection document, to output use o.output.doc() (or not if filtering)
		* @returns {Promise} A promise which resolves when the collection stream has completed
		*/
		requestCollectionStream: ()=> new Promise((resolve, reject) => {
			if (process.stdin.isTTY) return reject('Input stream is a TTY - should be a stream of document data');

			var docIndex = 0;
			var streamer = bfjc(process.stdin, {pause: false}) // Slurp STDIN via BFJ in collection mode and relay each document into an event emitter, we also handling our own pausing
				.on('bfjc', doc => {
					var resume = streamer.pause(); // Pause streaming each time we accept a doc and wait for the promise to resolve
					session.emit('doc', doc, docIndex++)
						.then(()=> resume()) // ... then continue
				})
				.on(bfj.events.end, resolve) // Resolve when the stream terminates
				.on(bfj.events.error, reject)
		}),

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
			session.profile.pretty
				? JSON.stringify(obj, null, '\t')
				: JSON.stringify(obj),


		/**
		* Output a single document to STDOUT, following standard JSON encoding
		* @param {Object} [doc] The document to output
		* @returns {Promise} A promise which will resolve when the document has been sent to STDOUT
		*/
		doc: doc =>
			session.output.write(
				(session.output._docCount++ > 0 ? ',' : '') // Prefix with comma?
				+ session.output.json(doc)
			),

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
			session.output._startedCollection = true;
			return session.output.start()
				.then(()=> session.output.write('['));
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
				.then(()=> session.output._startedCollection && session.output.write(']'))
				.then(()=> session.output._startedCollection = false)
				.then(()=> session.output.end()),


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
};

Promise.resolve()
	// Read in config file (if any) {{{
	.then(()=> process.env.HOME &&
		fs.readFile(fspath.join(process.env.HOME, '.o'))
			.then(contents => ini.decode(contents))
			.then(contents => _.merge(session.settings, contents))
			.catch(()=> {}) // Ignore non-existant config files
	)
	.then(()=> process.env.O_PROFILE && _.merge(session.profile, JSON.parse(process.env.O_PROFILE)))
	// }}}
	// Discover all `o` functions {{{
	.then(()=> glob(session.settings.global.includePaths))
	.then(paths =>
		session.functions = _(paths)
			.mapKeys(path => fspath.basename(path).replace(/^o\./, '').replace(/\.js$/, ''))
			.mapValues(path => ({path}))
			.value()
	)
	// }}}
	// Create commander UI {{{
	.then(()=> {
		var func = process.argv.slice(2).find(a => !a.startsWith('-')); // Find first probable command

		if (!func) { // No commands given - display universal help
			session.cli = commander
				.version(require('./package.json').version)
				.name('o')
				.usage('<function> [arguments]')
				.option('-v, --verbose', 'Be verbose - use multiple to increase verbosity', (v, total) => total + 1, 0)
				.on('--help', ()=> {
					console.log('');
					console.log('Available commands:');
					console.log('');
					_.forEach(session.functions, (v, k) => console.log('  o', k));
					console.log('(Use `o <function> --help` for help with individual commands)');
					console.log('');
				})
				.parse(process.argv)
		} else if (session.functions[func]) { // Pass control to sub-command
			session.log(4, 'Running sub-command', func);
			session.cli = new commander.Command() // Setup a stub Commander Command
				.version(require('./package.json').version)
				.name(`o ${func}`)
				.usage('[arguments]')
				.option('-v, --verbose', 'Be verbose - use multiple to increase verbosity', (v, total) => total + 1, 0)

			// Sub-class the .parse function to always work with the rewritten argument array + inherit common parameters like verbose
			var originalParse = session.cli.parse;
			session.cli.parse = ()=> {
				originalParse.call(session.cli, [
					process.argv[0], // Original intepreter (usually node)
					session.functions[func].path, // Path to script (not this parent script)
					...process.argv.slice(3), // Rest of command line after the shorthand command name
				]);
				session.verbose = session.cli.verbose;
			};

			eventer.extend(session); // Glue eventer onto session object

			return Promise.resolve(require(session.functions[func].path))
				.then(module => {
					if (!_.isFunction(module)) throw new Error(`O module "${session.functions[func].path}" does not return a promise!`);
					return Promise.resolve(module.call(session, session));
				})
				.then(()=> session.emit('close'))
		} else {
			throw new Error(`Unknown O function: ${func}`);
		}
	})
	// }}}
	.catch(e => {
		session.log(0, e)
		process.exit(1);
	})
