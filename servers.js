var _ = require('underscore');

module.exports.bigdoor_server = function(server, app_id) {
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
		},
		get_http_methods: function(methods) {
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
				methods = _.toArray(arguments);
			}

			methods = _.map(methods, _.bind(function(x) {
				if ( this[x.toLowerCase()] ) {
					return x.toLowerCase();
				}
			}, this));

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
				}(this, methods[i], this[methods[i]]);
			}
			return results;
		}
	}
}

