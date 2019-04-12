#!/usr/bin/env node --no-warnings

var _ = require('lodash');
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
	* Various parsing functions
	* @var {Object}
	*/
	parse: {

		/**
		* Parse a query from a string or the available commandline
		* @param {string|array <string>} [args] The string(s) to parse, read left-to-right. If omitted the o.cli.args array is used
		* @returns {Object} A MongoDB / Sift compatible query
		*/
		query: args =>
			_.castArray(args || session.cli.args)
				.reduce((total, arg) => {
					if (/^[\[|{]/.test(arg)) { // Looks like JSON / HanSON
						_.merge(total, session.parse.object(arg));
					} else { // Assume key=val as CSV
						arg
							.split(/\s*,\s*/)
							.forEach(item =>
								_.merge(total, session.parse.keyVal(item))
							);
					}
					return total;
				}, {}),


		/**
		* Parse an input string into a JavaScript object honoring hanson decoding settings
		* @param {string} input The input string to parse
		* @returns {*} The parsed object
		*/
		object: input =>
			session.profile.hanson
				? hanson.parse(input)
				: JSON.parse(input),


		/**
		* Parse a key=val value
		* Boolean values ('true', 'false', just the key == true) are set automatically
		* Dotted notation is supported
		* @param {string} input A single key=val setting
		* @returns {Object} An object with the key and value set
		*/
		keyVal: input => {
			var out = {};
			var keyVal = input.split(/\s*=\s*/, 2);
			if (!keyVal) { // Assume key=true
				_.set(out, keyVal[0], true);
			} else if (keyVal[1] == 'true') {
				_.set(out, keyVal[0], true);
			} else if (keyVal[1] == 'false') {
				_.set(out, keyVal[0], false);
			} else { // Key=Val
				_.set(out, keyVal[0], keyVal[1]);
			}
			return out;
		},
	},


	/**
	* Various methods of outputting data
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
			Promise.resolve()
				.then(()=> { // Start initial document array or continue
					if (!session.output._startedCollection) { // Start
						return session.output.start()
					} else if (session.output._docCount > 0) { // Continue
						return session.output.write(',');
					}
				})
				.then(()=> session.output._docCount++)
				.then(()=> session.output.write(session.output.json(doc))),

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
		write: text => new Promise((resolve, reject) =>
			process.stdout.write(text, err => {
				if (err) reject(err);
				resolve();
			})
		),

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
	.then(()=> new Promise((resolve, reject) => {
		var cli = session.cli = commander
			.version(require('./package.json').version)
			.name('o')
			.usage('<function> [arguments]')
			.option('-v, --verbose', 'Be verbose - use multiple to increase verbosity', (v, total) => total + 1, 0)
			.allowUnknownOption() // Enable so we can pass thru arguments to sub-commands

		_.forEach(session.functions, (v, k) => {
			cli.command(k);
			cli.action(()=> {
				session.verbose = cli.verbose;
				session.args = [
					process.argv[0], // Original intepreter (usually node)
					v.path, // Path to script (not this parent script)
					...process.argv.slice(3), // Rest of command line after the shorthand command name
				];
				session.cli = new commander.Command()
					.allowUnknownOption() // Enable so things like '-v' can be transfered

				eventer.extend(session); // Glue eventer onto session object

				Promise.resolve(require(v.path))
					.then(module => {
						if (!_.isFunction(module)) throw new Error('O module does not expose a function!');
						return Promise.resolve(module.call(session, session));
					})
					.then(()=> session.emit('close'))
					.then(resolve)
					.catch(reject)
			})
		});

		cli.parse(process.argv);
	}))
	// }}}
	.catch(e => session.log(0, e))
