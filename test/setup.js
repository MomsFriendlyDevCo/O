var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var fspath = require('path');
var monoxide = require('monoxide');
var mlog = require('mocha-logger');
var scenario = require('mongoose-scenario');
var promisify = require('util').promisify;


var mongoURI = 'mongodb://localhost/o-cli-test';

// Setting this to FALSE will disable the database teardown (i.e. not erase the Schema + DB when done)
// This is useful for debugging but only with single scripts as each test script will expect a fresh database
var allowTeardown = process.env.TEARDOWN ? process.env.TEARDOWN=='true' : true;

var setup = module.exports = {
	o: fspath.resolve(`${__dirname}/../o.js`),

	// init {{{
	init() {
		this.timeout(30 * 1000);

		return Promise.resolve()
			.then(()=> setup.initEnvironment())
			.then(()=> setup.initConnection())
			.then(()=> setup.initSchemas())
			.then(()=> setup.initScenarios())
	},
	// }}}

	// teardown {{{
	teardown() {
		if (!allowTeardown) {
			mlog.error('Skipping teardown');
			mlog.log('To examine use `mongo ' + mongoURI.replace(/^.+\/(.*)?/, '$1') + '`');
			return;
		}

		return Promise.resolve()
			.then(()=> setup.teardownSchemas())
			.then(()=> setup.teardownConnection())
	},
	// }}}

	// initConnection {{{
	initConnection() {
		return Promise.resolve()
			.then(()=> promisify(monoxide.use)(['iterators', 'promises']))
			.then(()=> monoxide.connect(mongoURI))
	},
	// }}}

	// initEnvrionment {{{
	initEnvironment() {
		exec.defaults.logStdErr = mlog.log;
		exec.defaults.bufferStdout = true;

		exec.defaults.env = {
			O_PROFILE: JSON.stringify({
				uri: mongoURI,
				pretty: true,
				schemas: `${__dirname}/models/*.js`,
			}),
		};
	},
	// }}}

	// initSchemas {{{
	initSchemas() {
		require('./models/users');
		require('./models/companies');
	},
	// }}}

	// initScenarios {{{
	initScenarios: function() {
		return promisify(scenario.import)(require('./scenario'), {
			connection: monoxide.connection,
			nuke: true,
		});
	},
	// }}}

	// teardownConnection {{{
	teardownConnection() {
		return monoxide.connection.close();
	},
	// }}}

	// teardownSchemas {{{
	teardownSchemas() {
		return Promise.all(
			['users', 'companies'].map(model =>
				monoxide.connection.db.dropCollection(model)
			)
		)
		.then(()=> monoxide.connection.db.dropDatabase())
	},
	// }}}

	// validateUser {{{
	validateUser: user => {
		expect(user).to.have.property('_id');
		expect(user).to.have.property('_collection');
		expect(user).to.have.property('name');
		expect(user).to.have.property('status');
		expect(user).to.have.property('company');
		expect(user).to.have.property('role');
		expect(user).to.have.property('favourite');
		expect(user.favourite).to.be.an('object');
		expect(user).to.have.nested.property('favourite.color');
		expect(user).to.have.nested.property('favourite.animal');
		expect(user).to.have.property('_password');
	},
	// }}}
};
