var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('Pipelines', function() {
	this.timeout(60 * 1000); // 60s

	before(setup.init);
	after(setup.teardown);

	it('o find users | o select _id', ()=>
		exec(`o find users -vv | o select _id -vv`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('o find users | o limit 3', ()=>
		exec(`o find users | o limit 3`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('o find users | o limit 3 | o count', ()=>
		exec(`o find users | o limit 3 | o count`, {json: true})
			.then(res => {
				expect(res).to.be.an('number');
				expect(res).to.be.equal(3);
			})
	)

	it('o count users', ()=>
		exec(`o count users`, {json: true})
			.then(res => {
				expect(res).to.be.an('number');
				expect(res).to.be.equal(7);
			})
	)

	it('o find users | o limit 3 | o select _id', ()=>
		exec(`o find users | o limit 2 | o select _id`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('o find users | o skip 1 | o limit 2 | o select _id', ()=>
		exec(`o find users | o skip 1 | o limit 2 | o select _id`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('o find users | o throttle --delay=1s | o progress --per=1 | o pluck _id', ()=> {
		var startTime = Date.now();
		return exec(`o find users status=active | o throttle --delay=1s | o progress --per=1 | o pluck _id`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(r => {
					expect(r).to.be.a('string');
					expect(r).to.match(/^[0-9a-f]{24}/);
				})
				expect(Date.now() - startTime).to.be.at.least(3000);
			})
	})

	it('o find users | o filter status=active', ()=>
		exec(`o find users | o filter status=active'`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => expect(user).to.have.property('status', 'active'));
			})
	)

	it('o find users status=deleted | o set status=active', ()=>
		exec(`o find users status=deleted | o set status=active'`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(user).to.have.property('status', 'active'));
			})
	)

	it('o find users | o set "name=Fake ${name}"', ()=>
		exec(`o find users | o filter status=active | o set "name=Fake\${name}"`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => {
					expect(user).to.have.property('status', 'active');
					expect(user).to.have.property('name');
					expect(user.name).to.match(/^Fake/);
				});
			})
	)

	it('o find users status=active | o populate company', ()=>
		exec(`o find users status=active | o populate company`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => {
					expect(user).to.have.property('status', 'active');
					expect(user).to.have.property('company');
					expect(user.company).to.be.an('object');
				});
			})
	)

	it('o ids users', ()=>
		exec('o ids users', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => expect(r).to.be.a('string'));
			})
	)

	it('o find users | o ids', ()=>
		exec('o find users | o ids', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => expect(r).to.be.a('string'));
			})
	)

	it('o find users | o populate company | o sort --memory company.name | o uniq --memory', ()=>
		exec('o find users | o populate company | o sort --memory company.name | o pluck company.name | o uniq --memory', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				expect(res).to.be.deep.equal(['Acme Inc', 'Aperture Science']);
			})
	)

});
