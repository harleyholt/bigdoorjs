var _ = require('underscore');

// an object which maps resource names to URLs
// examples:
// var a = attibute() // == 'attribute'
// var url = urls.attribute.get({id:1}); // == 'attribute/1'
// var l = level() // == 'level'
// url = urls.level.get({id:42, group:{id:12}});
//     // == 'named_level_collection/12/named_level/42'
var urls = (function() {
	var that = {};
	var _get_url = function(obj) {
		if ( obj && obj.id ) {
			return this.end_point + '/' + obj.id;
		} else {
			return this.end_point;
		}
	}

	_.extend(that, {
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
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.group && obj.group.id ) { 
					return that.award_group.get(obj.group) +
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
			}
		},
		good_group: {
			end_point: 'named_good_collection',
			get: _get_url
		},
		good: {
			end_point: 'named_good',
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.group && obj.group.id ) {
					return that.good_group.get(obj.group) + 
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
			}
		},
		level_group: {
			end_point: 'named_level_collection',
			get: _get_url
		},
		level: {
			end_point: 'named_level',
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.group && obj.group.id ) {
					return that.level_group.get(obj.group) + 
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
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
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.transaction && obj.transaction.id ) {
					return that.transaction.get(obj.transaction) + 
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
			}
		}
	});

	for ( var url in that ) {
		that[url].get = _.bind(that[url].get, that[url]);
	}

	return that;
})();

module.exports = urls;
