if ( typeof exports != 'undefined' ) {
	var _ = require('underscore');
}

/**
 * urls provides a mapping from the resource object names to the 
 * corresponding BigDoor API endpoint.
 *
 * examples:
 * var a = attibute()
 * var url = urls.attribute.get();
 * var url = urls.attribute.get({id:1}); // == 'attribute/1'
 * var l = level() // == 'level'
 * url = urls.level.get({id:42, group:{id:12}}); 
 *     //== 'named_level_collection/12/named_level/42'
 **/

var bigdoor = bigdoor || {};
bigdoor.urls = (function() {
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
		awardGroup: {
			end_point: 'named_award_collection',
			get: _get_url
		},
		award: {
			end_point: 'named_award',
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.group && obj.group.id ) { 
					return that.awardGroup.get(obj.group) +
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
			}
		},
		goodGroup: {
			end_point: 'named_good_collection',
			get: _get_url
		},
		good: {
			end_point: 'named_good',
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.group && obj.group.id ) {
					return that.goodGroup.get(obj.group) + 
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
			}
		},
		levelGroup: {
			end_point: 'named_level_collection',
			get: _get_url
		},
		level: {
			end_point: 'named_level',
			get: function(obj) {
				var _get = _.bind(_get_url, this);
				if ( obj && obj.group && obj.group.id ) {
					return that.levelGroup.get(obj.group) + 
					'/' + _get(obj);
				} else {
					return _get(obj);
				}
			}
		},
		user: {
			end_point: 'end_user',
			get: function(obj) {
				if ( obj.login ) {
					return this.end_point + '/' + obj.login;
				} else {
					return this.end_point + '/';
				}
			}
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

	if ( typeof exports != 'undefined' ) {
		module.exports = that;
	}

	return that;
})();


