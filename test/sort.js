var _ = require('lodash');
var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o sort` CLI', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('sort a JSON file by name', ()=>
		exec(`o sort name --memory <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				expect(res.map(r => r.name)).to.be.deep.equal(setup.scenarios.users.map(u => u.name).sort());
			})
	);

	it('sort a JSON file by deeply nested key', ()=>
		exec(`o sort favourite.color -vv --memory <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				expect(res.map(r => _.get(r, 'favourite.color'))).to.be.deep.equal(['blue', 'blue', 'red', 'red', 'yellow', 'yellow', undefined]);
			})
	);

});
