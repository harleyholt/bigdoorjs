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
	crypto = require('crypto');

var publisher = function(app_id, app_secret) {

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

	var signature(url, query, body) {
		query = query || {};
		body = body || {}

		var stringize = function(obj) {
			var temp = ''
			for ( var k in _.sortBy(_.keys(obj), function(x) { return x; }) ) {
				temp += (k + obj[k]);
			}
		}

		var key = url + '?' + stringize(query) + stringize(body) + app_secret;
		var hash = crypto.createHash('sha256');
		hash.update(key);
		return hash.digest(encoding='hex');
	}

	var token() = {
		return uuid().replace(/-/g, '');
	}

	var secure_url(url, query, body) {
			var sign = signature(url, query, body);
			query['sig'] = sign;
			var qs = querystring.stringify(query || {});
			if ( qs.length ) {
				url = url+'?'+qs;
			}
			return url;
	}

	var secure_server = {
		action: function(method, url, query, body, callback) {
			body['token'] = token();
			url = secure_url(url, query, body);
			request(
				{
					method: method,
					url:url,
					body: querystring.stringify(body || {})
				},
				callback
			);
		}
		get: function(url, query, callback) {
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
		get_requests: function(methods) {
			var result = {}
			for ( var i = 0; i < methods.length; i++ ) {
				result
			}
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
			return {
				id: obj.id, // may be undefined (this is fine and desired)
				title: obj.title,
				description: obj.description,
				created: obj.created,
				modified: obj.modified
			}
		},
		// not intended for external use right now
		subtransaction: function(obj) {
			return _.extend(this.loyalty(obj), {
				currency: obj.currency,
				default_amount: obj.default_amount || 1.00,
				is_source: obj.is_source || true,
				variable_amount_allowed: false,
			});
		},
		// A Transaction is a set of related commands (subtransactions) to be
		// run against an end_user. These commands include debiting a user's 
		// currency, granting more currency to a user, and giving the
		// user a good
		transaction: function(obj, primarySubtransaction) {
			var _ = {
				non_secure: obj.allow_unsigned_transactions || false,
				primary_subtransaction: primarySubtransaction
			};
			var subtransactions = [primarySubtransaciton]
			if ( arguments.length > 2 ) {
				this.subtransactions.concat(_.rest(_.toArray(arguments),2));
			}
			return _.extend(this.loyalty(obj), {
				end_user_cap: -1,
				end_user_cap_interval: -1,
				subtransactions: subtransactionCollection(subtransactions),
				unsecure: function() {
					_.non_secure = true;
					return this;
				}
			});
		},
		// Attribute allows arbitrary properties to be attached to
		// BigDoor objects
		attribute: function(obj) {
			return _.extend(this.loyalty(obj), {
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
			var request_content = function(obj) {
				return {
					url: 'url',
					body: {
						is_media_url: true,
						is_for_end_user_ui: true,
						url: obj.url
					}
				}
			}

			var create = function(obj, callback) {
				server.put(request_content(obj), callback);
			}

			var update = function(obj, callback) {
				server.post(request_content(obj), callback);
			}

			return _.extend(this.loyalty(obj), {
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
						create(this, callback);
					} else {
						update(this, callback);
					}
				}
			});
		},
		currency: function(obj) {
			return _.extend(this.loyalty(obj), {
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
					//save the currency to the server (create or update)
					if ( this.id ) {
						this.
					} else {
					}
				}
			});
		},
		levelGroup: function(obj, levels) {
			return _.extend(this.loyalty(obj), {
				currency: obj.currency,
				levels: levelCollection(levels)
			});
		},
		level: function(obj) {
			return _.extend(this.loyalty(obj), {
				currency: function() {
					return group.currency;
				},
				group: null
			});
		},
		awardGroup: function(obj, awards) {
			return _.extend(this.loyalty(obj), {
				awards: awardCollection(awards)
			});
		},
		award: function(obj) {
			var _ = {
				non_secure: obj.allow_unsigned_transactions || false
			};
			return _.extend(this.loyalty(obj), {
				grant: function() {
					// give to a user
				},
				group: null, // the award group this belongs to
				unsecure: function() {
					_.non_secure = true;
					return this;
				}
			});
		},
		goodGroup: function(obj, goods) {
			return _.extend(this.loyalty(obj), {
				goods: goodCollection(goods)
			});
		},
		good: function(obj) {
			return _.extend(this.loyalty(obj), {
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

	// ADVANCED
	//
	// Change a transaction (cheque, purchase, debit) to allow a variable
	// amount
	//
	pub.transaction.give_ratio = function(obj, percent) {
		obj.group_ratio = percent;
		obj.variable_amount_allowed = true;
	}

	return pub;
}

module.exports = publisher;
