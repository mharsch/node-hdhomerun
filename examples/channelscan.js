var events = require('events');
var util = require('util');

module.exports = { create: create };

function create(conf) {
	return (new Scanner(conf));
}

function Scanner(conf) {
	events.EventEmitter.call(this);
	this.device = conf.device;
	this.tuner = conf.tuner || 0;
	this.first = conf.first || 2;
	this.last = conf.last || 69;
}

util.inherits(Scanner, events.EventEmitter);

Scanner.prototype.scan = function () {
	var self = this;
	var num_found = 0;
	var list = [];

	// scan channels from start to end
	for (var i = this.first; i < this.last; i++)
		list.push(i);

	function series(channel) {
		if (channel) {
			console.log('probing channel: %d', channel);
			var conf = {device: self.device, channel: channel,
			    tuner: self.tuner};

			test_channel(conf, function (err, res) {
				if (err) throw err;

				if (res) {
					self.emit('found', res);
					num_found ++;
				}

				return (series(list.shift()));
			});
		} else {
			self.emit('done', num_found);
		}

	}
	series(list.shift());
}

function poll_lock(device, tuner, cb) {
	// poll status until lock changes from 'none' to <modulation>
	var timeout, poll;

	timeout = setTimeout(function () {
		clearTimeout(poll);
		cb(null, null);
	}, 2500);

	function check_lock() {
		device.get('/tuner' + tuner + '/status',
		    function (err, res) {
			if (err) throw err;

			var lock = res.value.split(' ')[1].split('=')[1];
			if (lock !== 'none') {
				clearTimeout(timeout);
				cb(null, res.value);
			} else {
				poll = setTimeout(check_lock, 350);
			}
		});
	}
	check_lock();
}

function poll_seq(device, tuner, cb) {
	// poll status until symbol quality reaches 100
	var timeout, poll;

	timeout = setTimeout(function () {
		clearTimeout(poll);
		cb(null, null);
	}, 5000);

	function check_seq() {
		device.get('/tuner' + tuner + '/status',
		    function (err, res) {
			if (err) throw err;

			var seq = res.value.split(' ')[4].split('=')[1];
			if (seq == '100') {
				clearTimeout(timeout);
				cb(null, res.value);
			} else {
				poll = setTimeout(check_seq, 250);
			}
		});
	}
	check_seq();
}

function test_channel(conf, cb) {
	// do the poll thing and call cb with results
	var device = conf.device;
	var tuner = conf.tuner;
	var channel = conf.channel;

	var ret = {};

	device.set('/tuner' + tuner + '/channel', 'auto:' + channel,
	    function (err, res) {
		if (err) throw err;

		poll_lock(device, tuner, function (err, res) {
			if (err) throw err;

			if (res) {
				poll_seq(device, tuner, function (err, res) {
					if (err) throw err;

					if (res) {
						ret.status = res;
						device.get('/tuner' + tuner +
						    '/streaminfo',
						    function (err, res) {
							if (err) throw err;

							ret.streaminfo =
							    res.value;

							cb(null, ret);
						});
					} else {
						cb(null, null);
					}
				});
			} else {
				cb(null, null);
			}
		});
	});
}

function scan_summary(num_found) {
	console.log('found %d channels', num_found);
}
