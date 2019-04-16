var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o sort` CLI', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('o sort name <USERS', ()=>
		exec(`o sort name --memory -vv <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				expect(res.map(r => r.name)).to.be.deep.equal(setup.scenarios.users.map(u => u.name).sort());
			})
	);

});
