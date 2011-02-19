var publisher = require('./bigdoor').publisher,
	_ = require('underscore');

// harley+test_bdm_rhh507@bigdoor.com
var pub = publisher('d6e92052c79b4f329c1f79c3a87ce604', 'b0435cee6f3d413c97754574cddeb3f8');

/**
pub.currency({
	title: 'Mana',
	description: 'Used for conjuring, spells, witchcraft, and mischief',
	exchange_rate: 10
}).save(function(error, cur) {
	console.log('new currency has ID: ' + cur.id);
	console.log(cur);
});
**/

pub.currency({
	title: 'Life Experience',
	description: 'Earned by riding the trolley'
}).save(function(error, cur) {
	console.log(cur);
});


//BDM BUG: if you delete an attribute and then try to create a new 
//attribute with the same friendly_id it will fail
//pub.attribute({
//	title: 'Magical',
//	description: 'Attached to all things magical',
//	friendly_id: 'magic'
//}).save(function(error, attr) {
//	console.log('new attribute has ID: ' + attr.id);
//	console.log(attr);
//});

/**
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
var award1 = pub.award({
	title: 'Staring Out',
	description: 'You win the very beginning'
});
award1.save(function() { });
var award2 = pub.award({
	title: 'Getting There',
	description: 'You are getting somewhere now'
});
award2.save(function() { });
var award3 = pub.award({
	title: 'I wont be saved right now',
	description: 'for serious'
});

pub.awardGroup({
	title: 'Noob awards',
	description: 'For those about to rock',
}, [award1, award2, award3]).save(function(error, group) { 
	console.log(error);
	console.log(group); // awards should be saved here
	award3.save(function(error, obj) { 
		console.log(obj);
	});
});
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


