var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var mongoosy = require('@momsfriendlydevco/mongoosy');
var setup = require('./setup');

describe('`o save` CLI', function() {
	this.timeout(10 * 1000);
	beforeEach(setup.init);
	afterEach(setup.teardown);

	it('find all deleted users and reset their status to active', ()=>
		exec(`o find users status=deleted | o set status=active | o save -vvv`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(user).to.have.property('status', 'active'));

				return res.map(r => r._id).sort();
			})
			.then(ids => mongoosy.models.users.find({_id: {$in: ids}}).sort('_id'))
			.then(docs => {
				expect(docs).to.be.an('array');
				expect(docs).to.have.length(2);
				docs.forEach(doc => {
					expect(doc).to.have.property('_id');
					expect(doc).to.have.property('status', 'active');
				});
			})
	);

});
