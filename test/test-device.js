var nodeunit = require('nodeunit');
var hdhr = require('../index.js');
var util = require('util');

exports['check for $MY_HDHR'] = function (test) {
	test.ok(process.env.MY_HDHR, 'env var MY_HDHR should be set to ' +
	    'device_id of local online device');
	test.done();
};

exports['create device object'] = function (test) {
	hdhr.discover(process.env.MY_HDHR,
	    function (err, found) {
		test.ifError(err);

		if (found[0]) {
			var device = hdhr.create(found[0]);
			device.get('/sys/model', function (err, res) {
				test.ifError(err);
				test.equal(res.value, 'hdhomerun3_atsc');
				test.done();
				device.control_sock.destroy();
			});
		} else {
			throw new Error('no device found');
		}
	});
};
