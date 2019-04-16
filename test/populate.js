var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o populate` CLI', function() {
	this.timeout(10 * 1000);
	before(setup.init);
	after(setup.teardown);

	it('o find users | o populate company', ()=>
		exec(`o find users | o populate company`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(user => {
					expect(user).to.have.property('company');
					expect(user.company).to.be.an('object');
					expect(user).to.have.nested.property('company._id');
					expect(user).to.have.nested.property('company.name');
				});
			})
	);


	it('o find users | o populate company=companyDoc', ()=>
		exec(`o find users | o populate company=companyDoc`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(user => {
					expect(user).to.have.property('company');
					expect(user.company).to.be.a('string');
					expect(user).to.have.property('companyDoc');
					expect(user.companyDoc).to.be.an('object');
					expect(user).to.have.nested.property('companyDoc._id');
					expect(user).to.have.nested.property('companyDoc.name');
					expect(user.companyDoc._id).to.be.deep.equal(user.company);
				});
			})
	);

});
