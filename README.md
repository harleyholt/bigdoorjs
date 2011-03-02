#BigDoor
BigDoor supports gamification at the API level with RESTful web service.

Points, virtual currency, awards, levels, and badges are stored, granted, and retrieved using HTTP requests. More information about the service is available for developers at [the BigDoor Publisher site](http://publisher.bigdoor.com).

#bigdoorjs
bigdoorjs is a javascript library that simplifies use of the web service. Rather than exposing the structure of the web API, it implements a subset of the functionality in order to achieve consistency and ease-of-use. The philosophy of bigdoorjs is that it is better to provide 90% of the functionality if it improves the ease with which the libary can be used.

bigdoorjs can be used by node.js and in-browser applications.

##Conventions
bigdoorjs is object oriented javascript but it does not use the "new" keyword. Objects are returned by functions not by constructors. This is still under consideration so the way it is may change. If you have an argument either way, send it my way.

##Example

The simplest form of gamification is giving points to users as a reward for an action. Experience points in RPGs, chips in poker, your score in Pacman, your post count on a forum--these are all examples of points given to users. Points can also be called virtual currency or just currency--they are all the same in bigdoorjs.

Points are the backbone of a game. bigdoorjs makes awarding and tracking these ppoints easy.

The very first step is to create the currency that you will be tracking. Maybe this is XP, or Mana, or goals, or even VirtualBucks.

For example, lets take XP. This example will run in node.js

Before we can do anything we must get a publisher object. A publisher can be thought of the as the very basic connection to the BigDoor webservice.

	var app_key = 'd6e92052c79b4f329c1f79c3a87ce604';
	var secret_key = 'b0435cee6f3d413c97754574cddeb3f8';
	var publisher = require('bigdoor').publisher(app_key, secret_key);

Then, once the publisher object is created, it is used to created a new currency object:
	var xp = publisher.currency({
		title: 'XP',
		description: 'Experience Points awarded to the user for performing valuable actions'
	});

This object represents a new currency. However, it can not be given to the user until it is created in the BigDoor API. Remember--the BigDoor API is used to strore and retrieve data. Objects created locally must be written to the server to be used. This is done using the save method.
	xp.save(function(error, callback) { });

This pattern should be familiar to node.js users--since saving the object requires an asyncronous request, it uses a callback to communicate the result. All resource objects (meaning any object retrieved or created through the publisher interface, like Currency for example) take a callback function when accessing the server. This is done when saving or retrieving items. And all callbacks have the following signature:
	function(error, data)

If error is null or undefined then the request was a sucess and data holds the response body. Otherwise, data is null or undefined and error contains the error information. error and data are mutually exlusive.

Once the Experience Points currency has been saved, it can be given to a user using the give-to pattern (which is also used for awards and goods).

To give 50 Experience Points to user example_user we call give and to on xp.
	xp.give(50).to(example_user, function(error, new_currency_balance) { });

This will give 50 Experience points to example_user and returns her new balance (or total number of points for that currency) through the callback.

### Implemented Example
#### Giving Currency to a User
	var app_key = 'd6e92052c79b4f329c1f79c3a87ce604';
	var secret_key = 'b0435cee6f3d413c97754574cddeb3f8';
	var publisher = require('bigdoor').publisher(app_key, secret_key);

	// Create a new Currency called XP
	var xp = publisher.currency({
		title: 'XP',
		description: 'Experience Points awarded to the user for performing valuable actions'
	});

	// Save that Currency to the BigDoor service
	xp.save(function(error, xp) {

		if ( error ) {
			// handle error
		}

		// XP has been saved
		// Now we just need a User to give it to
		publisher.user.get(
			'example_user_login_string',
			function(error, example_user) {

				if ( error ) {
					// handle error
				}

				// Give 50 of this new currency to this user
				xp.give(50).to(example_user, function(error, balance) {
					
					console.log(example_user.end_user_login +
						'now has ' + balance + xp.title);

				});
			}
		);
	});

#### Retrieving Currency by Title
	// We can retrieve objects by their title
	publisher.currency.get('XP', function(error, xp) {

		xp.description = 'I am updating the description';
		xp.save(function(error, updated_xp) {

			// Updated_xp references same object as xp

		})

	});

#### Retrieving Currency by ID
	// Assuming ID of XP is 10, then we can also retrieve it by that ID
	// by passing in a number
	publisher.currency.get(10, function(error, xp) {

		// Do things with XP

	});

#### Creating an Award Group
	var right_path = publisher.award({
		title: 'Down the Right Path',
		description: 'You took your very first action in the game ' + 
						'and of course we have to reward you now'
	});
	award.save(function(error, result) {

		// Like all group members, Awards are not saved to the server 
		// until it is added to an Award Group
				'
	});

	var too_much_time = publisher.award({
		title: 'Too Much Time',
		description: 'Seriously, you completionist'
	});
	award.save(function(error, result) {

		// This needs to be called before an Award Group is saved

	});
	
	// group members are passed to the awardGroup function
	var group = publisher.awardGroup({
		title: 'Example Awards',
		description: 'An example of creating awards'
	}, right_path, too_much_time);
	group.save(function(error, group) {

		// This will also save all the group members that have been
		// marked as saved

		// awardGroup members are accessed through awards

		group.awards[0].give().to(example_user, function(error, result) {
			// awarded to user
		});

	});
