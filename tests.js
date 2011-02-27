var vows = require('vows'),
	assert = require('assert'),
	bigdoor = require('./bigdoor'),
	urls = require('./urls'),
	testData = require('./test/data').data,
	servers = require('./servers'),
	_ = require('underscore');

var publisher = bigdoor.publisher;
var signature = servers.signature;
var api_server = servers.api_server;
var get_http_methods = servers.get_http_methods;

vows.describe('Currency Resource Object').addBatch({
	'the results of currency.cheque': {
		topic: function() {
			return pub.currency.fromJSON(testData.currency).cheque(20);
		},
		'has': {
			'all the properties of a subtransaction': function(topic){
				assert.isFunction(topic.save);
				assert.isFunction(topic.request_content);
			}, 
			'a default amount of': function(topic){
				assert.equal(topic.default_amount, 20);
			},
			'the is_source variable set to true': function(topic){
				assert.isTrue(topic.is_source);
			},
			'the currency used to create it': function(topic){
				assert.equal(topic.currency.id, testData.currency.id);
			},
			'the instant transaction property: to': function(topic){
				assert.isFunction(topic.to);
			}
		}
	}
}).run()

// pulled from example at http://publisher.bigdoor.com/docs/signature
vows.describe('Secure Request Signing').addBatch({
	'the signature of the post request': {
		topic: function() {
			return signature(
				'601d2664219e4886a059eeb251baad46',
				'/api/publisher/0deee7386916481199b5cbc16e4800b0/currency',
				{
					time:1276219487.56,
					example_key:'value'
				},
				{
					token:'41a45593cc8a40d58486c7a61b63d83d',
					time:1276219487.56,
					pub_title: 'Experience',
					currency_type_id:2
				}
			)
		},
		'is equal to': function(topic) {
			assert.equal(topic, 'c39189f1bcf6ef58125a33294fb21d98e740ef1dcc1a1986a95ab807ff2d4082');
		}
	}
}).run();

var test_server = function() {
	var temp = {
		asserts: { },
		returns: { },
		perform_get: function(url, query, callback) {
			if ( this.asserts.get ) {
				this.asserts.get(url, query, callback);
			}
			if ( this.returns.get ) {
				callback(
					this.returns.get.error,
					this.returns.get.response,
					this.returns.get.content
				);
			}
		},
		perform_action: function(method, url, query, body, callback) {
			if ( this.asserts[method] ) {
				this.asserts[method](url, query, body, callback);
			}
			if ( this.returns[method] ) {
				callback(
					this.returns[method].error,
					this.returns[method].response,
					this.returns[method].content
				);
			}
		},
		get: function(url, query, callback) {
			this.perform_get(url, query, callback);
		},
		post: function(url, query, body, callback) {
			this.perform_action('post', url, query, body, callback);
		},
		put: function(url, query, body, callback) {
			this.perform_action('put', url, query, body, callback);
		},
		delete: function(url, query, body, callback) {
			this.perform_action('delete', url, query, body, callback);
		},
		assert_on: function(method, asserts) {
			this.asserts[method] = asserts;
		},
		return_on: function(method, results) {
			this.returns[method] = {
				error: results.error,
				response: results.response,
				content: results.content
			}
		}
	}
	//_.bindAll(temp, temp);
	return temp;
}

// a resource object
var test_resource_obj = {
	id:10,
	friendly_id: 'testing',
	title: 'testing',
	description: 'testing',
	request_content: function() {
		return {
			url: '/resource/'+this.id,
			query: {},
			body: {
				friendly_id: this.friendly_id,
				pub_title: this.title,
				end_user_title: this.title,
				end_user_description: this.description
			}
		}
	}
} 

var test_app_key = '522adae4d28b49999bb42e0a21a13889';

vows.describe('Test the get_http_methods Helper').addBatch({
	'the get_http_methods function': function() {
		return get_http_methods
	},
	'returns the correct functions': function(topic) {
		var test = topic(test_server(), 'get', 'put', 'post', 'delete');
		assert.include(test, 'get');
		assert.include(test, 'post');
		assert.include(test, 'put');
		assert.include(test, 'delete');
		test = topic(test_server(), 'get');
		assert.include(test, 'get');
		assert.isUndefined(test['post']);
		test = topic(test_server());
		assert.include(test, 'get');
		assert.include(test, 'post');
		assert.include(test, 'put');
		assert.include(test, 'delete');
		test = topic(test_server(), ['get', 'post']);
		assert.include(test, 'get');
		assert.include(test, 'post');
		assert.isUndefined(test['put']);
	}
});

