var util = require('util');
var dgram = require('dgram');

module.exports = {
	start: start,
	stop: stop
};

var sock = null;

function start(device, tuner) {
	sock = dgram.createSocket('udp4').on('listening', function () {
		var addr = device.control_sock.localAddress;
		var port = sock.address().port;
		var name = util.format('/tuner%d/target', tuner);
		var value = util.format('rtp://%s:%d', addr, port);
		device.set(name, value, function (err, res) {
			if (err) throw err;

			console.log('target set to: ' + res.value);
		});
	});
	sock.bind();
	return (sock);
}

function stop(device, tuner, cb) {
	device.set('/tuner' + tuner + '/target', 'none',
	    function (err, res) {
		sock.close();
		cb();
	});
}
