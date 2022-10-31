var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var setup = require('./setup');

describe('`o unsquish`', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('pass through simple documents', ()=>
		exec(`o squish <${__dirname}/scenarios/users.json | o unsquish`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);

				res.forEach(obj => {
					expect(obj).to.be.an('object');
					expect(obj).to.have.property('$');
				});
			})
	);

});
