var Readable = require('stream').Readable;
var util = require('util');
var proto = require('./functions.js');

function RequestEncoder() {
	Readable.call(this);
	this._outbox = [];
};
util.inherits(RequestEncoder, Readable);

RequestEncoder.prototype.send = function (msg) {
	this._outbox.push(proto.encode_msg(msg));
	this.read(0);
};

RequestEncoder.prototype._read = function (n) {
	if (this._outbox.length == 0) {
		this.push('');
	}

	while (this._outbox.length > 0) {
		var chunk = this._outbox.shift();
		if (!this.push(chunk))
			break;
	}
};

module.exports = {
	RequestEncoder: RequestEncoder
}
