/** JUST SKETCHING THIS OUT
 * eu = end_user('todd')
 *
 * t = transaction( 
 *     currency.cheque(20),
 *     transaction.give_ratio(currency2.purchase(-20, example_good), .8),
 *     currency3.cheque(40),
 * ).unsecure().save(); 
 * t.run();
 **/

 
var querystring = require('querystring'),
	uuid = require('node-uuid'),
	request = require('request'),
	crypto = require('crypto'),
	_ = require('underscore'),
	urls = require('./urls'),
	bigdoor_server = require('./servers').bigdoor_server;

var signature = function(secret, url, query, body) {
	query = query || {};
	body = body || {}

	var stringize = function(obj) {
		var temp = _.reduce(
			_.sortBy(_.keys(obj), function(x) { return x; }),
			function(memo, v) {
				return memo + (v + obj[v].toString());
			},
			''
		);
		return temp;
	}

	var key = url + stringize(query) + stringize(body) + secret;
	var hash = crypto.createHash('sha256');
	hash.update(key);
	return hash.digest(encoding='hex');
}

var token = function() {
	return uuid().replace(/-/g, '').toLowerCase();
}

var time = function() {
	return Date.now() / 1000;
}

var publisher = function(app_id, app_secret) {


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

	// return a signed URL given a url, query, and body
	var secure_url = function(url, query, body) {
			var sign = signature(app_secret, url, query, body);
			query['sig'] = sign;
			var qs = querystring.stringify(query || {});
			if ( qs.length ) {
				url = url+'?'+qs;
			}
			return url;
	}

	// adds all necessary processing to a basic request in order to 
	// meet the security requirements of secure requests and then
	// actually preforms the request
	var secure_server = {
		complete_url: function(url) {
			if (!url.match(/^\//)) {
				url = '/'+url;
			}
			return 'http://local.publisher.bigdoor.com' + url;
		},
		action: function(method, url, query, body, callback) {
			var t = time();
			query = query || {};
			query['time'] = t;
			body = body || {};
			body['token'] = token();
			body['time'] = t;

			url = secure_url(url, query, body);
			request(
				{
					method: method,
					url: this.complete_url(url),
					body: querystring.stringify(body)
				},
				callback
			);
		},
		get: function(url, query, callback) {
			query = query || {};
			query['time'] = time();

			url = secure_url(url, query);
			request(
				{
					method: 'GET',
					url: this.complete_url(url)
				},
				callback
			);
		},
		put: function(url, query, body, callback) {
			this.action('PUT', url, query, body, callback);
		},
		post: function(url, query, body, callback) {
			this.action('POST', url, query, body, callback);
		},
		delete: function(url, query, body, callback) {
			this.action('DELETE', url, query, body, callback);
		}
	}

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

	// server allows raw access to get, put, post, delete
	// with url, query, and body parameters
	var server = bigdoor_server(secure_server, app_id);
	// object server takes the raw server and instead allows pub objects
	// to be used as arguments with url, query, and body arguments being
	// infered from this
	var object_server = server.get_http_methods();

	var create_or_update = function(callback) {
		if ( this.id ) {
			object_server.put(this, callback);
		} else {
			object_server.post(this, callback);
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
				created: obj.created,
				modified: obj.modified,
				loyalty_body_content: function() {
					return {
						pub_title: this.title,
						pub_description: this.description,
						end_user_title: this.title,
						end_user_description: this.description
					}
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
							variable_amount_allowed: this.variable_amount_allowed
						}, extras)
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				currency: obj.currency,
				default_amount: obj.default_amount || 1.00,
				is_source: obj.is_source || true,
				transaction: obj.transaction,
				variable_amount: function(percent) {
					this.group_ratio = percent;
					this.variable_amount_allowed = true;
				},
				constant_amount: function() {
					delete this.group_ratio;
					this.variable_amount_allowed = false;
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
		transaction: function(obj, primarySubtransaction) {
			var private = {
				non_secure: obj.non_secure || false,
				primary_subtransaction: primarySubtransaction
			};
			var subtransactions = [primarySubtransaction]
			if ( arguments.length > 2 ) {
				this.subtransactions.concat(_.rest(_.toArray(arguments),2));
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
					create_or_update.call(this, callback);
				},
				end_user_cap: obj.end_user_cap || -1,
				end_user_cap_interval: obj.end_user_cap_interval || -1,
				subtransactions: subtransactionCollection(subtransactions),
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
					create_or_update.call(this, callback);
				},
				exchange_rate: obj.exchange_rate || 1, // points to dollars
				type: obj.type || 5, // default: non-redeemable XP 
				check: function(amount) {
					// get a transaction that represents giving the
					// user some currency
					return this.subtransaction({
						currency: this,
						default_amount: amount,
						is_source: true
					});
				},
				debit: function(amount) {
					// get a tranasction that debits the
					// user some currency
					return this.subtransaction({
						currency: this,
						default_amount: amount,
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
					create_or_update.call(this, callback);
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
							named_level_collection_id: this.group.id || this.group,
							threshold: this.theshold
						}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				threshold: obj.threshold,
				currency: function() {
					return group.currency;
				},
				group: obj.group
			});
		},
		awardGroup: function(obj, awards) {
			var private = {
				non_secure: obj.non_secure || false
			}
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'awardGroup',
						{
							named_award_collection_id: this.group.id || this.group,
							non_secure: private.non_secure
						}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
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
							named_award_collection_id: this.group.id || this.group,
							relative_weight: 1
						}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				grant: function() {
					// give to a user
				},
				group: obj.group, // the award group this belongs to
			});
		},
		goodGroup: function(obj, goods) {
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyalty_content(
						this,
						'goodGroup',
						{}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
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
							named_good_collection_id: this.group.id || this.group,
							relative_weight: 1
						}
					);
				},
				save: function(callback) { 
					create_or_update.call(this, callback);
				},
				// add a good 
				group: null,
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

	// create the conversion function; each function translated the raw server
	// JSON returns to bigdoorjs representation.
	//
	// add a fromJSON function to each resource type
	var loyalty_conversion = function(jsonObj) {
		return {
			id: jsonObj.id,
			title: jsonObj.end_user_title || jsonObj.pub_title,
			description: (
				jsonObj.end_user_description || jsonObj.pub_description
			),
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

	for ( var resource in pub ) {
		pub[resource].get = _.bind(getByID, pub[resource], resource);
	}

	return pub;
}

module.exports.publisher = publisher;
module.exports.signature = signature;
module.exports.token = token;
module.exports.time = time;

