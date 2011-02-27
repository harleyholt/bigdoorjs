var _ = require('underscore'),
	querystring = require('querystring'),
	uuid = require('node-uuid'),
	request = require('request'),
	crypto = require('crypto');

var signature = function(secret, url, query, body) {
	query = query || {};
	body = body || {};

	var stringize = function(obj) {
		var temp = _.reduce(
			_.sortBy(_.keys(obj), function(x) { return x; }),
			function(memo, v) {
				if ( obj[v] === undefined || obj[v] === null ) {
					return memo
				} else {
					return memo + (v + obj[v].toString());
				}
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
module.exports.signature = signature;

var token = function() {
	return uuid().replace(/-/g, '').toLowerCase();
}
module.exports.token = token;

var guid = function() {
	return uuid().toLowerCase();
}
module.exports.guid = guid;

var time = function() {
	return Date.now() / 1000;
}
module.exports.time = time;

// very lowest level sever--takes the arguments and does a request
module.exports.http_server = function() {
	return {
		complete_url: function(url) {
			return 'http://' + url;
		},
		action: function(method, url, query, body, callback) {
			var qs = querystring.stringify(query || {});
			if ( qs.length ) {
				url = url + '?' + qs;
			}
			var body = querystring.stringify(body || {});
			request(
				{
					method: method,
					url: this.complete_url(url),
					body: body
				},
				callback
			);
		},
		get: function(url, query, callback) {
			var qs = querystring.stringify(query || {});
			if ( qs.length ) {
				url = url + '?' + qs;
			}
			request(
				{
					method: 'GET',
					url: this.complete_url(url)
				},
				callback
			);
		},
		post: function(url, query, body, callback) {
			this.action('POST', url, query, body, callback);
		},
		put: function(url, query, body, callback) {
			this.action('PUT', url, query, body, callback);
		},
		delete: function(url, query, body, callback) {
			this.action('DELETE', url, query, body, callback);
		}
	}
}

// adds all necessary processing to a basic request in order to 
// meet the security requirements of secure requests and then
// actually preforms the request
module.exports.secure_server = function(server, app_secret, domain) {
	if ( !domain ) {
		domain = 'local.publisher.bigdoor.com';
	}
	return {
		complete_url: function(url) {
			if (!url.match(/^\//)) {
				url = '/'+url;
			}
			return domain + url;
		},
		action: function(method, url, query, body, callback) {
			var t = time();
			query = query || {};
			query['time'] = t;
			body = body || {};
			body['token'] = token();
			body['time'] = t;

			query['sig'] = signature(app_secret, url, query, body);

			server[method](this.complete_url(url), query, body, callback);
		},
		get: function(url, query, callback) {
			query = query || {};
			query['time'] = time();
			query['sig'] = signature(app_secret, url, query, {});
			server.get(this.complete_url(url), query, callback);
		},
		put: function(url, query, body, callback) {
			this.action('put', url, query, body, callback);
		},
		post: function(url, query, body, callback) {
			this.action('post', url, query, body, callback);
		},
		delete: function(url, query, body, callback) {
			this.action('delete', url, query, body, callback);
		}
	}
}

// allows us to proxy all requests so that posts can be done with
// gets (to support eventual client side implementation)
module.exports.proxied_server = function(server, domain) {
	if ( !domain ) {
		domain = 'local.publisher.bigdoor.com';
	}
	return {
		complete_url: function(url) { 
			if (!url.match(/^\//)) {
				url = '/'+url;
			}
			return domain + url;
		},
		make_query: function(method, url, query, body) {
			body = body || {}
			for ( var v in body ) {
				query['$' + v] = body[v];
			}
			query['method'] = method;
			query['non_secure'] = 1;
			return query;
		},
		get: function(url, query, callback) {
			server.get(url, make_query('get', url, query), callback);
		},
		post: function(url, query, body, callback) {
			server.get(url, make_query('post', url, query, body), callback);
		},
		put: function(url, query, body, callback) {
			server.get(url, make_query('put', url, query, body), callback);
		},
		delete: function(url, query, body, callback) {
			server.get(url, make_query('delete', url, query, body), callback);
		}
	}
}

// provides completion of the url to include the api root with
// the app id and changes the BigDoor response to an error
// if the response code does not match the expected
module.exports.api_server = function(server, app_id, proxy) {
	return {
		complete_url: function(url) {
			if( !url.match(/^\//) ) { 
				url = '/'+url; 
			}
			if ( proxy ) {
				return '/api/publisher/'+app_id+'/proxy'+url;
			} else {
				return '/api/publisher/'+app_id+url;
			}
		},
		handle_response: function(callback, error, response, content) {
			if ( error ) {
				// error with request, callback with that
				callback(error, response, content);
			} else {
				content = JSON.parse(content);
				if ( typeof content == 'Number' ) {
					if ( 1 < content ) {
						// there was an error so callback with error
						callback(
							{ BDMResponseCode: content },
							response,
							null
						);
					} else {
						// no error but the content is just a number 
						callback(error, response, content);
					}
				} else {
					// no error and we have data for content
					callback(error, response, content);
				}
			}
		},
		get: function(url, query, callback) {
			server.get(
				this.complete_url(url),
				query,
				_.bind(this.handle_response, this, callback)
			);
		},
		put: function(url, query, body, callback) {
			server.put(
				this.complete_url(url),
				query,
				body,
				_.bind(this.handle_response, this, callback)
			);
		},
		post: function(url, query, body, callback) {
			server.post(
				this.complete_url(url),
				query,
				body,
				_.bind(this.handle_response, this, callback)
			);
		},
		delete: function(url, query, body, callback) {
			server.delete(
				this.complete_url(url),
				query,
				body,
				_.bind(this.handle_response, this, callback)
			);
		}
	}
}

// returns HTTP methods which accept resource objects instead of
// the raw query, body, etc.
module.exports.get_http_methods = function(server, methods) {
	// example:
	// get_http_methods('get', 'post');
	// get_http_methods('get');
	// get_http_methods(['get', 'post', 'put']);
	// get_http_methods(); // returns all methods
	var results = {}
	if ( !methods ) {
		methods = ['get', 'put', 'post', 'delete'];
	}
	if ( !_.isArray(methods) ) {
		methods = _.rest(_.toArray(arguments));
	}

	// get a list of method names to return
	// should be something like ['get', 'put', 'post', 'delete']
	methods = _.map(
		methods, 
		function(x) {
			if ( server[x.toLowerCase()] ) {
				return x.toLowerCase();
			}
		}
	);

	for ( var i = 0; i < methods.length; i++ ) {
		results[methods[i]] = function(context, name, fun) {
			if ( name == 'get' ) {
				return function(obj, callback) {
					var request_content = obj.request_content();
					context.get(
						request_content.url,
						request_content.query,
						function(error, response, body) {
							callback(error, body);
						}
					);
				}
			} else {
				return function(obj, callback) {
					var request_content = obj.request_content();
					context[name](
						request_content.url,
						request_content.query,
						request_content.body,
						function(error, response, body) {
							callback(error, body);
						}
					);
				}
			}
		}(server, methods[i], server[methods[i]]);
	}
	return results;
}

