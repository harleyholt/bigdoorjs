// A file of functional "tests" I wrote to quickly try things that the system needs to be able to do. keeping it around as an example of use. Will eventually merge into other docs and the README in the magical future when I have time

var publisher = require('./src/bigdoor').publisher,
	servers = require('./src/servers'),
	_ = require('underscore'),
	async = require('async');


var api_server = servers.api_server,
	secure_server = servers.secure_server,
	http_server = servers.http_server;

var app_key = '95e8945f5b5f476cb422db0c14457bf4';
var app_secret = '6aff58083311478e82a47460aafb6751';

// harley+test_bdm_rhh1003@bigdoor.coms
var pub = publisher(
	app_key,
	app_secret,
	api_server(
		secure_server(
			http_server(),
			app_secret,
			'api.bigdoor.com'
		),
		app_key
	)
);

/**
var results = { }
async.waterfall([
	function(callback) { // create a currency
		pub.currency({
			title: 'Badge Currency',
			description: 'A currency created for testing'
		}).save(function(error, cur) {
			callback(error, {currency:cur});
		});
	},
	function(results, callback) { // create a level collection
		var levels = [];
		levels.push(pub.level({
			title: 'Fledgling',
			description: 'You are barely able to walk, but soon enough we\'ll whip you into shape',
			threshold: 1
		}));
		levels.push(pub.level({
			title: 'Novice',
			description: 'You\'re not very good',
			threshold: 2
		}));
		levels.push(pub.level({
			title: 'Neophyte',
			description: 'Learning is good, learning is fun, but you still suck',
			threshold: 3
		}));
		levels.push(pub.level({
			title: 'Expert',
			description: '10000 hours',
			threshold: 4
		}));
		levels.push(pub.level({
			title: 'Guru',
			description: 'And so the student has become the... Guru.',
			threshold: 5
		}));
		for ( var i = 0; i < levels.length; i++ ) {
			levels[i].save(function() { });
		}
		var group = pub.levelGroup({
			title: 'The Learning Curve',
			description: 'Your progress on your quest to learn everything',
			currency: results.currency
		}, levels);
		console.log('saving group');
		group.save(function(error, group) {
			results.levels = group;
			callback(error, results);
		});
	},
	function(results, callback) { // create a user
		pub.user('for ever and ever').save(function(error, user) {
			results.user = user;
			console.log(results);
			callback(error, results);
		});
	}
]);
**/

// create and save a user with an end_user_login of starnostar
//pub.user('starnostar').save(function(error, user) {
//	console.log(user);
//});

// retrieve a user, a trasaction, and run the transaction against the user
/**
pub.user.get('starnostar', function(error, user) {
		pub.transaction.get('grant Life Experience', function(error, transaction) {
		console.log(transaction.subtransactions);
		transaction.execute(user, 10.00, function(error, result) {
			console.log(result);
		});
	});
});
**/

// retrieve a user and a currency and give that currency to the user
//pub.user.get('starnostar', function(error, user) {
//	pub.currency.get('Life Experience', function(error, currency) {
//		currency.cheque(20).to(user,function(error, result) {
//			console.log(result[0].end_user.currency_balances);
//		});
//	});
//});

/**
// Create a new currency and save it
pub.currency({
	title: 'Mana',
	description: 'Used for conjuring, spells, witchcraft, and mischief',
	exchange_rate: 10
}).save(function(error, cur) {
	console.log('new currency has ID: ' + cur.id);
	console.log(cur);
});

pub.currency({
	title: 'Life Experience',
	description: 'Earned by riding the trolley'
}).save(function(error, cur) {
	console.log(cur);
});
**/


//BDM BUG: if you delete an attribute and then try to create a new 
//attribute with the same friendly_id it will fail
//Create new attribute and save it
//pub.attribute({
//	title: 'Magical',
//	description: 'Attached to all things magical',
//	friendly_id: 'magic'
//}).save(function(error, attr) {
//	console.log('new attribute has ID: ' + attr.id);
//	console.log(attr);
//});

/**
 //Retrieve a currency by its title and then use that to create a new
 //transaction
pub.currency.get('XP', function(error, xp) {
	xp.cheque(20).save(function (error, xp_cheque) {
		//console.log(xp_cheque);
		pub.transaction({
			title: 'Testing this',
			description: 'ya'
		}, xp_cheque).save(function(error, transact) {
			//console.log(error, transact);
		});
	});
});
**/

/**
pub.award.get('Maybe Awards', function(error, start_award) {
	console.log(start_award);
	pub.user.get('starnostar', function(error, starnostar) {
		start_award.give().to(starnostar, function(error, result) {
			console.log(error);
			console.log(result);
		});
	});
});
**/

/**
 // create an award group
var award1 = pub.award({
	title: 'Library Working',
	description: 'The library is really starting to come together'
});
// since the award is not part of a group, saving it at this point will
// only mark it as ready to save--not actually save to sever
award1.save(function() { });
var award2 = pub.award({
	title: 'Giving Points',
	description: 'You are getting somewhere now'
});
award2.save(function() { });
var award3 = pub.award({
	title: 'Maybe Awards',
	description: 'Are they working?'
});

pub.awardGroup({
	title: 'Working Awards',
	description: 'For those about to rock',
}, [award1, award2, award3]).save(function(error, group) { 
	console.log(error);
	console.log(group); // first 2 awards should be saved here
	// save the third
	award3.save(function(error, obj) { 
		console.log(obj);
	});
});
**/

/**
// create and save a good group
var good1 = pub.good({
	title: 'Sword of Truth',
	description: 'and other fantasy references'
});
good1.save(function() { });
var good2 = pub.good({
	title: 'Redwall Abbey',
	description: 'and other young person references'
});
good2.save(function() { });

var book_goods = pub.goodGroup({
	title: 'Book Stuff',
	description: 'because it is good for you',
}, [good1, good2]).save(function(error, group) {
	console.log('AND THE GOOD IS:');
	console.log(group);
});
**/

// COMING SOON SECTION

/**
 * LEVELS w/ THRESHOLDS
 **/

/**
 * coming soon
currency.get('Mana', function(error, mana) { 
	mana.give(20).to(eu, function(error, balances) {
		// end user now has new balance
	});
});
attribute attribute.get({friendly_id:'magical'});
// == attribute.get('Magical');
// **/


