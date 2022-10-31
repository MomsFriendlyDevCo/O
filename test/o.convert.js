var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o convert`', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('should convert objects => collections (without keying)', ()=>
		exec(`o convert --o2c <${__dirname}/scenarios/licenses.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(350);
				res.forEach(v => {
					expect(v).to.be.an('object');
					expect(v).to.contain.all.keys('licenses', 'repository');
					expect(v).to.not.have.property('id');
				});
			})
	);

	it('should convert objects => collections (with keying)', ()=>
		exec(`o convert --o2c --key-as id <${__dirname}/scenarios/licenses.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(350);
				res.forEach(v => {
					expect(v).to.be.an('object');
					expect(v).to.contain.all.keys('id', 'licenses', 'repository');
				});
			})
	);

	it('should convert collections => objects', ()=>
		exec(`o convert --c2o --key-from name <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.contain.all.keys('Joe Random', 'Jane Quark', 'Bob Bobart', 'Dick deleted', 'Vallery Unverrifed', 'Don Delete', 'Adam Admin');
				Object.entries(res).forEach(([key, body]) => {
					expect(body).to.contain.all.keys('$', '_password', 'company', 'role', 'status');
					expect(body).not.to.contain.keys('name');
				});
			})
	);

	it('should convert collections => objects (keeping source key)', ()=>
		exec(`o convert --c2o --no-remove-key --key-from name <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.contain.all.keys('Joe Random', 'Jane Quark', 'Bob Bobart', 'Dick deleted', 'Vallery Unverrifed', 'Don Delete', 'Adam Admin');
				Object.entries(res).forEach(([key, body]) => {
					expect(body).to.contain.all.keys('name', '$', '_password', 'company', 'role', 'status');
				});
			})
	);
});
