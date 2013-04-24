var net = require('net');
var util = require('util');
var events = require('events');
var proto = require('./protocol');

module.exports = Device;

function Device(conf) {
	events.EventEmitter.call(this, conf);
	var self = this;

	this.backlog = [];

	this.device_id = conf.device_id;
	this.device_ip = conf.device_ip;

	this.control_sock = net.createConnection(65001, this.device_ip,
	    function () {
		self.emit('connected');
	});

	this.request_encoder = new proto.RequestEncoder();
	this.reply_decoder = new proto.ReplyDecoder();

	this.request_encoder.pipe(this.control_sock);
	this.control_sock.pipe(this.reply_decoder);

	this.reply_decoder.on('reply', function onReply(msg) {
		var buf, item, cb, err;
		if (msg.error_message)
			err = new Error(msg.error_message);

		if (self.backlog.length > 0) {
			item = self.backlog.shift();
			cb = item.callback;
			clearTimeout(item.timeout);
			cb(err, {name: msg.getset_name,
			    value: msg.getset_value});
		} else {
			console.log('unexpected reply');
		}
	});

	this.on('CTS', function () {
		if (self.backlog.length > 0) {
			self.request_encoder.send(self.backlog[0].request);
		} else {
			console.log('CTS with empty backlog');
		}
	});
}

util.inherits(Device, events.EventEmitter);

Device.prototype.get = function (name, cb) {
	get_set.call(this, name, cb);
}

Device.prototype.set = function (name, value, cb) {
	get_set.call(this, name, value, cb);
}

function get_set(name, value, cb) {
	var which = 'set';
	if ((arguments.length == 2) && (typeof (value) == 'function')) {
		cb = value;
		value = null;
		which = 'get';
	}

	var msg = {
		type: proto.types.getset_req,
		getset_name: name
	};

	if (which == 'set')
		msg.getset_value = value;


	this._request(msg, cb);
}

Device.prototype._request = function (msg, cb) {
	var self = this;
	var to = setTimeout(function () {
		var unanswered = self.backlog.shift();
		var cb = unanswered.callback;
		var err = new Error('request timeout');
		cb(err);
		if (self.backlog.length > 0)
			self.emit('CTS');
	}, 2500);

	this.backlog.push({request: msg, callback: cb, timeout: to});

	if (this.backlog.length === 1)
		this.emit('CTS');
}
