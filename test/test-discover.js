var hdhr = require('../index.js');

exports['discover all devices'] = function (test) {
	hdhr.discover(function (err, results) {
		test.ifError(err);
		test.ok(Array.isArray(results));
		test.ok(results.length >= 1, 'found at least one device');
		test.done();
	});
};

exports['discover one particular device'] = function (test) {
	if (process.env.MY_HDHR) {
		hdhr.discover(process.env.MY_HDHR,
		    function (err, results) {
			test.ifError(err);
			test.ok(results.length == 1);
			test.equal(results[0].device_id, process.env.MY_HDHR);
			test.done();
		});
	} else {
		throw new Error(
		    'set env var MY_HDHR to valid (online) device_id');
	}
};
