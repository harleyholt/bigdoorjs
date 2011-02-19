/** JUST SKETCHING THIS OUT -- SOME THINGS I'D LIKE TO DO WITH LIBRARY
 * eu = end_user('todd')
 *
 *currency.get('XP', callback);
 *currency.get('Mana', callback);
 *good('Rock and Roll', 'http://www.example.com/image.jpg').save(callback);
 *awardgroup = awardGroup('Elementary my dear Watson')
 *award('Best in the Class').partOf(awardGroup);
 *
 *xp.give(20).to(eu, callback);
 *good.give().to(eu, callback);
 *award.give().to(eu, callback);
 *
 * // lower level
 * transaction( 
 *     currency.give(20),
 *     currency2.take(-20).for(example_good),
 *     currency3.give(40),
 * ).unsecure().save(function(error, transaction) { transaction.run(eu) }); 
 **/

 
var _ = require('underscore'),
	urls = require('./urls'),
	secure_server = require('./servers').secure_server,
	api_server = require('./servers').api_server,
	get_http_methods = require('./servers').get_http_methods,
	guid = require('./servers').guid;


var publisher = function(app_id, app_secret, server) {

	var urlCollection = function(urls) {
		return urls;
	}

	var levelCollection = function(levels) {
		return levels;
	}

	// a collection of awards to be used internally by awardGroup
	var awardCollection = function(awards) {
		return awards;
	}

	var goodCollection = function(goods) {
		return goods;
	}

	var subtransactionCollection = function(subtransactions) {
		return subtransactions;
	}

	if (!server) {
		// default to the API server using secure requests
		server = api_server(secure_server(null, app_secret), app_id);
	}
	// object server takes the raw server and instead allows pub objects
	// to be used as arguments with url, query, and body arguments being
	// infered from this
	var object_server = get_http_methods(server);

	// returns the default content of any request made
	var loyalty_content = function(obj, resource_name, body) {
		return {
			url: urls[resource_name].get(obj),
			query: {},
			body: _.extend(
				obj.loyalty_body_content(),
				body
			)
		}
	}

	// resource objects which exist in the BigDoor API but which are not 
	// supposed to be exposed outside of this module
	var private_models = {
		transaction_to_subtransaction: function(transaction, subtransaction) {
			return {
				request_content: function() {
					var temp = {
						url: '/named_transaction_group/'+
								this.transaction.id +
								'/named_transaction/' +
								this.subtransaction.id,
						query: {},
						body: {
							named_transaction_is_primary: this.subtransaction.is_primary || false
						}
					}

					if ( typeof this.subtransaction.group_ratio == 'number' ) {
						temp.body['named_transaction_group_ratio'] = this.subtransaction.group_ratio;
					}
					return temp;
				},
				transaction: transaction,
				subtransaction: subtransaction
			}
		},
		transaction_execute: function(transaction, user, amount) {
			return {
				request_content: function() {
					var temp = {
						url: '/named_transaction_group/' +
							this.transaction.id +
							'/execute/' +
							user.login,
						query: {},
						body: {
							allow_negative_balance: false, // TODO: should come from somewhere
							verbosity: 4
						}
					}

					if ( amount ) {
						temp.body.amount = amount;
					}

					return temp;
				}
			}
		}
	}


	// create a resource if it doesn't exist on the server or
	// update it if it does
	var create_or_update = function(callback) {
		if ( this.id ) {
			object_server.put(this, callback);
		} else {
			object_server.post(this, _.bind(function(error, obj) {
				obj = JSON.parse(obj);
				obj = obj[0];
				this.id = obj.id; // update the object with its id
									//TODO update any changed fields
				callback(error, this);
			}, this));
		}
	}

	// creates an object and also an associated transaction
	// which can be used for instant granting
	// for example a currency is given a default transaction 
	// which can be used to grant that currency
	create_with_transaction = function(callback) {
		object_server.post(
			this,
			_.bind(function(error, cur) { 
				// currency is created
				cur = JSON.parse(cur);
				cur = cur[0];
				this.id = cur.id;
				cur = this;
				var subtrans = cur.cheque().variable_amount();
				subtrans.save(function(error, subtrans) {
					console.log(subtrans);
					pub.transaction(
						{
							title: 'grant ' + cur.title,
							description: 'created automatically to grant ' + cur.title,
						},
						subtrans
					).save(function(error, trans) {
						// transaction is created--grab the ID and stuff it into
						// the currency
						cur.meta = cur.meta || {};
						cur.meta['instant'] = trans.id;
						cur.save(function(error, obj) {
							console.log(obj);
							callback(error, cur);
						}, this);
					}, this);
				});
			}, this)
		);
	}

	create_or_update_with_transaction = function(callback) {
		if ( this.id ) {
			create_or_update.call(this, callback);
		} else {
			create_with_transaction.call(this, callback);
		}
	}

	// saves a group member if the group exists otherwise marks it
	// as ready for saved (will be saved once group is saved)
	var create_or_update_group_member = function(group, callback) {
		if ( group && group.id ) { // group exists so we can just save this
			create_or_update.call(this, callback);
		} else {
			// can't actually save at this point so instead mark the
			// group member as ready to be saved and return it through
			// the callback
			this.save_ready = true;
			callback(null, this);
		}
	}

	// save group objects and then saves any of the members
	// which are ready to be saved
	var create_or_update_group = function(save_member_fun, group_members, callback) { 
		var toSave = _.select(
			group_members,
			function(x) { return x.save_ready; }
		);
		create_or_update.call(
			this,
			_.bind(function(error, group) {

				// recursively save the goods that are
				// part of this group
				var recurse_save = function(error, member) {
					var saving = toSave.pop();
					if ( saving ) {
						save_member_fun.call(
							saving,
							group,
							arguments.callee
						);
					} else { 
						callback(error, group);
					}
				}
				// update all group members to reference group
				_.map(
					group_members,
					_.bind(function(x) { x.group = this }, this)
				);
				recurse_save.call(null, null);
			}, this)
		);
	}

	// saves subtransactions 
	var create_or_update_subtransaction = function(transaction, callback) {
		if ( this.id ) {
			create_or_update.call(this, callback);
		} else {
			if ( transaction && transaction.id ) {
				// we have a group that is saved in the database
				object_server.post(this, _.bind(function(error, obj) {
					obj = JSON.parse(obj);
					obj = obj[0];
					this.id = obj.id;
					// transaction and subtransaction are saved
					// need to link the two and then return the 
					// subtransaction through the callback
					object_server.post(
						private_models.transaction_to_subtransaction(
							transaction,
							this
						),
						_.bind(function(error, linked) { 
							callback(error, obj)
						}, this)
					);
				}, this));
			} else {
				// we do not have a group that is saved so set save ready and
				// return
				this.save_ready = true;
				callback(null, this);
			}
		}
	}


	// the pub object is returned
	// the purpose of the resource objects contained with in is to define
	// their properties and 
	var pub = {
		// A user object 
		user: function(obj) {
			return {
				request_content: function() {
					return {
						url: urls['user'].get(this),
						query: {},
						body: {
							end_user_login: this.login,
							guid: this.guid,
							best_guess_name: this.best_guess_name,
							best_guess_profile_img: this.best_guess_profile_image
						}
					}
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				// obj can either be object or string (used as end_user_login)
				login: obj.login || obj,
				best_guess_name: obj.best_guess_name ||'' ,
				best_guess_profile_image: obj.best_guess_profile_image || '',
				guid: obj.guid || guid()
			}
		},
		// Give an object the basic fields used by BigDoor objects.
		// These inlcude: title and description. 
		// If the argument object includes an id and created 
		// time those will also be added.
		loyalty: function(obj) {
			return {
				id: obj.id, // may be undefined (this is fine and desired)
				title: obj.title,
				description: obj.description,
				meta: obj.meta,
				created: obj.created,
				modified: obj.modified,
				loyalty_body_content: function() {
					var results = {};
					if ( this.title ) {
						results.end_user_title = this.title;
						results.pub_title = this.title;
					}
					if ( this.description ) {
						results.end_user_description = this.description;
					}
					if ( this.meta && !_.isEmpty(this.meta)) {
						results.pub_description = JSON.stringify(this.meta);
					}
					return results;
				}
			}
		},
		// not intended for external use right now
		subtransaction: function(obj) {
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					var extras = {};
					if ( this.variable_amount_allowed && this.group_ratio ) {
						extras.group_ratio = this.group_ratio;
					}
					if ( this.good ) {
						extras.named_good_id = this.good.id || this.good;
					}
					return loyalty_content(
						this,
						'subtransaction',
						_.extend({
							currency_id: this.currency.id || this.currency,
							default_amount: this.default_amount,
							is_source: this.is_source,
							variable_amount_allowed: this.variable_amount_allowed || false
						}, extras)
					);
				},
				save: function(callback) { 
					create_or_update_subtransaction.call(
						this,
						this.transaction,
						callback
					);
				},
				currency: obj.currency,
				default_amount: obj.default_amount || 1.00,
				is_source: obj.is_source || true,
				transaction: obj.transaction,
				variable_amount: function(percent) {
					this.group_ratio = percent;
					this.variable_amount_allowed = true;
					return this;
				},
				constant_amount: function() {
					delete this.group_ratio;
					this.variable_amount_allowed = false;
					return this;
				},
				has_variable_amount: function() {
					return this.variable_amount_allowed;
				}
			});
		},
		// A Transaction is a set of related commands (subtransactions) to be
		// run against an end_user. These commands include debiting a user's 
		// currency, granting more currency to a user, and giving the
		// user a good
		transaction: function(obj, primarySubtransaction, subtransactions) {
			var private = {
				non_secure: obj.non_secure || false,
				primary_subtransaction: primarySubtransaction
			};
			primarySubtransaction.is_primary = true;
			var all_subtransactions = [primarySubtransaction]
			if ( arguments.length > 2 ) {
				if ( _.isArray(subtransactions) ) {
					all_subtransactions = all_subtransactions.concat(
						subtransactions
					);
				} else {
					all_subtransactions = all_subtransactions.concat(
						_.rest(_.toArray(arguments),2)
					);
				}
			}
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'transaction',
						{
							challenge_response_enable: 0,
							end_user_cap: this.end_user_cap,
							end_user_cap_interval: this.end_user_cap_interval,
							non_secure: private.non_secure
						}
					);
				},
				save: function(callback) { 
					create_or_update_group.call(
						this,
						create_or_update_subtransaction,
						this.subtransactions,
						callback
					);
				},
				execute: function(user, callback) {
					obj_server.post(
						private_models.transaction_execute(this, user),
						callback
					);
				},
				end_user_cap: obj.end_user_cap || -1,
				end_user_cap_interval: obj.end_user_cap_interval || -1,
				subtransactions: subtransactionCollection(all_subtransactions),
				unsecure: function() {
					private.non_secure = true;
					return this;
				},
				is_unsecure: function() {
					return private.non_secure;
				}
			});
		},
		// Attribute allows arbitrary properties to be attached to
		// BigDoor objects
		attribute: function(obj) {
			// if obj is number assume it is an ID which we need to retrieve
			// if obj is an object assume it holds values that we need
			// if obj is a string assume it is a friendly_id
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'attribute', 
						{
							friendly_id: this.friendly_id
						}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				friendly_id: obj.friendly_id
			});
		},
		// A URL object
		// 
		// example 1
		// var image = url('http://example.com/example.jpg');
		//
		// example 2
		// var image = url({
		//     url: 'http://example.com/example.jpg',
		//     title: 'Image',
		//     description: 'Example of creating a URL
		// });
		url: function(obj) {
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'url',
						{
							is_media_url: true,
							is_for_end_user_ui: true,
							url: this.url
						}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				id: obj.id || null,
				url: obj.url || obj,
				preview: function(obj) {
					var that = url(obj);
					preview_attribute.give(that);
					return that;
				},
				full: function(obj) {
					var that = url(obj);
					full_attribute.give(that);
					return that;
				},
				give: function(obj) {
					// attach this url to the object in question
					if ( !obj.urls ) {
						_.extend(obj, urlCollection());
					} 
					obj.link(this);
				}
			});
		},
		currency: function(obj) {
			var parent = this;
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'currency',
						{
							currency_type_id: this.type,
							exchange_rate: this.exchange_rate,
							relative_weight: 1 
						}
					);
				},
				save: function(callback) { 
					create_or_update_with_transaction.call(this, callback);
				},
				exchange_rate: obj.exchange_rate || 1, // points to dollars
				type: obj.type || 5, // default: non-redeemable XP 
				cheque: function(amount) {
					// get a transaction that represents giving the
					// user some currency
					var instant = parent.subtransaction({
						currency: this,
						default_amount: amount,
						is_source: true
					});

					instant.to = function(user, callback) {
					}
				},
				debit: function(amount) {
					// get a tranasction that debits the
					// user some currency
					return parent.subtransaction({
						currency: this,
						default_amount: amount || 1,
						is_source: false
					});
				},
				purchase: function(amount, good) {
					//creates a transaction that is a sink and 
					// grants a good and returns it
					return good.give(this.subtransaction({
						currency: this,
						default_amount: amount,
						is_source: false
					}));
				}
			});
		},
		levelGroup: function(obj, levels) {
			if ( !_.isArray(levels) ) {
				levels = _.rest(_.toArray(arguments));
			}
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'levelGroup',
						{
							currency_id: currency.id || currency
						}
					);
				},
				save: function(callback) { 
					create_or_update_group.call(
						this,
						create_or_update_group_member,
						this.levels,
						callback
					);
				},
				currency: obj.currency,
				levels: levelCollection(levels)
			});
		},
		level: function(obj) {
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'level',
						{
							threshold: this.theshold
						}
					);
				},
				save: function(callback) { 
					create_or_update_group_member.call(
						this,
						this.group,
						callback
					);
				},
				threshold: obj.threshold,
				currency: function() {
					return group.currency;
				},
				group: obj.group
			});
		},
		awardGroup: function(obj, awards) {
			if ( !_.isArray(awards) ) {
				awards = _.rest(_.toArray(arguments));
			}
			var private = {
				non_secure: obj.non_secure || false
			}
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'awardGroup',
						{
							non_secure: private.non_secure
						}
					);
				},
				save: function(callback) { 
					create_or_update_group.call(
						this,
						create_or_update_group_member,
						this.awards,
						callback
					);
				},
				awards: awardCollection(awards),
				unsecure: function() {
					private.non_secure = true;
					return this;
				}
			});
		},
		award: function(obj) {
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'award',
						{
							relative_weight: 1
						}
					);
				},
				save: function(callback) {
					create_or_update_group_member.call(
						this,
						this.group,
						callback
					);
				},
				grant: function() {
					// give to a user
					// TODO this needs to return an object with a to method
					// which executes the server side code to give to the
					// provided user
					return {
						to: function() { } 
					}
				},
				group: obj.group // the award group this belongs to
			});
		},
		goodGroup: function(obj, goods) {
			if ( !_.isArray(goods) ) {
				goods = _.rest(_.toArray(arguments));
			}
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'goodGroup',
						{}
					);
				},
				save: function(callback) { 
					create_or_update_group.call(
						this,
						create_or_update_group_member,
						this.goods,
						callback
					);
				},
				goods: goodCollection(goods)
			});
		},
		good: function(obj) {
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'good',
						{
							relative_weight: 1
						}
					);
				},
				save: function(callback) { 
					create_or_update_group_member.call(
						this,
						this.group,
						callback
					);
				},
				// add a good 
				group: obj.group,
				give: function(subtransaction) {
					// add a good to a subtransaction that is given
					// when the transaction is executed
					return _.extend(subtransaction, {
						good: this
					});
				}
			});
		}
	}

	// bind the context of the resource functions (effectively constructors)
	// to the parent pub object
	for ( var resource in pub ) {
		pub[resource] = _.bind(pub[resource], pub);
	}

	// everything that follows is to create methods on the resource functions
	// this is like a class method in an object oriented world

	// create the conversion function; each function translated the raw server
	// JSON returns to bigdoorjs representation.
	//
	// add a fromJSON function to each resource type
	var loyalty_conversion = function(jsonObj) {
		return {
			id: jsonObj.id,
			title: jsonObj.end_user_title,
			description: jsonObj.end_user_description,
			meta: jsonObj.pub_description ? JSON.parse(jsonObj.pub_description) : null,
			modified: new Date(jsonObj.modified_timestamp*1000),
			created: new Date(jsonObj.created_timestamp*1000)
		}
	}

	pub.loyalty.fromJSON = function(jsonObj) {
		return pub.loyalty(loyalty_conversion(jsonObj));
	}

	// define a set of conversions from the server names to the names
	// used in bigdoor.js
	var toEmpty = function(jsonObj) { return {}; };
	var loyalty_conversions = {
		attribute: toEmpty,
		currency: function(jsonObj) {
			return {
				type: jsonObj.currency_type_id
			}
		},
		url: toEmpty,
		awardGroup: function(jsonObj) {
			var temp = {
				awards: _.map(jsonObj.named_awards, pub.levelGroup.fromJSON)
			}
			for ( var i = 0; i < temp.awards.length; i++ ){
				temp.awards[i].group = temp;
			}
			return temp;
		},
		award: function(jsonObj) {
			return {
				group: jsonObj.named_award_collection_id
			}
		},
		levelGroup: function(jsonObj) {
			var temp = {
				levels: _.map(jsonObj.named_levels, pub.levelGroup.fromJSON),
				currency: jsonObj.currency_id
			}
			for ( var i = 0; i <  temp.levels; i++ ) {
				temp.levels[i].group = temp;
			}
			return temp;
		},
		level: function(jsonObj) {
			return {
				group: jsonObj.named_level_collection_id,
			}
		},
		goodGroup: function(jsonObj) {
			var temp = {
				goods: _.map(jsonObj.named_goods, pub.goodGroup.fromJSON),
			}
			for ( var i = 0; i < temp.levels; i++ ) {
				temp.goods[i].group = temp;
			}
			return temp;
		},
		good: function(jsonObj) {
			return {
				group: jsonObj.named_good_collection_id
			}
		},
		subtransaction: function(jsonObj) {
			return {
				currency: pub.currency.fromJSON(jsonObj.currency)
			}
		}
	}

	// add the conversions to the resources
	// the output includes the raw properties, the default properties from
	// loyalty_conversion, and the specific conversions from the
	// loyalty_conversions object
	for ( var i in loyalty_conversions ) {
		pub[i].fromJSON = function(x) {
			return function(jsonObj) {
				return pub[x](
					_.extend(
						jsonObj,
						loyalty_conversion(jsonObj),
						loyalty_conversions[x](jsonObj)
					)
				)
			}
		}(i);
	}

	// transaction is a special conversion case because the resource
	// function requires a primary subtransaction argument followed
	// by a set of 0 or more subtransactions
	pub.transaction.fromJSON = function(jsonObj) {
		var primary = _.select(
			jsonObj.named_transactions,
			function(x) { return x.named_transaction_is_primary }
		)[0];

		var secondary = _.select(
			jsonObj.named_transactions,
			function(x) { return !x.named_transaction_is_primary }
		);

		primary = pub.subtransaction.fromJSON(primary);
		secondary = _.map(
			secondary,
			pub.subtransaction.fromJSON
		);

		var obj = _.extend(
			jsonObj,
			loyalty_conversion(jsonObj)
		);

		var arguments = [obj, primary].concat(secondary);
		return pub.transaction.apply(pub, arguments);
	}

	// user is a special case because it does not have the default
	// properties (title, descriptions, etc)
	pub.user.fromJSON = function(jsonObj) {
		return pub.user(
			_.extend(
				jsonObj,
				{
					login: jsonObj.end_user_login,
					guid: jsonObj.guid
				}
			)
		);
	}

	// add ability to retrieve resources by their ID
	var getByID = function(resource, id, callback) {
		server.get(
			urls[resource].get({id:id}),
			{},
			_.bind(
				function(error, response, body) {
					if ( !error ) {
						callback(
							null, 
							this.fromJSON(JSON.parse(body)[0])
						);
					} else {
						callback(error, null);
					}
				},
				this
			)
		);
	}

	var getByTitle = function(resource, title, callback) {
		server.get(
			urls[resource].get({}),
			{'title__startswith': title},
			_.bind(
				function(error, response, body) {
					if ( !error ) {
						var results = JSON.parse(body)[0];

						// we can't do full equality of titles in
						// the bigdoor API (best we have is startswith,
						// so now filter results for full equality
						results = _.map(
							_.select(
								results,
								function(x) { return x.pub_title == title }
							),
							this.fromJSON
						);

						if ( results.length == 1 ) {
							results = results[0];
						} 

						callback(null, results);

					} else {
						callback(error, null);
					}
				},
				this
			)
		);
	}

	var getWith = function(funs, identifier, callback) {
		if ( typeof identifier == 'string' ) {
			funs['title'](identifier, callback);
		} else if ( typeof identifier == 'number' ) {
			funs['id'](identifier, callback);
		} else {
			throw 'unrecognized get input type: ' + typeof identifier;
		}
	}

	for ( var resource in pub ) {
		var funs = {
			id: _.bind(getByID, pub[resource], resource),
			title: _.bind(getByTitle, pub[resource], resource)
		}

		pub[resource].get = _.bind(
			getWith,
			pub[resource],
			funs
		);
	}

	return pub;
}

module.exports.publisher = publisher;


