var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o throttle` CLI', function() {
	this.timeout(30 * 1000);
	beforeEach(setup.initEnvironment);

	it('should throttle simple collection data', ()=> {
		var startTime = Date.now();

		return exec([`${setup.o}`, 'throttle', '--delay=1s', `<${__dirname}/scenarios/users.json`], {json: true, pipe: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				expect(res).to.be.deep.equal(setup.scenarios.users);
				expect(Date.now() - startTime).to.be.at.least(7000);
			})
	});

});