vows.describe('Test the Bigdoor API Server').addBatch({
	'the api server returns an attribute through the callback': {
		topic: function() {
			var mock_server = test_server();
			mock_server.assert_on('get', function(url, query, callback) {
				assert.equal(
					url,
					'/api/publisher/' + test_app_key + '/attribute/' +
						testData.attribute.id
				);
				assert.isObject(query);
				assert.isEmpty(query);
			});
			mock_server.return_on(
				'get',
				{
					content: JSON.stringify([testData.attribute, {}])
				}
			);
			var under_test = api_server(mock_server, test_app_key);
			under_test.get('/attribute/'+testData.attribute.id, {}, this.callback);
		},
		'which is an object': function(error, response, content){
			assert.isArray(content);
		},
		'and has an array of length 2': function(error, response, content){
			assert.isTrue(_.isArray(content));
			assert.equal(content.length, 2);
		},
		'did not experience an error': function(error, response, content){
			assert.isNull(error);
		},
		'and contains the correct data': function(error, response, content){
			var attribute = content[0];
			assert.deepEqual(attribute, testData.attribute);
		}
	}
}).run();

vows.describe('Test the Object Server methods').addBatch({
	'the functions returned by get_http_method': {
		topic: function() {
			var mock_server = test_server();
			mock_server.assert_on('post', function(url, query, body, callback) {
				assert.equal(
					url,
					'/resource/10'
				);
				assert.isObject(query);
				assert.isEmpty(query);
				assert.isObject(body);
				assert.equal(body.end_user_title, test_resource_obj.title);
				assert.equal(body.pub_title, test_resource_obj.title);
				assert.equal(
					body.end_user_description,
					test_resource_obj.description
				);
				assert.isUndefined(body.pub_description);
				assert.equal(body.friendly_id, test_resource_obj.friendly_id);
			});
			mock_server.return_on('post', {content: 0});
			return get_http_methods(mock_server, 'post');
		},
		'include a post function': {
			topic: function(methods) {
				assert.isFunction(methods.post)
				return methods.post
			},
			'that takes a resource object and calls the given callback': {
				topic: function(post) {
					post(test_resource_obj, this.callback);
				},
				'which returns the server response': function(error, body){
					assert.equal(body, 0);
				}
			}
		}
	}
}).run();

vows.describe('Test the Urls').addBatch({
	'the urls function': {
		topic: function() {
			return urls
		},
		'returns': {
			'the correct url for the attribute end point': function(topic) {
				assert.equal(
					topic.attribute.get(),
					'attribute'
				);
				assert.equal(
					topic.attribute.get({id:1}),
					'attribute/1'
				);
			},
			'the correct url for the level end point': function(topic) {
				assert.equal(
					topic.level.get(),
					'named_level'
				);
				assert.equal(
					topic.level.get({id: 12}),
					'named_level/12'
				);
				assert.equal(
					topic.level.get({id: 12, group: {id: 13}}),
					'named_level_collection/13/named_level/12'
				);
			},
			'the url for the good end point': function(topic) {
				assert.equal(
					topic.good.get(),
					'named_good'
				);
				assert.equal(
					topic.good.get({id: 12}),
					'named_good/12'
				);
				assert.equal(
					topic.good.get({id: 12, group: {id: 14}}),
					'named_good_collection/14/named_good/12'
				);
			},
			'the url for the award end point': function(topic) {
				assert.equal(
					topic.award.get(),
					'named_award'
				);
				assert.equal(
					topic.award.get({id: 12}),
					'named_award/12'
				);
				assert.equal(
					topic.award.get({id: 12, group: {id: 13}}),
					'named_award_collection/13/named_award/12'
				);
			},
			'the url for the transaction end point': function(topic) {
				assert.equal(
					topic.subtransaction.get(),
					'named_transaction'
				);
				assert.equal(
					topic.subtransaction.get({id: 12}),
					'named_transaction/12'
				);
				assert.equal(
					topic.subtransaction.get({id: 12, transaction: {id: 13}}),
					'named_transaction_group/13/named_transaction/12'
				);
			}
		}
	}
}).run();

var pub = publisher('522adae4d28b49999bb42e0a21a13889', '4c811b8bd9cd42a4ba163bae70eb7367');

vows.describe('Test That our Tests Can Run').addBatch({
	'the imported data module has the required data': {
		topic: function() {
			return testData;
		},
		'has': {
			'a url': function(topic) {
				assert.isObject(topic.url);
			},
			'an attribute': function(topic) {
				assert.isObject(topic.attribute);
			}
		}
	}
}).run();

var check_default_properties = function(topic, expected) {
	assert.equal(topic.title, expected.end_user_title || expected.pub_title);
	assert.equal(topic.description, expected.end_user_description || expected.pub_description);
}

