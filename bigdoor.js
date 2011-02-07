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
	_ = require('underscore');

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
	return uuid().replace(/-/g, '');
}

var time = function() {
	return Date.now() / 1000;
}

var publisher = function(app_id, app_secret) {

	// an object which maps resource names to URLs
	// examples:
	// var a = attibute()
	// var url = urls.attribute.get(a);
	// var l = level()
	// url = urls.level.get(l);
	var urls = (function() {
		var that = {};
		var _get_url = function(url, obj) {
			if ( obj.id ) {
				return url.end_point + '/' + obj.id;
			} else {
				return url.end_point
			}
		}

		that.extend({
			attribute: {
				end_point: 'attribute',
				get: _get_url
			},
			currency: {
				end_point: 'currency',
				get: _get_url
			},
			url: {
				end_point: 'url',
				get: _get_url,
			},
			award_group: {
				end_point: 'named_award_collection',
				get: _get_url
			},
			award: {
				end_point: 'named_award',
				get: function(url, obj) {
					return that.award_group.get(obj.award_group) +
						'/' + _get_url(url, obj);
				}
			},
			good_group: {
				end_point: 'named_good_collection',
				get: _get_url
			},
			good: {
				end_point: 'named_good',
				get: _get_url
			},
			level_group: {
				end_point: 'named_level_collection',
				get: _get_url
			},
			level: {
				end_point: 'named_level',
				get: function(url, obj) {
					return that.level_group.get(obj.level_group) + 
						'/' + _get_url(url, obj);
				}
			},
			end_user: {
				end_point: 'end_user',
				get: _get_url
			},
			transaction: {
				end_point: 'named_transaction_group',
				get: _get_url
			},
			subtransaction: {
				end_point: 'named_transaction',
				get: function(url, obj) {
					return that.transaction.get(obj.transaction) + 
						'/' + _get_url(url, obj);
				}
			},
		});
	})();

	var urlCollection = function(urls) {
	}

	var levelCollection = function(levels) {
	}

	// a collection of awards to be used internally by awardGroup
	var awardCollection = function(awards) {
		// don't yet know this part
	}

	var goodCollection = function(goods) {
		// don't yet know
	}


	var secure_url = function(url, query, body) {
			var sign = signature(app_secret, url, query, body);
			query['sig'] = sign;
			var qs = querystring.stringify(query || {});
			if ( qs.length ) {
				url = url+'?'+qs;
			}
			return url;
	}

	var secure_server = {
		action: function(method, url, query, body, callback) {
			query = query || {};
			query['time'] = time();
			body = body || {};
			body['token'] = token();
			body['time'] = time();

			url = secure_url(url, query, body);
			request(
				{
					method: method,
					url:url,
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
					url:url
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

	server = {
		complete_url: function(url) {
			if( !url.match(/^\//) ) { 
				url = '/'+url; 
			}
			return 'http://api.bigdoor.com/api/publisher/'+app_id+url
		},
		get: function(url, query, callback) {
			secure_server.get(complete_url(url), query, callback);
		},
		put: function(url, query, body, callback) {
			secure_server.put(complete_url(url), query, body, callback);
		},
		post: function(url, query, body, callback) {
			secure_server.post(complete_url(url), query, body, callback);
		},
		delete: function(url, query, body, callback) {
			secure_server.delete(complete_url(url), query, body, callback);
		},
		get_http_methods: function(methods) {
			// example:
			// get_http_methods('get', 'post');
			// get_http_methods('get');
			// get_http_methods(['get', 'post', 'put']);'
			// get_http_methods(); // returns all methods
			var result = {}
			if ( !methods ) {
				methods = ['get', 'put', 'post', 'delete'];
			}
			if ( !_.isArray(methods) ) {
				methods = _.toArray(arguments);
			}
			methods = _.map(methods, function(x) {
				if ( this[x.toLowerCase()] ) {
					return x.toLowerCase();
				}
			});

			for ( var i = 0; i < methods.length; i++ ) {
				results[methods[i]] = function(context, name, fun) {
					if ( name == 'get' ) {
						return function(obj, callback) {
							var request_content = obj.request_content();
							context.get(
								request_content.url,
								request_content.query,
								callback
							);
						}
					} else {
						return function(obj, callback) {
							var request_content = obj.request_content();
							context.get(
								request_content.url,
								request_content.query,
								request_content.body,
								callback
							);
						}
					}
				}(this, methods[i], this[methods[i]]);
			}

			return results;
		}
	}

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

	var pub = {
		// A user object 
		end_user: function(obj) {
			return {
				// obj can either be object or string (used as end_user_login)
				end_user_login: obj.end_user_login || obj,
				best_guess_name: obj.best_guess_name ||'' ,
				best_guess_profile_image: obj.best_guess_profile_image || '',
				guid: guid()
			}
		},
		// Give an object the basic fields used by BigDoor objects.
		// These inlcude: title and description. 
		// If the argument object includes an id and created 
		// time those will also be added.
		loyalty: function(obj) {
			var that = {
				id: obj.id, // may be undefined (this is fine and desired)
				title: obj.title,
				description: obj.description,
				created: obj.created,
				modified: obj.modified,
				loyalty_body_content: function() {
					return {
						pub_title: that.title,
						pub_description: that.description,
						end_user_title: that.title,
						end_user_description: that.description
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
				currency: obj.currency,
				default_amount: obj.default_amount || 1.00,
				is_source: obj.is_source || true,
				transaction: null,
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
				non_secure: obj.allow_unsigned_transactions || false,
				primary_subtransaction: primarySubtransaction
			};
			var subtransactions = [primarySubtransaciton]
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
				end_user_cap: -1,
				end_user_cap_interval: -1,
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

			var _server = server.get_http_methods();
			return _.extend(this.loyalty(obj), {
				request_content: function() {
					return loyatly_content(
						this,
						'attribute', 
						{
							friendly_id: this.friendly_id
						}
					);
				},
				friendly_id: obj.friendly_id,
				save: function() {
					if ( this.id ) {
						_server.post(this, callback);
					} else {
						_server.put(this, callback);
					}
				}
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
			var _server = server.get_http_methods();
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
				},
				save: function(callback) {
					if ( this.id ) {
						_server.create(this, callback);
					} else {
						_server.update(this, callback);
					}
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
				},
				save: function() {
					throw 'not implemented'
					//save the currency to the server (create or update)
					if ( this.id ) {
						return
					} else {
						return
					}
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
				threshold: obj.threshold,
				currency: function() {
					return group.currency;
				},
				group: null
			});
		},
		awardGroup: function(obj, awards) {
			var private = {
				non_secure: (obj.non_secure || false)?1:0
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
				awards: awardCollection(awards),
				unsecure: function() {
					private.non_secure = 1;
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
				grant: function() {
					// give to a user
				},
				group: null, // the award group this belongs to
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

	return pub;
}

module.exports.publisher = publisher;
module.exports.signature = signature;
module.exports.token = token;
module.exports.time = time;

