var _ = require('underscore'),
	querystring = require('querystring'),
	uuid = require('node-uuid'),
	request = require('request'),
	crypto = require('crypto');

var signature = function(secret, url, query, body) {
	query = query || {};
	body = body || {}

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

var token = function() {
	return uuid().replace(/-/g, '').toLowerCase();
}

var time = function() {
	return Date.now() / 1000;
}

// return a signed URL given a url, query, and body
var secure_url = function(app_secret, url, query, body) {
		var sign = signature(app_secret, url, query, body);
		query['sig'] = sign;
		var qs = querystring.stringify(query || {});
		if ( qs.length ) {
			url = url+'?'+qs;
		}
		return url;
}

module.exports.signature = signature;
module.exports.token = token;
module.exports.time = time;

// adds all necessary processing to a basic request in order to 
// meet the security requirements of secure requests and then
// actually preforms the request
// TODO: this should actually call a lower level server which actually does
// the request which can be used by anybody
module.exports.secure_server = function(server, app_secret) {
	return {
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

			url = secure_url(app_secret, url, query, body);
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
}

// provides completion of the url to include the api root with
// the app id
module.exports.api_server = function(server, app_id) {
	return {
		complete_url: function(url) {
			if( !url.match(/^\//) ) { 
				url = '/'+url; 
			}
			return '/api/publisher/'+app_id+url
		},
		get: function(url, query, callback) {
			server.get(this.complete_url(url), query, callback);
		},
		put: function(url, query, body, callback) {
			server.put(this.complete_url(url), query, body, callback);
		},
		post: function(url, query, body, callback) {
			server.post(this.complete_url(url), query, body, callback);
		},
		delete: function(url, query, body, callback) {
			server.delete(this.complete_url(url), query, body, callback);
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

