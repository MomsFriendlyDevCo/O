var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o uniq` CLI', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('o uniq company --memory <USERS', ()=>
		exec(`o uniq company --memory -vv <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
			})
	);

});
