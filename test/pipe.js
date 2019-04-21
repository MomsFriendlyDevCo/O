var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('Pipelines', function() {
	this.timeout(60 * 1000); // 60s

	before(setup.init);
	after(setup.teardown);

	it('find all users and only return their ID', ()=>
		exec('o find users | o select _id', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('find the first three users', ()=>
		exec('o find users | o limit 3', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('find the first three uses and count them', ()=>
		exec('o find users | o limit 3 | o count', {json: true})
			.then(res => {
				expect(res).to.be.an('number');
				expect(res).to.be.equal(3);
			})
	)

	it('count all users', ()=>
		exec('o count users', {json: true})
			.then(res => {
				expect(res).to.be.an('number');
				expect(res).to.be.equal(7);
			})
	)

	it('find the first three users IDs', ()=>
		exec('o find users | o limit 2 | o select _id', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('find users 2 + 3s IDs', ()=>
		exec('o find users | o skip 1 | o limit 2 | o select _id', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('find all users favourite colors, once and sort', ()=>
		exec('o find users | o pluck favourite.color | o uniq --memory | o sort --memory', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.be.deep.equal(['blue', 'red', 'yellow', null]);
			})
	)

	it('find all active users, slowing down the pipe and showing progress, then return IDs', ()=> {
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

	it('find all users from Mongo then apply a second level filter', ()=>
		exec(`o find users | o filter status=active'`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => expect(user).to.have.property('status', 'active'));
			})
	)

	it('set all deleted users to active', ()=>
		exec(`o find users status=deleted | o set status=active'`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(user).to.have.property('status', 'active'));
			})
	)

	it('create copies of every user with each copy having the name "Fake <name>"', ()=>
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

	it('find all active users and also retrieve their company document', ()=>
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

	it('extract all IDs for all users', ()=>
		exec('o ids users', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => expect(r).to.be.a('string'));
			})
	)

	it('extract all IDs for all users (alternative method)', ()=>
		exec('o find users | o ids', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => expect(r).to.be.a('string'));
			})
	)

	it('find all used companies', ()=>
		exec('o find users | o populate company | o sort --memory company.name | o pluck company.name | o uniq --memory', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				expect(res.sort()).to.be.deep.equal(['Acme Inc', 'Aperture Science']);
			})
	)

	it('extract all cities companies are based in', ()=>
		exec('o find companies | o select locations.city', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				res.forEach(u => {
					expect(Object.keys(u).sort()).to.deep.equal(['_collection', '_id', 'locations']);
					expect(Object.keys(u.locations)).to.deep.equal(['city']);
				});
			})
	)

	it('extract all cities companies are based in', ()=>
		exec('o find companies | o pluck --flatten locations.city | o sort --memory | o uniq --memory', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.be.deep.equal(['London', 'New York', 'Sydney']);
			})
	)

});
