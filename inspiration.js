// A file of functional "tests" I wrote to quickly try things that the system needs to be able to do. keeping it around as an example of use. Will eventually merge into other docs and the README in the magical future when I have time

var publisher = require('./src/bigdoor').publisher,
	servers = require('./src/servers'),
	_ = require('underscore');


var api_server = servers.api_server,
	secure_server = servers.secure_server,
	http_server = servers.http_server;

var app_key = 'FILL IN';
var app_secret = 'FILL IN';

var pub = publisher(
	app_key,
	app_secret,
	api_server(
		secure_server(
			http_server(),
			app_secret,
			'api.bigdoor.com'
		),
		app_key
	)
);


var transaction = 'FILL IN';
pub.transaction.execute(
    transaction,
    {login: 'atestuserid'}, function(error, results) {
        console.log(results);
        if ( results ) {
            console.log(results.user.currency_balances);
        }
    }
);
