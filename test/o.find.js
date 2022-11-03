var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o find` CLI', function() {
	this.timeout(60 * 1000); // 60s

	before(setup.init);
	after(setup.teardown);

	it('dry-run a find query', ()=>
		exec('o find users -vvv --dry-run', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(0);
			})
	);

	it('find all users', ()=> {
		exec('o find users', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(1);

				res.forEach(user => setup.validateUser(user));
			})
	})

	it('find only the first two users', ()=>
		exec(['o', 'find', 'users', '--limit=2'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);

				res.forEach(user => setup.validateUser(user));
			})
	)

	it('find only users with selected fields', ()=>
		exec(['o', 'find', 'users', '--select=_id,name'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(0);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id', 'name']));
			})
	)

	it('find only users with deeply nested endpoint fields', ()=>
		exec(['o', 'find', 'users', '--select=_id,name,favourite.color'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(0);
				res.forEach(user => {
					expect(Object.keys(user).sort()).to.include('_id');
					expect(Object.keys(user).sort()).to.include('_collection');
					expect(Object.keys(user).sort()).to.include('name');
					if (user.favourite) {
						expect(user).to.have.nested.property('favourite.color');
						expect(Object.keys(user.favourite)).to.be.deep.equal(['color']);
					}
				});
			})
	)

	it('find only active users', ()=>
		exec(['o', 'find', 'users', 'status=active', '-vvv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => {
					expect(user).to.have.property('_id');
					expect(user).to.have.property('status', 'active');
				});
			})
	)

	it('find matching users via query (JSON)', ()=>
		exec(['o', 'find', 'users', '{name: "Jane Quark"}'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.have.property('name', 'Jane Quark');
				expect(res[0]).to.have.property('status', 'active');
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('find matching users via query (Key/Val)', ()=>
		exec(['o', 'find', 'users', 'name=Jane Quark'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.have.property('name', 'Jane Quark');
				expect(res[0]).to.have.property('status', 'active');
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('find matching users via query (--one + JSON)', ()=>
		exec(['o', 'find', 'users', '--one', '{name: "Jane Quark"}'], {json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('name', 'Jane Quark');
				expect(res).to.have.property('status', 'active');
				setup.validateUser(res);
			})
	)

	it('find matching users via query (--one + Key/Val)', ()=>
		exec(['o', 'find', 'users', '--one', 'name=Jane Quark'], {json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('name', 'Jane Quark');
				expect(res).to.have.property('status', 'active');
				setup.validateUser(res);
			})
	)

	it('find first user by ID', ()=> {
		var firstUser;

		return exec('o find users --select=_id --limit=1', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.be.an('object');
				expect(res[0]).to.have.property('_id');
				firstUser = res[0];
			})
			.then(()=> exec(`o find users _id=${firstUser._id}`, {json: true}))
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);

				expect(res[0]).to.be.an('object');
				expect(res[0]).to.property('_id', firstUser._id);
			})
	})

});
