var expect = require('chai').expect;
var o = require('..');

describe('utilities.getEndpoints()', ()=> {
	var doc = {
		_id: 123,
		name: 'Joe Random',
		favourite: {
			color: 'blue',
			animal: 'cat',
		},
		friends: [
			{name: 'Bob Smith', pets: ['dog', 'cat', 'goldfish']},
			{name: 'Jane Quark', pets: ['cat', 'goldfish']},
			{name: 'Eric Electron', pets: ['goldfish']},
			{name: 'Sandy Singularity'},
		],
	};

	it('extract simple scalars', ()=> {
		expect(o.utilities.getEndpoints(doc, '_id')).to.deep.equal(123);
		expect(o.utilities.getEndpoints(doc, 'name')).to.deep.equal('Joe Random');
		expect(o.utilities.getEndpoints(doc, 'favourite')).to.deep.equal({color: 'blue', animal: 'cat'});
		expect(o.utilities.getEndpoints(doc, 'favourite.color')).to.deep.equal('blue');
		expect(o.utilities.getEndpoints(doc, ['favourite', 'color'])).to.deep.equal('blue');
	})

	it('extract branching structures', ()=> {
		var res = o.utilities.getEndpoints(doc, 'friends');
		expect(res).to.be.an('array');
		expect(res).to.have.length(4);

		var res = o.utilities.getEndpoints(doc, 'friends.name');
		expect(res).to.have.length(4);
		expect(res).to.be.deep.equal(doc.friends.map(f => f.name));

		var res = o.utilities.getEndpoints(doc, 'friends.pets');
		expect(res).to.be.deep.equal(doc.friends.map(f => f.pets).filter(i => i));
	});

});