vows.describe('Converting From JSON').addBatch({
	'the result of calling url.fromJSON on the raw URL JSON': {
		topic: function() {
			return pub.url.fromJSON(testData.url);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(topic.id, testData.url.id);
			},
			'a title and description of': function(topic) {
				check_default_properties(topic, testData.url);
			},
			'a url of': function(topic) {
				assert.equal(topic.url, testData.url.url);
			}
		}
	},
	'the result of calling attribute.fromJSON on the raw Attribute JSON': {
		topic: function() {
			return pub.attribute.fromJSON(testData.attribute);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(topic.id, testData.attribute.id);
			},
			'a title and description of': function(topic) {
				check_default_properties(topic, testData.attribute);
			},
			'a friendly_id of': function(topic) {
				assert.equal(topic.friendly_id, testData.attribute.friendly_id);
			}
		}
	},
	'the result of calling currency.fromJSON on the raw Currency JSON': {
		topic: function() {
			return pub.currency.fromJSON(testData.currency);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(topic.id, testData.currency.id);
			},
			'a title and description of': function(topic) {
				check_default_properties(topic, testData.currency);
			},
			'an exchange_rate of': function(topic) {
				assert.equal(
					topic.exchange_rate,
					testData.currency.exchange_rate
				);
			},
			'an type of': function(topic) {
				assert.equal(
					topic.type,
					testData.currency.currency_type_id
				);
			}
		}
	},
	'the result of calling award.fromJSON on the raw Award JSON': {
		topic: function() {
			return pub.award.fromJSON(testData.named_award);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(
					topic.id,
					testData.named_award.id
				);
			},
			'a title and description of': function(topic) {
				check_default_properties(topic, testData.named_award);
			},
			'an awardGroup id of': function(topic) {
				assert.equal(
					topic.group,
					testData.named_award_collection.id
				);
			}
		}
	},
	'the result of awardGroup.fromJSON on the NamedAwardCollection JSON': {
		topic: function() {
			return pub.awardGroup.fromJSON(
				testData.named_award_collection
			);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(
					topic.id,
					testData.named_award_collection.id
				);
			},
			'a title and description of': function(topic) {
				check_default_properties(topic, testData.named_award_collection);
			},
			'a collection of awards containing': function(topic) {
				assert.isArray(topic.awards);
				assert.equal(topic.awards.length, 1);
				beastmaster = topic.awards[0];
				assert.equal(beastmaster.title, 'BeastMaster');
				assert.equal(beastmaster.group.id, topic.id);
			}
		}
	},
	'the result of level.fromJSON on the NamedLevel JSON': {
		topic: function() {
			return pub.level.fromJSON(testData.named_level);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(
					topic.id,
					testData.named_level.id
				);
			},
			'a title and description of': function(topic) {
				check_default_properties(topic, testData.named_level);
			},
			'a group id of': function(topic) {
				assert.equal(
					topic.group,
					testData.named_level_collection.id
				);
			}
		}
	},
	'the result of levelGroup.fromJSON on the NamedLevelCollection JSON': {
		topic: function() {
			return pub.levelGroup.fromJSON(testData.named_level_collection);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(
					topic.id,
					testData.named_level_collection.id
				);
			},
			'a title and description of': function(topic) {
				check_default_properties(
					topic,
					testData.named_level_collection);
			},
			'a collection of levels': function(topic) {
				assert.isArray(topic.levels);
				assert.equal(topic.levels.length, 2);
				var newbie = _.select(
					topic.levels,
					function(x) {
						return x.title == 'Newbie';
					}
				);
				assert.equal(newbie.length, 1);
				newbie = topic.levels[0];
				assert.equal(newbie.title, 'Newbie');
				assert.equal(newbie.group.id, topic.id);
				assert.equal(newbie.threshold, 10);
			}
		}
	},
	'the result of transaction.fromJSON on the NamedTransactionGroup JSON': {
		topic: function() {
			return pub.transaction.fromJSON(testData.named_transaction_group);
		},
		'has': {
			'an id of': function(topic) {
				assert.equal(
					topic.id,
					testData.named_transaction_group.id
				);
			},
			'a title and desciption of': function(topic) {
				check_default_properties(
					topic,
					testData.named_transaction_group
				);
			},
			'an end_user_cap of': function(topic) {
				assert.equal(
					topic.end_user_cap,
					testData.named_transaction_group.end_user_cap
				);
			},
			'an end_user_cap_interval of': function(topic) {
				assert.equal(
					topic.end_user_cap_interval,
					testData.named_transaction_group.end_user_cap_interval
				);
			},
			'been made unsecure': function(topic) {
				assert.isFalse(topic.is_unsecure());
			}
		}
	},
	'the result of user.fromJSON on the end_user JSON': {
		topic: function() {
			return pub.user.fromJSON(testData.end_user);
		},
		'has': {
			'a login of': function(topic) {
				assert.equal(topic.login, testData.end_user.end_user_login);
			},
			'a guid of': function(topic) {
				assert.equal(topic.guid, testData.end_user.guid);
			}
		}
	}
}).run();


