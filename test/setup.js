var _ = require('lodash');
var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var fspath = require('path');
var mongoosy = require('@momsfriendlydevco/mongoosy');
var mlog = require('mocha-logger');
var o = require('..');


var mongoURI = 'mongodb://localhost/o-test';

// Setting this to FALSE will disable the database teardown (i.e. not erase the Schema + DB when done)
// This is useful for debugging but only with single scripts as each test script will expect a fresh database
var allowTeardown = process.env.TEARDOWN ? process.env.TEARDOWN=='true' : true;

var setup = module.exports = {
	scenarios: require('./scenario'),

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
			.then(()=> setup.teardownO())
			.then(()=> setup.teardownConnection())
	},
	// }}}

	// initConnection {{{
	initConnection() {
		return Promise.resolve()
			.then(()=> mongoosy.connect(mongoURI))
	},
	// }}}

	// initEnvrionment {{{
	initEnvironment() {
		exec.defaults.logStderr = mlog.log;
		exec.defaults.bufferStdout = true;
		exec.defaults.alias = {o: fspath.resolve(__dirname, '..', 'o.js')};

		// Export env setup to sub-exec shells
		exec.defaults.env = {
			O_PROFILE: ''
				+ `uri=${mongoURI},`
				+ 'pretty=true,'
				+ `schemas=${__dirname}/models/*.js`,
		};

		_.merge(o.profile, {
			uri: mongoURI,
			pretty: true,
			schemas: `${__dirname}/models/*.js`,
		});
	},
	// }}}

	// initSchemas {{{
	initSchemas() {
		return o.input.require([
			`${__dirname}/models/users`,
			`${__dirname}/models/companies`,
		])
			.then(()=> mongoosy.compileModels())
	},
	// }}}

	// initScenarios {{{
	initScenarios: function() {
		return mongoosy.scenario(setup.scenarios);
	},
	// }}}

	// teardownO {{{
	teardownO() {
		return o.destroy();
	},
	// }}}

	// teardownConnection {{{
	teardownConnection() {
		return mongoosy.disconnect();
	},
	// }}}

	// teardownSchemas {{{
	teardownSchemas() {
		return Promise.all(
			['users', 'companies'].map(model =>
				mongoosy.connection.db.dropCollection(model)
			)
		)
		.then(()=> mongoosy.connection.db.dropDatabase())
	},
	// }}}

	// validateUser {{{
	validateUser: user => {
		expect(user).to.be.an('object');
		expect(user).to.have.property('_id');
		expect(user).to.have.property('_collection');
		expect(user._collection).to.be.a('string');
		expect(user).to.have.property('name');
		expect(user.name).to.be.a('string');
		expect(user).to.have.property('status');
		expect(user.status).to.be.a('string');
		expect(user).to.have.property('company');
		expect(user).to.have.property('role');
		expect(user.role).to.be.a('string');

		if (user.favourite) {
			expect(user.favourite).to.be.an('object');
			expect(user).to.have.nested.property('favourite.color');
			expect(user.favourite.color).to.be.a('string');
			expect(user).to.have.nested.property('favourite.animal');
			expect(user.favourite.animal).to.be.a('string');
			expect(user).to.have.property('_password');
		}
	},
	// }}}
};
