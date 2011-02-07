var vows = require('vows'),
	assert = require('assert'),
	bigdoor = require('./bigdoor');

var signature = bigdoor.signature;

// pulled from example at http://publisher.bigdoor.com/docs/signature
assert.equal(
	signature(
		'601d2664219e4886a059eeb251baad46',
		'/api/publisher/0deee7386916481199b5cbc16e4800b0/currency',
		{
			time:1276219487.56,
			example_key:'value'
		},
		{
			token:'41a45593cc8a40d58486c7a61b63d83d',
			time:1276219487.56,
			pub_title: 'Experience',
			currency_type_id:2
		}
	), 'c39189f1bcf6ef58125a33294fb21d98e740ef1dcc1a1986a95ab807ff2d4082'
);
